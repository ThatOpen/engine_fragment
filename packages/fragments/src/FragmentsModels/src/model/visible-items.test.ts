import { describe, expect, test } from "vitest";
import * as THREE from "three";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Pako from "pako";
import { VirtualFragmentsModel } from "../virtual-model/virtual-fragments-model";
import { CameraUtils } from "../utils/geometry/camera-utils";
import { MeshManager } from "./mesh-manager";
import { DataManager } from "./data-manager";
import { FragmentsModel } from "./fragments-model";
import { TileRequestClass } from "./model-types";

/**
 * Reproduction for the data point on
 * https://github.com/ThatOpen/engine_fragment/issues/303:
 * `FragmentsModel.visibleItems` was filled with the raw bytes of the 4-byte
 * tile `id` attribute instead of the items the tiles hold, and a deleted
 * tile dropped items that another live tile still held.
 *
 * Same in-process pipeline as highlight-stale-definition.test.ts.
 */

const frag = (name: string) =>
  fileURLToPath(
    new URL(`../../../../../../resources/frags/${name}`, import.meta.url),
  );

/** A main-thread model stand-in with what MeshManager touches. */
const mainModel = (modelId: string) =>
  ({
    modelId,
    tiles: new Map<number, THREE.Mesh>(),
    visibleItems: new Set<number>(),
    _finishProcessing() {},
  }) as any;

/**
 * Loads `name` as `modelId` into `meshes` and settles every tile. Returns
 * the localIds of each live tile, decoded independently of MeshManager
 * from the `id` attribute: big-endian uint32, itemId + 1.
 */
