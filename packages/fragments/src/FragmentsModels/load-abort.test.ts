import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { FragmentsModels } from ".";
import {
  FragmentsModel,
  LoadAbortedError,
  MultiThreadingRequestClass,
} from "./src/model";

// Main-thread contract of `load({ signal })` (issue #173) and of loading a
// model ID that is already taken.
// The worker is replaced by a stubbed `_setup`: it settles when the test says
// so, and rejects the way a real worker-side abort reaches the main thread —
// as the serialized error string, not as a LoadAbortedError instance.
// `threads` stands in for the connection's model → thread assignments.

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const buffer = () => new Uint8Array([1, 2, 3, 4]);

let fragments: FragmentsModels;
let setup: Deferred<void>;
let coordinates: Deferred<number[]>;
let sent: any[];
let threads: Set<string>;

const abortRequests = () =>
  sent.filter((m) => m.class === MultiThreadingRequestClass.ABORT_MODEL);

// Lets the load reach its next await.
const flush = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

beforeEach(() => {
  fragments = new FragmentsModels("worker.mjs");
  setup = deferred();
  coordinates = deferred();
  sent = [];
  threads = new Set();

  vi.spyOn(FragmentsModel.prototype, "_setup").mockImplementation(
    function setupMocked(this: FragmentsModel) {
      threads.add(this.modelId);
      return setup.promise;
    },
  );
  vi.spyOn(FragmentsModel.prototype, "getCoordinates").mockImplementation(
    () => coordinates.promise,
  );
  // Unfreezing a loaded model refreshes its view, which reads `window`.
  vi.spyOn(FragmentsModel.prototype, "_refreshView").mockResolvedValue();
  vi.spyOn(FragmentsModel.prototype, "dispose").mockImplementation(
    async function disposeMocked(this: FragmentsModel) {
      fragments.models.list.delete(this.modelId);
      threads.delete(this.modelId);
    },
  );
  const connection = (fragments as any)._connection;
  vi.spyOn(connection, "hasModel").mockImplementation((id: any) =>
    threads.has(id),
  );
  vi.spyOn(connection, "fetch").mockImplementation(
    async (message: any) => {
      sent.push(message);
      // Like the real worker, an abort only lands while CREATE_MODEL runs.
      if (message.class === MultiThreadingRequestClass.ABORT_MODEL) {
        setup.reject(
          `LoadAbortedError: Fragments: Load of model "${message.modelId}" was aborted.`,
        );
      }
    },
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("an already-aborted signal rejects before any work is done", async () => {
  const controller = new AbortController();
  controller.abort();

  await expect(
    fragments.load(buffer(), { modelId: "m", signal: controller.signal }),
  ).rejects.toBeInstanceOf(LoadAbortedError);

  expect(FragmentsModel.prototype._setup).not.toHaveBeenCalled();
  expect(fragments.models.list.size).toBe(0);
  expect(sent).toEqual([]);
});

test("aborting the signal mid-load aborts the worker and rejects with LoadAbortedError", async () => {
  const controller = new AbortController();
  const loaded = vi.fn();
  fragments.onModelLoaded.add(loaded);

  const load = fragments.load(buffer(), {
    modelId: "m",
    signal: controller.signal,
  });
  await flush();
  controller.abort();

  await expect(load).rejects.toBeInstanceOf(LoadAbortedError);
  expect(abortRequests()).toEqual([expect.objectContaining({ modelId: "m" })]);
  expect(FragmentsModel.prototype.dispose).toHaveBeenCalledTimes(1);
  expect(fragments.models.list.size).toBe(0);
  expect(loaded).not.toHaveBeenCalled();
});

test("an abort that lands after the worker finished still rejects and disposes", async () => {
  const controller = new AbortController();
  const load = fragments.load(buffer(), {
    modelId: "m",
    signal: controller.signal,
  });

  setup.resolve();
  await flush();
  // The load is now waiting on getCoordinates; the worker is done.
  controller.abort();
  coordinates.resolve([0, 0, 0]);

  await expect(load).rejects.toBeInstanceOf(LoadAbortedError);
  expect(FragmentsModel.prototype.dispose).toHaveBeenCalledTimes(1);
  expect(fragments.models.list.size).toBe(0);
  expect(fragments.baseCoordinates).toBeNull();
});

test("a signal that fires after the load resolved does nothing", async () => {
  const controller = new AbortController();
  const load = fragments.load(buffer(), {
    modelId: "m",
    signal: controller.signal,
  });
  setup.resolve();
  coordinates.resolve([0, 0, 0]);
  const model = await load;

  controller.abort();

  expect(sent).toEqual([]);
  expect(model.dispose).not.toHaveBeenCalled();
  expect(fragments.models.list.get("m")).toBe(model);
});

test("a worker error without an abort is rethrown unchanged", async () => {
  const load = fragments.load(buffer(), { modelId: "m" });
  setup.reject("Error: boom");

  await expect(load).rejects.toBe("Error: boom");
  expect(fragments.models.list.size).toBe(0);
});

test("the same model ID loads normally after an aborted load", async () => {
  const controller = new AbortController();
  const first = fragments.load(buffer(), {
    modelId: "m",
    signal: controller.signal,
  });
  await flush();
  controller.abort();
  await expect(first).rejects.toBeInstanceOf(LoadAbortedError);

  setup = deferred();
  coordinates = deferred();
  const second = fragments.load(buffer(), { modelId: "m" });
  setup.resolve();
  coordinates.resolve([0, 0, 0]);

  await expect(second).resolves.toBeInstanceOf(FragmentsModel);
  expect(abortRequests()).toHaveLength(1);
});

test("loading an ID that is already loaded rejects and keeps the loaded model", async () => {
  const first = fragments.load(buffer(), { modelId: "m" });
  setup.resolve();
  coordinates.resolve([0, 0, 0]);
  const model = await first;

  await expect(fragments.load(buffer(), { modelId: "m" })).rejects.toThrow(
    /already in use/,
  );
  expect(FragmentsModel.prototype._setup).toHaveBeenCalledTimes(1);
  expect(model.dispose).not.toHaveBeenCalled();
  expect(fragments.models.list.get("m")).toBe(model);
});

test("loading an ID that is still loading rejects and leaves the in-flight load alone", async () => {
  const controller = new AbortController();
  const first = fragments.load(buffer(), {
    modelId: "m",
    signal: controller.signal,
  });
  await flush();

  await expect(
    fragments.load(buffer(), { modelId: "m", signal: controller.signal }),
  ).rejects.toThrow(/already in use/);
  expect(FragmentsModel.prototype._setup).toHaveBeenCalledTimes(1);

  // Only the first load listens to the signal.
  controller.abort();
  await expect(first).rejects.toBeInstanceOf(LoadAbortedError);
  expect(abortRequests()).toHaveLength(1);
});

test("loading an ID that is still being disposed rejects until the worker deleted it", async () => {
  const workerDeleted = deferred<void>();
  vi.mocked(FragmentsModel.prototype.dispose).mockImplementation(
    async function disposeMocked(this: FragmentsModel) {
      fragments.models.list.delete(this.modelId);
      await workerDeleted.promise;
      threads.delete(this.modelId);
    },
  );
  const first = fragments.load(buffer(), { modelId: "m" });
  setup.reject("Error: boom");
  await flush();

  // The failed load's model left the list, but its worker delete is pending.
  expect(fragments.models.list.has("m")).toBe(false);
  await expect(fragments.load(buffer(), { modelId: "m" })).rejects.toThrow(
    /already in use/,
  );

  workerDeleted.resolve();
  await expect(first).rejects.toBe("Error: boom");

  setup = deferred();
  coordinates = deferred();
  const second = fragments.load(buffer(), { modelId: "m" });
  setup.resolve();
  coordinates.resolve([0, 0, 0]);
  await expect(second).resolves.toBeInstanceOf(FragmentsModel);
});
