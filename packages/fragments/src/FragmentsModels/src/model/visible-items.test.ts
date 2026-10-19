import { expect, test } from "vitest";
import * as THREE from "three";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Pako from "pako";
import { VirtualFragmentsModel } from "../virtual-model/virtual-fragments-model";
import { CameraUtils } from "../utils/geometry/camera-utils";
import { MeshManager } from "./mesh-manager";
import { TileRequestClass } from "./model-types";

/**
 * Reproduction for the data point on
 * https://github.com/ThatOpen/engine_fragment/issues/303:
 * `FragmentsModel.visibleItems` is filled with the raw bytes of the 4-byte
 * tile `id` attribute instead of the items the tiles hold.
 *
 * Same in-process pipeline as highlight-stale-definition.test.ts.
 */

const frag = (name: string) =>
  fileURLToPath(
    new URL(`../../../../../../resources/frags/${name}`, import.meta.url),
  );

test("visibleItems holds the items of the live tiles (issue #303)", async () => {
  const meshes = new MeshManager(() => {});
  const visibleItems = new Set<number>();
  meshes.list.set("m", {
    tiles: new Map<number, THREE.Mesh>(),
    visibleItems,
    _finishProcessing() {},
  } as any);

  // Decode the items of every created tile: big-endian uint32, itemId + 1.
  const created = new Map<number, Set<number>>();
  const connection: any = {
    fetch: async (request: any) =>
      meshes.requests.handleRequest(meshes, request),
    fetchMeshCompute: (_modelId: string, list: any[]) => {
      for (const request of list) {
        if (request.tileRequestClass === TileRequestClass.DELETE) {
          created.delete(request.tileId);
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
        created.set(request.tileId, items);
      }
      meshes.requests.add(list);
    },
  };

  const inflated = Pako.inflate(readFileSync(frag("school_arq.frag")));
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
  for (let i = 0; i < 500; i++) model.update(performance.now());
  await new Promise((resolve) => setTimeout(resolve, 0));
  (meshes as any).drainAll();

  const itemIds = new Set<number>();
  for (const items of created.values()) for (const id of items) itemIds.add(id);
  const localIds = new Set(model.properties.getLocalIdsFromItemIds([...itemIds]));
  model.dispose();

  expect(itemIds.size).toBeGreaterThan(256);
  expect({ size: visibleItems.size, localIds: [...visibleItems].sort() }).toEqual({
    size: localIds.size,
    localIds: [...localIds].sort(),
  });
}, 60000);
