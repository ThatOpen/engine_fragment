import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, vi } from "vitest";
import {
  LoadAbortedError,
  MultiThreadingRequestClass,
} from "../../model/model-types";
import { ThreadModelCreator } from "./thread-model-creator";
import { ThreadModelDeleter } from "./thread-model-deleter";

// Worker side of disposing a model: a DELETE_MODEL that lands while the
// model's CREATE_MODEL is still generating aborts the load instead of
// disposing the model from under it, and answers once the load has unwound.

const FRAG = fileURLToPath(
  new URL(
    "../../../../../../../resources/frags/school_arq.frag",
    import.meta.url,
  ),
);

// The parts of FragmentsThread the two controllers use.
const stubThread = () => {
  const thread: any = {
    actions: {},
    list: new Map(),
    loading: new Map(),
    aborting: new Set(),
    connection: { fetch: async () => {}, fetchMeshCompute: () => {} },
    controllerManager: { updater: { setUpdateDelay() {}, start() {} } },
  };
  // eslint-disable-next-line no-new
  new ThreadModelCreator(thread);
  // eslint-disable-next-line no-new
  new ThreadModelDeleter(thread);
  return thread;
};

const createModel = (thread: any, modelId: string) =>
  thread.actions[MultiThreadingRequestClass.CREATE_MODEL]({
    modelId,
    modelData: readFileSync(FRAG),
    raw: false,
    config: {
      multithreading: { meshConnectionThreshold: 0, meshConnectionRate: 0 },
    },
  });

const deleteModel = (thread: any, modelId: string) =>
  thread.actions[MultiThreadingRequestClass.DELETE_MODEL]({ modelId });

test("a DELETE_MODEL mid-load aborts the load and answers once it has unwound", async () => {
  const thread = stubThread();
  const create = createModel(thread, "m");
  // The load registered its model before generating it.
  const partial = thread.list.get("m");
  expect(partial).toBeDefined();
  const dispose = vi.spyOn(partial, "dispose");

  const deleted = deleteModel(thread, "m");

  await expect(create).rejects.toBeInstanceOf(LoadAbortedError);
  await deleted;
  // Disposed once, by the load unwinding, not again by the delete.
  expect(dispose).toHaveBeenCalledTimes(1);
  expect(thread.list.size).toBe(0);
  expect(thread.loading.size).toBe(0);
  expect(thread.aborting.size).toBe(0);
});

test("a DELETE_MODEL for a loaded model disposes it", async () => {
  const thread = stubThread();
  await createModel(thread, "m");
  const model = thread.list.get("m");
  const dispose = vi.spyOn(model, "dispose");

  await deleteModel(thread, "m");

  expect(dispose).toHaveBeenCalledTimes(1);
  expect(thread.list.size).toBe(0);
});
