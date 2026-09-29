import * as THREE from "three";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { FragmentsModels } from "../..";
import { FragmentsModel } from "../model";
import { EditUtils } from "../../../Utils";

// Editor state belongs to one load of a model, not to its modelId: a model's
// delta models and queued element requests die with it, and a model loaded
// later under the same modelId starts with none. The worker is stubbed at the
// FragmentsModel level; every load and edit settles right away unless a test
// holds it.

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const edited = () => ({ deltaModelBuffer: new Uint8Array(), ids: [] });

let fragments: FragmentsModels;

const load = (modelId = "m") =>
  fragments.load(new Uint8Array([1, 2, 3, 4]), { modelId });

const deltaModels = () =>
  [...fragments.models.list.values()].filter((model) => model.isDeltaModel);

// `dispose` is spied on the prototype, so tell its calls apart by `this`.
const disposeOrder = (model: FragmentsModel) => {
  const { mock } = vi.mocked(FragmentsModel.prototype.dispose);
  const call = mock.contexts.indexOf(model);
  return call === -1 ? undefined : mock.invocationCallOrder[call];
};

beforeEach(() => {
  fragments = new FragmentsModels("worker.mjs");
  const proto = FragmentsModel.prototype;
  vi.spyOn(proto, "_setup").mockResolvedValue();
  vi.spyOn(proto, "getCoordinates").mockResolvedValue([0, 0, 0]);
  // Refreshing a view reads `window`.
  vi.spyOn(proto, "_refreshView").mockResolvedValue();
  vi.spyOn(proto, "_edit").mockImplementation(async () => edited());
  vi.spyOn(proto, "_reset").mockResolvedValue();
  vi.spyOn(proto, "_setRequests").mockResolvedValue(undefined as any);
  vi.spyOn(proto, "dispose");
  vi.spyOn(fragments.models, "forceUpdateFinish").mockResolvedValue();
  vi.spyOn((fragments as any)._connection, "fetch").mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("an edit loads a delta model under a unique ID", async () => {
  const model = await load();
  await fragments.editor.edit("m", []);
  await fragments.editor.edit("m", []);

  const [delta] = deltaModels();
  expect(deltaModels()).toHaveLength(1);
  expect(model.deltaModelId).toBe(delta.modelId);
  expect(EditUtils.getRootModelId(delta.modelId)).toBe("m");
  expect(delta.object.parent).toBe(model.object);
});

test("disposing a model disposes its delta models", async () => {
  await load();
  await fragments.editor.edit("m", []);
  const [delta] = deltaModels();

  fragments.disposeModel("m");

  expect(disposeOrder(delta)).toBeDefined();
  expect(fragments.models.list.size).toBe(0);
});

test("reset disposes the delta models and clears deltaModelId", async () => {
  const model = await load();
  await fragments.editor.edit("m", []);
  const [delta] = deltaModels();

  await fragments.editor.reset("m");

  expect(disposeOrder(delta)).toBeDefined();
  expect(deltaModels()).toEqual([]);
  expect(model.deltaModelId).toBeNull();
});

test("a model loaded under a disposed model's ID starts with no editor state", async () => {
  await load();
  await fragments.editor.edit("m", []);
  const [delta] = deltaModels();
  fragments.editor.createMaterial("m", new THREE.MeshLambertMaterial());
  fragments.disposeModel("m");

  const model = await load();
  vi.mocked(FragmentsModel.prototype._refreshView).mockClear();
  await fragments.editor._update(model);

  expect(model.deltaModelId).toBeNull();
  // No delta model of the old one is refreshed along with the new one.
  expect(FragmentsModel.prototype._refreshView).not.toHaveBeenCalled();
  expect(disposeOrder(delta)).toBeDefined();
  expect(fragments.editor.clearElementsRequests("m")).toBeNull();
});

test("an edit whose model is disposed meanwhile leaves no delta model behind", async () => {
  const worker = deferred<ReturnType<typeof edited>>();
  vi.mocked(FragmentsModel.prototype._edit).mockReturnValue(
    worker.promise as any,
  );
  await load();
  const edit = fragments.editor.edit("m", []);

  fragments.disposeModel("m");
  worker.resolve(edited());
  await edit;

  expect(fragments.models.list.size).toBe(0);
});

// Records the buffer each model is set up with, to tell delta models apart.
const recordBuffers = () => {
  const buffers = new Map<FragmentsModel, unknown>();
  vi.mocked(FragmentsModel.prototype._setup).mockImplementation(async function (
    this: FragmentsModel,
    data,
  ) {
    buffers.set(this, data);
  });
  return buffers;
};

const deltaOf = (id: number) => ({
  deltaModelBuffer: new Uint8Array([id]),
  ids: [],
});

test("concurrent edits keep the delta model of the last one, whichever loads last", async () => {
  const buffers = recordBuffers();
  const first = deferred<ReturnType<typeof edited>>();
  const second = deferred<ReturnType<typeof edited>>();
  vi.mocked(FragmentsModel.prototype._edit)
    .mockReturnValueOnce(first.promise as any)
    .mockReturnValueOnce(second.promise as any);
  const model = await load();

  const edits = [
    fragments.editor.edit("m", []),
    fragments.editor.edit("m", []),
  ];
  // The first edit's delta model starts loading last, so it finishes last.
  second.resolve(deltaOf(2));
  first.resolve(deltaOf(1));
  await Promise.all(edits);

  const [delta] = deltaModels();
  expect(deltaModels()).toHaveLength(1);
  expect(model.deltaModelId).toBe(delta.modelId);
  expect(buffers.get(delta)).toEqual(new Uint8Array([2]));
});

test("an edit's delta model that finishes loading after a reset isn't shown", async () => {
  const worker = deferred<ReturnType<typeof edited>>();
  vi.mocked(FragmentsModel.prototype._edit).mockReturnValueOnce(
    worker.promise as any,
  );
  const model = await load();

  const edit = fragments.editor.edit("m", []);
  await fragments.editor.reset("m");
  worker.resolve(edited());
  await edit;

  expect(deltaModels()).toEqual([]);
  expect(model.deltaModelId).toBeNull();
});

// Lets editor.save() get a model's requests and its saved buffer.
const stubSave = () => {
  vi.spyOn(FragmentsModel.prototype, "_getRequests").mockResolvedValue({
    requests: [],
    undoneRequests: [],
  });
  vi.spyOn(FragmentsModel.prototype, "_save").mockResolvedValue(
    new Uint8Array([1, 2, 3, 4]),
  );
};

test("save keeps the old delta models in the scene until the new model is in", async () => {
  stubSave();
  const scene = new THREE.Object3D();
  const old = await load();
  scene.add(old.object);
  await fragments.editor.edit("m", []);
  const [delta] = deltaModels();
  const finalize = vi.spyOn(old, "finalizeDispose");

  await fragments.editor.save("m");

  const model = fragments.models.list.get("m")!;
  expect(model).not.toBe(old);
  expect(model.object.parent).toBe(scene);
  expect(model.deltaModelId).toBeNull();
  expect(disposeOrder(delta)).toBeGreaterThan(
    finalize.mock.invocationCallOrder[0],
  );
  expect(deltaModels()).toEqual([]);
});

test("save tears down the old model and its delta models if the reload fails", async () => {
  stubSave();
  const scene = new THREE.Object3D();
  const old = await load();
  scene.add(old.object);
  await fragments.editor.edit("m", []);
  const [delta] = deltaModels();
  vi.spyOn(fragments, "load").mockRejectedValueOnce(new Error("aborted"));

  await expect(fragments.editor.save("m")).rejects.toThrow("aborted");

  expect(old.object.parent).toBeNull();
  expect(disposeOrder(delta)).toBeDefined();
  expect(fragments.models.list.size).toBe(0);
});

test("save carries the element requests not applied yet over to the reloaded model", async () => {
  stubSave();
  await load();
  const material = new THREE.MeshLambertMaterial();
  const tempId = fragments.editor.createMaterial("m", material);

  await fragments.editor.save("m");

  // Temp ids go on from where they were, so they can't clash.
  expect(fragments.editor.createMaterial("m", material)).not.toBe(tempId);
  const requests = fragments.editor.clearElementsRequests("m");
  expect(requests?.map((request) => request.tempId)).toEqual([
    tempId,
    expect.any(String),
  ]);
});

test("element requests can't be queued for a model that isn't loaded", () => {
  expect(() =>
    fragments.editor.createMaterial("m", new THREE.MeshLambertMaterial()),
  ).toThrow("Model m not found");
});
