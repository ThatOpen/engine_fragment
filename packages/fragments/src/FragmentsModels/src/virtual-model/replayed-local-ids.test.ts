import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ByteBuffer } from "flatbuffers";
import Pako from "pako";
import { describe, expect, test } from "vitest";
import { Model } from "../../../Schema";
import { EditRequest, EditRequestType } from "../../../Utils";
import { VirtualFragmentsModel } from "./virtual-fragments-model";

/**
 * The requests of `editor.getModelRequests()` carry the local ids they were
 * given. Replaying them on another load of the same file (to rebuild it
 * elsewhere, or to apply a stored session) skipped the id allocator, so the
 * next created item reused a replayed id and `save()` wrote a max local id
 * below the replayed items.
 */

const fragPath = fileURLToPath(
  new URL("../../../../../../resources/frags/small_test.frag", import.meta.url),
);

const load = async () => {
  const inflated = Pako.inflate(readFileSync(fragPath));
  const data = inflated.buffer.slice(
    inflated.byteOffset,
    inflated.byteOffset + inflated.byteLength,
  );
  const connection: any = { fetch: async () => {}, fetchMeshCompute: () => {} };
  const model = new VirtualFragmentsModel("m", data, connection, {
    multithreading: { meshConnectionThreshold: 0, meshConnectionRate: 0 },
  });
  await model.setupData();
  return model;
};

const createItem = (name: string, localId?: number): EditRequest => ({
  type: EditRequestType.CREATE_ITEM,
  localId,
  data: { category: "IFCWALL", data: { Name: { value: name } } },
});

describe("VirtualFragmentsModel.edit with replayed requests", () => {
  test("gives new items ids after the replayed ones, and saves them", async () => {
    // A session on one load of the file creates two items...
    const session = await load();
    const first = session.getMaxLocalId();
    const { ids } = session.edit([createItem("A"), createItem("B")]);
    expect(ids).toEqual([first, first + 1]);
    const log = structuredClone(session.getRequests().requests);

    // ...and its requests are replayed on another load before new edits.
    const copy = await load();
    copy.edit(log);
    const added = copy.edit([createItem("C")]).ids;
    expect(added).toEqual([first + 2]);

    const saved = Model.getRootAsModel(new ByteBuffer(copy.save()));
    expect(saved.maxLocalId()).toBeGreaterThan(first + 2);
  });
});
