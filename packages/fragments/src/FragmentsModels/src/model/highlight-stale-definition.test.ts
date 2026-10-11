import { describe, expect, test } from "vitest";
import * as THREE from "three";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Pako from "pako";
import { VirtualFragmentsModel } from "../virtual-model/virtual-fragments-model";
import { CameraUtils } from "../utils/geometry/camera-utils";
import { MeshManager } from "./mesh-manager";
import { TileRequestClass } from "./model-types";

/**
 * Regression test for the TypeError reported in
 * https://github.com/ThatOpen/engine_fragment/issues/318:
 *
 *   Cannot destructure property 'preserveOriginalMaterial' of
 *   'newDefinition' as it is undefined
 *
 * Highlight ids are reclaimed by the worker once nothing is highlighted
 * (#299). Material definitions reach the main thread at once, but tile
 * updates wait in a queue that is processed a few milliseconds per frame.
 * So a tile update emitted for the previous highlights can still be queued
 * when the definitions of the next ones arrive, and it references a
 * highlight id of the previous generation. With two highlights before and
 * one after, that id is past the end of the new list.
 *
 * The whole pipeline runs in process: the virtual model (worker side)
 * hands its requests to a real MeshManager (main side), in order.
 */

const frag = (name: string) =>
  fileURLToPath(
    new URL(`../../../../../../resources/frags/${name}`, import.meta.url),
  );

const load = async (name: string) => {
  const meshes = new MeshManager(() => {});
  const tiles = new Map<number, THREE.Mesh>();
  meshes.list.set("m", {
    tiles,
    visibleItems: new Set<number>(),
    _finishProcessing() {},
  } as any);

  const connection: any = {
    fetch: async (request: any) =>
      meshes.requests.handleRequest(meshes, request),
    fetchMeshCompute: (_modelId: string, list: any[]) =>
      meshes.requests.add(list),
  };

  const inflated = Pako.inflate(readFileSync(frag(name)));
  const data = inflated.buffer.slice(
    inflated.byteOffset,
    inflated.byteOffset + inflated.byteLength,
  );
  const model = new VirtualFragmentsModel("m", data, connection, {
    multithreading: { meshConnectionThreshold: 0, meshConnectionRate: 0 },
  });
  await model.setupData();
  model.refreshView({
    cameraFrustum: CameraUtils.containing(model.getFullBBox()),
    cameraPosition: new THREE.Vector3(0, 1, 10),
    fov: 60,
    orthogonalDimension: 0.01,
    viewSize: 10000,
    graphicThreshold: Number.MAX_SAFE_INTEGER,
    graphicQuality: 0.5,
    clippingPlanes: [],
    modelPlacement: new THREE.Matrix4(),
    meshThreshold: Number.MAX_SAFE_INTEGER,
  } as any);

  // Material definitions travel through an async fetch.
  const deliver = () => new Promise((resolve) => setTimeout(resolve, 0));

  const settle = async () => {
    for (let i = 0; i < 500; i++) model.update(performance.now());
    await deliver();
    (meshes as any).drainAll();
  };
  await settle();

  const definitions = () =>
    (meshes.materials as any)._definitions.get("m") as unknown[];

  /** Highest highlight id referenced by the tile updates still queued. */
  const queuedHighlightId = () => {
    let highest = -1;
    for (const request of meshes.requests.list) {
      if (request.tileRequestClass === TileRequestClass.FINISH) continue;
      const ids = request.tileData?.highlightIds as ArrayLike<number>;
      if (!ids) continue;
      for (let i = 0; i < ids.length; i++) highest = Math.max(highest, ids[i]);
    }
    return highest;
  };

  return { model, meshes, tiles, settle, deliver, definitions, queuedHighlightId };
};

const halves = (model: VirtualFragmentsModel) => {
  const even: number[] = [];
  const odd: number[] = [];
  for (let itemId = 0; itemId < model.itemConfig.size; itemId++) {
    (itemId % 2 ? odd : even).push(itemId);
  }
  return {
    even: model.properties.getLocalIdsFromItemIds(even),
    odd: model.properties.getLocalIdsFromItemIds(odd),
  };
};

const ghost = (opacity: number) =>
  ({
    color: new THREE.Color("#ffffff"),
    renderedFaces: 1,
    opacity,
    transparent: true,
    depthWrite: false,
  }) as any;

const selection = {
  color: new THREE.Color("#ff0000"),
  renderedFaces: 1,
  opacity: 1,
  transparent: false,
} as any;

describe("a queued tile update outlives its highlight definition (issue #318)", { timeout: 60000 }, () => {
  test("switching from two highlights to one does not throw on the updates still queued", async () => {
    const { model, meshes, tiles, settle, deliver, definitions, queuedHighlightId } =
      await load("school_str.frag");
    try {
      const own = definitions().length;
      const { even, odd } = halves(model);

      // Two highlights: a ghost on one half, a selection on the other.
      model.highlight(even, ghost(0.15));
      model.highlight(odd, selection);
      await deliver();
      expect(definitions().length).toBe(own + 2);

      // The worker starts sending the tile updates. A time in the past
      // exhausts its time budget, so each call handles the minimum number
      // of samples and the pass is left unfinished: nothing drains the
      // main thread queue, as between two frames.
      const past = performance.now() - 1e6;
      for (let i = 0; i < 500 && queuedHighlightId() < own + 1; i++) {
        model.update(past);
      }
      expect(queuedHighlightId()).toBe(own + 1);

      // Switch to a single highlight on everything.
      model.resetHighlight(undefined as any);
      model.highlight(undefined as any, ghost(0.3));
      await deliver();

      // The worker reclaimed both ids and handed the first one out again;
      // the queued updates still reference the second one.
      expect(definitions().length).toBeGreaterThanOrEqual(own + 1);
      expect(queuedHighlightId()).toBe(own + 1);

      // Next frames on the main thread. A queued update whose highlight
      // no longer exists draws its range with the tile's own material.
      const staleTiles = new Set<number>();
      for (const request of meshes.requests.list) {
        const ids = request.tileData?.highlightIds as ArrayLike<number>;
        if (!ids || !tiles.has(request.tileId)) continue;
        if (Array.from(ids).some((id) => id > own)) {
          staleTiles.add(request.tileId);
        }
      }
      let thrown: unknown;
      try {
        for (let i = 0; i < 10000 && meshes.requests.arePending; i++) {
          meshes.update();
        }
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeUndefined();
      expect(meshes.requests.arePending).toBe(false);
      expect(staleTiles.size).toBeGreaterThan(0);
      for (const tileId of staleTiles) {
        const { groups } = tiles.get(tileId)!.geometry;
        expect(groups.some((group) => group.materialIndex === 0)).toBe(true);
      }

      // Once the worker catches up, every tile is drawn with the new
      // highlight and nothing else.
      await settle();
      let highlighted = 0;
      for (const mesh of tiles.values()) {
        const materials = mesh.material as THREE.Material[];
        for (const group of mesh.geometry.groups) {
          expect(materials[group.materialIndex!]).toBeDefined();
          if (group.materialIndex! > 0) highlighted++;
        }
      }
      expect(highlighted).toBeGreaterThan(0);
      expect(model.getHighlight(even).every((d) => d?.opacity === 0.3)).toBe(true);
    } finally {
      model.dispose();
    }
  });
});
