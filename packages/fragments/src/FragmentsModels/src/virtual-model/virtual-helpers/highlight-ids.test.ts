import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Pako from "pako";
import { VirtualFragmentsModel } from "../virtual-fragments-model";
import { ItemConfigController } from "../virtual-controllers/item-config-controller";
import { MaterialManager } from "../../model/material-manager";
import { RequestsManager } from "../../model/requests-manager";
import type { ModelUid } from "../../model/model-types";

// Issue #299: highlight ids live in a Uint16Array per item and index the
// per-model material list shared by the worker and the main thread.

const FRAG = fileURLToPath(
  new URL("../../../../../../../resources/frags/small_test.frag", import.meta.url),
);

// A worker-side model wired to a real main-thread MaterialManager through the
// same RequestsManager.handleRequest the MeshManager uses, so the test sees
// both ends of the CREATE_MATERIAL channel.
const load = async () => {
  const mainMaterials = new MaterialManager();
  const requests = new RequestsManager();
  const meshes: any = { materials: mainMaterials };
  const connection: any = {
    fetch: async (request: any) => requests.handleRequest(meshes, request),
    fetchMeshCompute: () => {},
  };
  const inflated = Pako.inflate(readFileSync(FRAG));
  const data = inflated.buffer.slice(
    inflated.byteOffset,
    inflated.byteOffset + inflated.byteLength,
  );
  const uid = 1 as ModelUid;
  const model = new VirtualFragmentsModel(uid, data, connection, {
    multithreading: { meshConnectionThreshold: 0, meshConnectionRate: 0 },
  });
  await model.setupData();
  const workerList = (model.materials as any)._list as unknown[];
  const mainList = () => (mainMaterials as any)._definitions.get(uid) as unknown[];
  return { model, workerList, mainList };
};

describe("highlight id space (issue #299)", () => {
  test("id 65536 does not fit a Uint16 slot and is rejected instead of stored as 0", () => {
    const config = new ItemConfigController(1);
    config.setHighlight(0, 65535);
    expect(config.getHighlight(0)).toBe(65535);
    expect(() => config.setHighlight(0, 65536)).toThrow(/Memory overflow/);
    // The previous highlight must survive the rejected write.
    expect(config.getHighlight(0)).toBe(65535);
  });

  test("resetHighlight() reclaims the ids its highlights allocated, on both ends", async () => {
    const { model, workerList, mainList } = await load();
    const base = workerList.length;
    expect(mainList().length).toBe(base);

    for (let i = 0; i < 20; i++) {
      const h = i / 20;
      model.setColor(undefined as any, { r: h, g: 1 - h, b: 0.5 } as any);
    }
    expect(workerList.length).toBe(base + 20);
    expect(mainList().length).toBe(base + 20);

    model.resetHighlight(undefined as any);
    expect(workerList.length).toBe(base);

    // A fresh highlight after the reset takes the first reclaimed id, and the
    // main thread resolves that id to the same definition the worker holds.
    model.setOpacity(undefined as any, 0.3);
    expect(workerList.length).toBe(base + 1);
    expect(mainList().length).toBe(base + 1);
    const [anyItem] = model.getHighlightItemIds();
    expect(anyItem).toBeDefined();
    expect(mainList()[base]).toBe(workerList[base]);
    expect((mainList()[base] as any).opacity).toBe(0.3);
  });

  test("a reset of some items keeps the ids the remaining highlights still use", async () => {
    const { model, workerList } = await load();
    const base = workerList.length;
    model.setColor(undefined as any, { r: 1, g: 0, b: 0 } as any);
    const [first] = model.getHighlightItemIds();
    model.resetHighlight([first]);
    expect(model.getHighlightItemIds().length).toBeGreaterThan(0);
    expect(workerList.length).toBe(base + 1);
  });
});
