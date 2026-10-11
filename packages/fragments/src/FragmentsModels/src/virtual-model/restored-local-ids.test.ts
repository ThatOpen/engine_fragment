import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ByteBuffer } from "flatbuffers";
import Pako from "pako";
import { describe, expect, test } from "vitest";
import { Model } from "../../../Schema";
import { EditRequest, EditRequestType } from "../../../Utils";
import { VirtualFragmentsModel } from "./virtual-fragments-model";

/**
 * A stored session is restored with `setRequests()`, and its requests carry
 * the local ids they were given. Restoring them skipped the id allocator, so
 * the next created item reused a restored id and `save()` wrote a max local
 * id that restored items already use.
 */

const fragPath = fileURLToPath(
  new URL("../../../../../../resources/frags/small_test.frag", import.meta.url),
);

const connection: any = { fetch: async () => {}, fetchMeshCompute: () => {} };

const open = async (data: ArrayBuffer) => {
  const model = new VirtualFragmentsModel("m", data, connection, {
    multithreading: { meshConnectionThreshold: 0, meshConnectionRate: 0 },
  });
  await model.setupData();
  return model;
};

const load = async () => {
  const inflated = Pako.inflate(readFileSync(fragPath));
  const data = inflated.buffer.slice(
    inflated.byteOffset,
    inflated.byteOffset + inflated.byteLength,
  );
  return open(data);
};

const reload = async (saved: Uint8Array) => {
  const data = saved.buffer.slice(
    saved.byteOffset,
    saved.byteOffset + saved.byteLength,
  );
  return open(data as ArrayBuffer);
};

const createItem = (name: string, localId?: number): EditRequest => ({
  type: EditRequestType.CREATE_ITEM,
  localId,
  data: { category: "IFCWALL", data: { Name: { value: name } } },
});

const localIds = (requests: EditRequest[]) => {
  const ids: number[] = [];
  for (const request of requests) {
    const localId = (request as { localId?: unknown }).localId;
    if (Number.isInteger(localId)) ids.push(localId as number);
  }
  return ids;
};

describe("VirtualFragmentsModel.setRequests with restored requests", () => {
  test("gives new items ids after the restored ones, and saves them", async () => {
    // A session on one load of the file creates two items...
    const session = await load();
    const first = session.getMaxLocalId();
    const { ids } = session.edit([createItem("A"), createItem("B")]);
    expect(ids).toEqual([first, first + 1]);
    const log = structuredClone(session.getRequests().requests);
    const restored = localIds(log);
    expect(Math.max(...restored)).toBe(first + 1);

    // ...and its requests are restored on another load before new edits.
    const copy = await load();
    copy.setRequests({ requests: log });
    const added = copy.edit([createItem("C")]).ids;
    expect(added).toEqual([first + 2]);

    // The saved max local id is past every item, also after a reload.
    const buffer = copy.save();
    const saved = Model.getRootAsModel(new ByteBuffer(buffer));
    expect(saved.maxLocalId()).toBeGreaterThan(first + 2);

    const reloaded = await reload(buffer);
    const used = new Set(reloaded.getLocalIds());
    expect(used.has(first)).toBe(true);
    expect(used.has(first + 1)).toBe(true);
    expect(used.has(first + 2)).toBe(true);
    const later = reloaded.edit([createItem("D")]).ids;
    expect(later).toHaveLength(1);
    expect(used.has(later[0])).toBe(false);
  });

  test("saves a max local id past the restored ids without new edits", async () => {
    const session = await load();
    const first = session.getMaxLocalId();
    session.edit([createItem("A"), createItem("B")]);
    const log = structuredClone(session.getRequests().requests);

    const copy = await load();
    copy.setRequests({ requests: log });
    const buffer = copy.save();
    const saved = Model.getRootAsModel(new ByteBuffer(buffer));
    expect(saved.maxLocalId()).toBeGreaterThan(first + 1);

    const reloaded = await reload(buffer);
    const used = new Set(reloaded.getLocalIds());
    const later = reloaded.edit([createItem("C")]).ids;
    expect(used.has(later[0])).toBe(false);
  });

  test("gives new items ids after the restored undone ones", async () => {
    // A session creates two items and undoes the second...
    const session = await load();
    const first = session.getMaxLocalId();
    session.edit([createItem("A"), createItem("B")]);
    session.undo();
    const log = structuredClone(session.getRequests());
    expect(localIds(log.undoneRequests)).toEqual([first + 1]);

    // ...and the restored session can still redo it after a new item.
    const copy = await load();
    copy.setRequests(log);
    const added = copy.edit([createItem("C")]).ids;
    expect(added).toEqual([first + 2]);
    copy.redo();
    const all = localIds(copy.getRequests().requests);
    expect(new Set(all).size).toBe(all.length);
  });
});
