import { describe, expect, test } from "vitest";
import * as THREE from "three";
import { appendFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Pako from "pako";
import { VirtualFragmentsModel } from "../virtual-model/virtual-fragments-model";
import { CameraUtils } from "../utils/geometry/camera-utils";
import { MeshManager } from "./mesh-manager";
import { LODMesh } from "../lod";

/**
 * Regression test for https://github.com/ThatOpen/engine_fragment/issues/318.
 *
 * A highlighted item must be drawn once, with the highlight material. The
 * tile keeps two per-sample buffers: `visibilities` (drawn with the tile's
 * own material, geometry group with materialIndex 0) and `highlights`
 * (drawn with a highlight material, materialIndex > 0). #288 made
 * `setSample()` write the item's visibility into the first one whatever
 * its highlight, so a visible highlighted sample ended up in both and the
 * main thread emitted two overlapping groups over the same index range:
 * opaque original first, highlight on top. A transparent highlight then
 * fades nothing.
 *
 * The whole pipeline runs in process: the virtual model (worker side)
 * hands its tile requests to a real MeshManager (main side), and the test
 * counts what three.js would draw: the geometry groups of every tile.
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

  const settle = async () => {
    for (let i = 0; i < 500; i++) model.update(performance.now());
    // Material definitions travel through an async fetch.
    await new Promise((resolve) => setTimeout(resolve, 0));
    (meshes as any).drainAll();
  };
  await settle();
  return { model, tiles, settle };
};

type Range = { start: number; end: number };

/** What the renderer draws for the shell tiles, read from their groups. */
const drawn = (tiles: Map<number, THREE.Mesh>) => {
  const result = {
    tiles: 0,
    highlightedTiles: 0,
    overlappingTiles: 0,
    groups: 0,
    baseIndices: 0,
    highlightIndices: 0,
    twiceIndices: 0,
  };
  for (const mesh of tiles.values()) {
    if (mesh instanceof LODMesh) continue;
    const { geometry } = mesh;
    const total = geometry.index!.count;
    const range = (group: { start: number; count: number }): Range => ({
      start: group.start,
      end: Math.min(total, group.start + group.count),
    });
    const base = geometry.groups
      .filter((g) => g.materialIndex === 0)
      .map(range);
    const high = geometry.groups
      .filter((g) => g.materialIndex! > 0)
      .map(range);
    let twice = 0;
    for (const b of base) {
      for (const h of high) {
        const shared = Math.min(b.end, h.end) - Math.max(b.start, h.start);
        twice += Math.max(0, shared);
      }
    }
    result.tiles++;
    result.groups += geometry.groups.length;
    if (high.length) result.highlightedTiles++;
    if (twice) result.overlappingTiles++;
    for (const b of base) result.baseIndices += b.end - b.start;
    for (const h of high) result.highlightIndices += h.end - h.start;
    result.twiceIndices += twice;
  }
  return result;
};

const ghost = {
  color: new THREE.Color("#ffffff"),
  renderedFaces: 1,
  opacity: 0.15,
  transparent: true,
  depthWrite: false,
} as any;

const everyOtherItem = (model: VirtualFragmentsModel) => {
  const count = model.itemConfig.size;
  const itemIds: number[] = [];
  for (let itemId = 0; itemId < count; itemId += 2) itemIds.push(itemId);
  return model.properties.getLocalIdsFromItemIds(itemIds);
};

// Set FRAGMENTS_318_LOG to a file path to get the counts of each case.
const log = (label: string, data: unknown) => {
  const file = process.env.FRAGMENTS_318_LOG;
  if (file) appendFileSync(file, `${label} ${JSON.stringify(data)}
`);
};

describe("a highlighted item is drawn once (issue #318)", { timeout: 60000 }, () => {
  test.each(["small_test.frag", "school_str.frag"])(
    "%s: highlighting every item leaves no original-material draw under it",
    async (name) => {
      const { model, tiles, settle } = await load(name);
      try {
        const before = drawn(tiles);
        expect(before.tiles).toBeGreaterThan(0);
        expect(before.highlightIndices).toBe(0);

        model.highlight(undefined as any, ghost);
        await settle();
        const after = drawn(tiles);
        log(`${name} all`, { before, after });

        expect(after.highlightedTiles).toBeGreaterThan(0);
        // The highlight replaces the original material: same geometry,
        // drawn once.
        expect(after.highlightIndices).toBe(before.baseIndices);
        expect(after.overlappingTiles).toBe(0);
        expect(after.twiceIndices).toBe(0);
        expect(after.baseIndices).toBe(0);

        model.resetHighlight(undefined as any);
        await settle();
        const reset = drawn(tiles);
        expect(reset.highlightIndices).toBe(0);
        expect(reset.baseIndices).toBe(before.baseIndices);
      } finally {
        model.dispose();
      }
    },
  );

  test("highlighting half the items draws every index exactly once", async () => {
    const { model, tiles, settle } = await load("school_str.frag");
    try {
      const before = drawn(tiles);
      model.highlight(everyOtherItem(model), ghost);
      await settle();
      const after = drawn(tiles);
      log("school_str.frag half", { before, after });

      expect(after.highlightIndices).toBeGreaterThan(0);
      expect(after.baseIndices).toBeGreaterThan(0);
      expect(after.twiceIndices).toBe(0);
      expect(after.baseIndices + after.highlightIndices).toBe(
        before.baseIndices,
      );
    } finally {
      model.dispose();
    }
  });

  test("a hidden item is drawn neither by its material nor by its highlight (#287 kept)", async () => {
    const { model, tiles, settle } = await load("school_str.frag");
    try {
      const before = drawn(tiles);
      const half = everyOtherItem(model);
      model.highlight(undefined as any, ghost);
      model.setVisible(half, false);
      await settle();
      const after = drawn(tiles);
      log("school_str.frag all highlighted, half hidden", { before, after });

      expect(after.baseIndices).toBe(0);
      expect(after.highlightIndices).toBeGreaterThan(0);
      expect(after.highlightIndices).toBeLessThan(before.baseIndices);

      model.resetHighlight(undefined as any);
      await settle();
      const plain = drawn(tiles);
      expect(plain.highlightIndices).toBe(0);
      expect(plain.baseIndices).toBe(after.highlightIndices);
    } finally {
      model.dispose();
    }
  });
});