const load = async (meshes: MeshManager, modelId: string, name: string) => {
  const model = mainModel(modelId);
  meshes.list.set(modelId, model);
  const itemsByTile = new Map<number, Set<number>>();
  const connection: any = {
    fetch: async (request: any) =>
      meshes.requests.handleRequest(meshes, request),
    fetchMeshCompute: (_modelId: string, list: any[]) => {
      for (const request of list) {
        if (request.tileRequestClass === TileRequestClass.DELETE) {
          itemsByTile.delete(request.tileId);
        }
        if (request.tileRequestClass !== TileRequestClass.CREATE) continue;
        if (request.objectClass === undefined) continue;
        const bytes = request.itemIds as Uint8Array;
        const items = new Set<number>();
        for (let i = 0; i < bytes.length; i += 4) {
          const encoded =
            bytes[i] * 0x1000000 +
            (bytes[i + 1] << 16) +
            (bytes[i + 2] << 8) +
            bytes[i + 3];
          if (encoded > 0) items.add(encoded - 1);
        }
        itemsByTile.set(request.tileId, items);
      }
      meshes.requests.add(list);
    },
  };

  const inflated = Pako.inflate(readFileSync(frag(name)));
  const data = inflated.buffer.slice(
    inflated.byteOffset,
    inflated.byteOffset + inflated.byteLength,
  );
  const virtual = new VirtualFragmentsModel(modelId, data, connection, {
    multithreading: { meshConnectionThreshold: 0, meshConnectionRate: 0 },
  });
  await virtual.setupData();
  virtual.refreshView({
    cameraFrustum: CameraUtils.containing(virtual.getFullBBox()),
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
  for (let i = 0; i < 500; i++) virtual.update(performance.now());
  await new Promise((resolve) => setTimeout(resolve, 0));
  (meshes as any).drainAll();

  const localIdsByTile = new Map<number, Set<number>>();
  for (const [tileId, items] of itemsByTile) {
    const localIds = virtual.properties.getLocalIdsFromItemIds(items);
    localIdsByTile.set(tileId, new Set(localIds));
  }
  virtual.dispose();
  return { model, localIdsByTile };
};

const deleteTile = (meshes: MeshManager, modelId: string, tileId: number) => {
  meshes.requests.add([
    { tileRequestClass: TileRequestClass.DELETE, modelId, tileId },
  ]);
  (meshes as any).drainAll();
};

const union = (tiles: Map<number, Set<number>>) => {
  const all = new Set<number>();
  for (const items of tiles.values()) for (const id of items) all.add(id);
  return all;
};

const sorted = (ids: Iterable<number>) => [...ids].sort((a, b) => a - b);

describe("FragmentsModel.visibleItems (issue #303)", { timeout: 60000 }, () => {
  test("visibleItems holds the items of the live tiles (issue #303)", async () => {
    const meshes = new MeshManager(() => {});
    const { model, localIdsByTile } = await load(meshes, "m", "school_arq.frag");
    const localIds = union(localIdsByTile);

    expect(localIds.size).toBeGreaterThan(256);
    expect({
      size: model.visibleItems.size,
      localIds: sorted(model.visibleItems),
    }).toEqual({ size: localIds.size, localIds: sorted(localIds) });
  });

  test("items drop out when their last tile is deleted, and only then", async () => {
    const meshes = new MeshManager(() => {});
    const { model, localIdsByTile } = await load(meshes, "m", "school_arq.frag");

    // The same item in several live tiles: it stays until all are gone.
    const tilesOf = new Map<number, number[]>();
    for (const [tileId, items] of localIdsByTile) {
      for (const id of items) {
        const list = tilesOf.get(id) ?? [];
        list.push(tileId);
        tilesOf.set(id, list);
      }
    }
    const [shared, sharedTiles] = [...tilesOf].find(([, t]) => t.length > 1)!;
    expect(sharedTiles.length).toBeGreaterThan(1);
    const last = sharedTiles[sharedTiles.length - 1];
    for (const tileId of sharedTiles.slice(0, -1)) {
      deleteTile(meshes, "m", tileId);
      localIdsByTile.delete(tileId);
      expect(model.visibleItems.has(shared)).toBe(true);
    }
    deleteTile(meshes, "m", last);
    localIdsByTile.delete(last);
    expect(model.visibleItems.has(shared)).toBe(false);

    // Every other deletion keeps the set equal to the live tiles' items.
    for (const tileId of [...localIdsByTile.keys()]) {
      deleteTile(meshes, "m", tileId);
      localIdsByTile.delete(tileId);
      expect(sorted(model.visibleItems)).toEqual(sorted(union(localIdsByTile)));
    }
    expect(model.visibleItems.size).toBe(0);
    expect(model.tiles.size).toBe(0);

    // A DELETE for a tile that is not there changes nothing.
    deleteTile(meshes, "m", 123456);
    expect(model.visibleItems.size).toBe(0);
  });

  test("dispose clears visibleItems and a reload under the same id starts clean", async () => {
    const meshes = new MeshManager(() => {});
    const first = await load(meshes, "m", "school_str.frag");
    expect(first.model.visibleItems.size).toBeGreaterThan(0);
    Object.assign(first.model, {
      _dataManager: new DataManager(),
      _meshManager: meshes,
      _alignmentsManager: { dispose() {} },
      _gridsManager: { dispose() {} },
      onViewUpdated: { reset() {} },
      threads: { fetch: async () => {}, delete() {} },
      object: new THREE.Object3D(),
    });
    await FragmentsModel.prototype.dispose.call(first.model);
    expect(first.model.visibleItems.size).toBe(0);
    expect(meshes.list.has("m")).toBe(false);

    // A late DELETE for the disposed model is ignored.
    const [anyTile] = first.localIdsByTile.keys();
    deleteTile(meshes, "m", anyTile);
    expect(first.model.visibleItems.size).toBe(0);

    const second = await load(meshes, "m", "school_str.frag");
    expect(sorted(second.model.visibleItems)).toEqual(
      sorted(union(second.localIdsByTile)),
    );
    for (const tileId of [...second.localIdsByTile.keys()]) {
      deleteTile(meshes, "m", tileId);
    }
    expect(second.model.visibleItems.size).toBe(0);
  });

  test("several models keep their own visibleItems", async () => {
    const meshes = new MeshManager(() => {});
    const arq = await load(meshes, "arq", "school_arq.frag");
    const str = await load(meshes, "str", "school_str.frag");
    expect(sorted(arq.model.visibleItems)).toEqual(
      sorted(union(arq.localIdsByTile)),
    );
    expect(sorted(str.model.visibleItems)).toEqual(
      sorted(union(str.localIdsByTile)),
    );

    // Deleting every tile of one model leaves the other untouched.
    const strItems = sorted(str.model.visibleItems);
    for (const tileId of [...arq.localIdsByTile.keys()]) {
      deleteTile(meshes, "arq", tileId);
    }
    expect(arq.model.visibleItems.size).toBe(0);
    expect(sorted(str.model.visibleItems)).toEqual(strItems);
  });
});
