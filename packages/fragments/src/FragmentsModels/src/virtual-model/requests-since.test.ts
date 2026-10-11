import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Pako from "pako";
import { describe, expect, test } from "vitest";
import { EditRequest, EditRequestType } from "../../../Utils";
import { VirtualFragmentsModel } from "./virtual-fragments-model";

/**
 * getRequestsSince() returns only the requests added since an earlier call
 * while the log has only grown, and all of them once it changed otherwise.
 */

const fragPath = fileURLToPath(
  new URL("../../../../../../resources/frags/small_test.frag", import.meta.url),
);

const load = async (
  bytes: Uint8Array = Pako.inflate(readFileSync(fragPath)),
) => {
  const data = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const connection: any = { fetch: async () => {}, fetchMeshCompute: () => {} };
  const model = new VirtualFragmentsModel("m", data, connection, {
    multithreading: { meshConnectionThreshold: 0, meshConnectionRate: 0 },
  });
  await model.setupData();
  return model;
};

const createItem = (name: string): EditRequest => ({
  type: EditRequestType.CREATE_ITEM,
  data: { category: "IFCWALL", data: { Name: { value: name } } },
});

const names = (requests: EditRequest[]) =>
  requests.map((request) => (request.data as any).data.Name.value);

describe("VirtualFragmentsModel.getRequestsSince", () => {
  test("returns the requests added since the last call", async () => {
    const model = await load();
    model.edit([createItem("A"), createItem("B")]);
    const first = model.getRequestsSince(0, -1);
    expect(first).toMatchObject({ from: 0, count: 2 });
    expect(names(first.requests)).toEqual(["A", "B"]);

    model.edit([createItem("C")]);
    model.redo(); // nothing to redo: the log is unchanged
    const next = model.getRequestsSince(first.count, first.generation);
    expect(next).toMatchObject({
      from: 2,
      count: 3,
      generation: first.generation,
    });
    expect(names(next.requests)).toEqual(["C"]);

    const none = model.getRequestsSince(next.count, next.generation);
    expect(none).toMatchObject({ from: 3, count: 3, requests: [] });
  });

  test.each([
    ["undo", (model: VirtualFragmentsModel) => model.undo()],
    ["selectRequest", (model: VirtualFragmentsModel) => model.selectRequest(0)],
    [
      "setRequests",
      (model: VirtualFragmentsModel) =>
        model.setRequests({ requests: [createItem("X")] }),
    ],
    ["reset", (model: VirtualFragmentsModel) => model.reset()],
  ])("returns all requests after %s", async (_, change) => {
    const model = await load();
    model.edit([createItem("A"), createItem("B")]);
    const before = model.getRequestsSince(0, -1);

    change(model);
    model.edit([createItem("C")]);
    const after = model.getRequestsSince(before.count, before.generation);
    expect(after.generation).not.toBe(before.generation);
    expect(after.from).toBe(0);
    expect(after.requests).toEqual(model.getRequests().requests);
  });

  test("returns all requests for a count it did not give", async () => {
    const model = await load();
    model.edit([createItem("A")]);
    const { generation } = model.getRequestsSince(0, -1);
    expect(model.getRequestsSince(5, generation)).toMatchObject({
      from: 0,
      count: 1,
    });
  });

  // EditHelper.save() saves, disposes and loads the saved buffer under the same
  // model id, so the reader keeps asking the same id but a new worker model answers.
  test("returns all requests after the model is saved and loaded again", async () => {
    const model = await load();
    model.edit([createItem("A")]);
    const before = model.getRequestsSince(0, -1);
    expect(before).toMatchObject({ from: 0, count: 1 });

    const reloaded = await load(model.save(true) as Uint8Array);
    reloaded.setRequests({ undoneRequests: [] });
    reloaded.edit([createItem("B")]);
    const after = reloaded.getRequestsSince(before.count, before.generation);
    expect(after.generation).not.toBe(before.generation);
    expect(after.from).toBe(0);
    expect(names(after.requests)).toEqual(["B"]);
  });

  test("a model loaded again does not reuse the generation of the first load", async () => {
    const first = (await load()).getRequestsSince(0, -1);
    const second = (await load()).getRequestsSince(0, -1);
    expect(second.generation).not.toBe(first.generation);
    for (const { generation } of [first, second]) {
      expect(Number.isSafeInteger(generation)).toBe(true);
      expect(generation).toBeGreaterThanOrEqual(0);
    }
  });
});
