import { afterEach, expect, test, vi } from "vitest";
import { ModelUid, MultiThreadingRequestClass } from "../model/model-types";
import { FragmentsConnection } from "./fragments-connection";
import { MultithreadingHelper, Thread } from "./multithreading-helper";

// Thread assignment: only CREATE_MODEL assigns a model a thread, so a request
// for a model that isn't loaded can't leak one, and deleting a model frees it
// right away. Workers are stand-ins that keep the port they are handed and
// never answer unless a test does it for them.

let workerPorts: MessagePort[] = [];
let terminated: Thread[] = [];

const stubWorkers = () =>
  vi.spyOn(MultithreadingHelper, "newThread").mockImplementation(() => {
    const worker = {
      postMessage: (port: MessagePort) => workerPorts.push(port),
      terminate: () => terminated.push(worker),
    } as unknown as Thread;
    return worker;
  });

const uid = (value: number) => value as ModelUid;

const request = (
  requestClass: MultiThreadingRequestClass,
  model: ModelUid,
) => ({
  class: requestClass,
  uid: model,
});

// Settles after every pending microtask has run.
const tick = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

afterEach(() => {
  for (const port of workerPorts) port.close();
  workerPorts = [];
  terminated = [];
  vi.restoreAllMocks();
});

test("a request for a model without a thread rejects without assigning one", async () => {
  const newThread = stubWorkers();
  const connection = new FragmentsConnection(() => {}, "worker.mjs");

  await expect(
    connection.fetch(request(MultiThreadingRequestClass.EXECUTE, uid(1))),
  ).rejects.toThrow("model 1 is not loaded");
  // ABORT_MODEL must not assign a thread either.
  await expect(
    connection.fetch(request(MultiThreadingRequestClass.ABORT_MODEL, uid(1))),
  ).rejects.toThrow("model 1 is not loaded");

  expect(newThread).not.toHaveBeenCalled();
});

test("CREATE_MODEL assigns a thread that lasts until the model is deleted", async () => {
  const newThread = stubWorkers();
  const connection = new FragmentsConnection(() => {}, "worker.mjs");

  // The stand-in worker never answers, so these stay pending until the
  // delete below terminates it.
  const pending = [
    connection.fetch(request(MultiThreadingRequestClass.CREATE_MODEL, uid(1))),
    connection.fetch(request(MultiThreadingRequestClass.EXECUTE, uid(1))),
  ];
  for (const fetch of pending) fetch.catch(() => {});
  expect(newThread).toHaveBeenCalledTimes(1);

  connection.delete(uid(1));

  await expect(
    connection.fetch(request(MultiThreadingRequestClass.EXECUTE, uid(1))),
  ).rejects.toThrow("model 1 is not loaded");
  expect(newThread).toHaveBeenCalledTimes(1);
});

test("deleting the last model on a worker terminates it and rejects the requests still waiting on it", async () => {
  stubWorkers();
  const connection = new FragmentsConnection(() => {}, "worker.mjs");
  const create = connection.fetch(
    request(MultiThreadingRequestClass.CREATE_MODEL, uid(1)),
  );
  const execute = connection.fetch(
    request(MultiThreadingRequestClass.EXECUTE, uid(1)),
  );

  const deleted = connection.delete(uid(1));

  expect(terminated).toHaveLength(1);
  await expect(create).rejects.toMatch(/terminated/);
  await expect(execute).rejects.toMatch(/terminated/);
  await expect(deleted).resolves.toBeUndefined();
});

test("deleting a model that shares its worker sends DELETE_MODEL and keeps the worker", async () => {
  const newThread = stubWorkers();
  // One default-pool worker, so both models land on it.
  const connection = new FragmentsConnection(() => {}, "worker.mjs", {
    maxWorkers: 2,
    threadGroups: { reserved: 1 },
  });
  // The stand-in worker never answers these.
  connection.fetch(request(MultiThreadingRequestClass.CREATE_MODEL, uid(1)));
  connection.fetch(request(MultiThreadingRequestClass.CREATE_MODEL, uid(2)));
  expect(newThread).toHaveBeenCalledTimes(1);
  const [workerPort] = workerPorts;
  const received: any[] = [];
  workerPort.onmessage = ({ data }) => {
    received.push(data);
    if (data.class === MultiThreadingRequestClass.DELETE_MODEL) {
      workerPort.postMessage({ ...data, toMainThread: true });
    }
  };

  let settled = false;
  const deleted = connection.delete(uid(1)).then(() => {
    settled = true;
  });
  // Freed right away: the model is not loaded anymore.
  await expect(
    connection.fetch(request(MultiThreadingRequestClass.EXECUTE, uid(1))),
  ).rejects.toThrow("model 1 is not loaded");
  expect(settled).toBe(false);

  await deleted;
  expect(terminated).toEqual([]);
  expect(received).toContainEqual(
    expect.objectContaining({
      class: MultiThreadingRequestClass.DELETE_MODEL,
      uid: 1,
    }),
  );
});

test("deleting a model that never got a thread sends nothing", async () => {
  const newThread = stubWorkers();
  const connection = new FragmentsConnection(() => {}, "worker.mjs");
  connection.setModelThreadGroup(uid(1), undefined);

  await expect(connection.delete(uid(1))).resolves.toBeUndefined();
  await tick();
  expect(newThread).not.toHaveBeenCalled();
});

test("the answer to a worker request goes back to its port, even for a model without a thread", async () => {
  const newThread = stubWorkers();
  const handleInput = vi.fn();
  const connection = new FragmentsConnection(handleInput, "worker.mjs");
  connection.fetch(request(MultiThreadingRequestClass.CREATE_MODEL, uid(1)));
  const [workerPort] = workerPorts;

  const answer = new Promise<any>((resolve) => {
    workerPort.onmessage = ({ data }) => {
      if (data.toMainThread) resolve(data);
    };
  });
  workerPort.postMessage({
    ...request(MultiThreadingRequestClass.RECOMPUTE_MESHES, uid(99)),
    requestId: 7,
  });

  await expect(answer).resolves.toMatchObject({ requestId: 7 });
  expect(handleInput).toHaveBeenCalledWith(
    expect.objectContaining({ uid: 99 }),
  );
  expect(newThread).toHaveBeenCalledTimes(1);
});
