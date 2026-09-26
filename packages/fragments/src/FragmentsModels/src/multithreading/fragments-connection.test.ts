import { afterEach, expect, test, vi } from "vitest";
import { MultiThreadingRequestClass } from "../model/model-types";
import { FragmentsConnection } from "./fragments-connection";
import { MultithreadingHelper, Thread } from "./multithreading-helper";

// Thread assignment: only CREATE_MODEL assigns a model a thread, so a request
// for a model that isn't loaded can't leak one. Workers are stand-ins that
// keep the port they are handed.

let workerPorts: MessagePort[] = [];

const stubWorkers = () =>
  vi.spyOn(MultithreadingHelper, "newThread").mockImplementation(
    () =>
      ({
        postMessage: (port: MessagePort) => workerPorts.push(port),
        terminate: () => {},
      }) as unknown as Thread,
  );

const request = (
  requestClass: MultiThreadingRequestClass,
  modelId: string,
) => ({ class: requestClass, modelId });

afterEach(() => {
  for (const port of workerPorts) port.close();
  workerPorts = [];
  vi.restoreAllMocks();
});

test("a request for a model without a thread rejects without assigning one", async () => {
  const newThread = stubWorkers();
  const connection = new FragmentsConnection(() => {}, "worker.mjs");

  await expect(
    connection.fetch(request(MultiThreadingRequestClass.EXECUTE, "m")),
  ).rejects.toThrow('model "m" is not loaded');
  // ABORT_MODEL must not assign a thread either.
  await expect(
    connection.fetch(request(MultiThreadingRequestClass.ABORT_MODEL, "m")),
  ).rejects.toThrow('model "m" is not loaded');

  expect(connection.hasModel("m")).toBe(false);
  expect(newThread).not.toHaveBeenCalled();
});

test("CREATE_MODEL assigns a thread that lasts until the model is deleted", async () => {
  const newThread = stubWorkers();
  const connection = new FragmentsConnection(() => {}, "worker.mjs");

  // The stand-in worker never answers, so these stay pending.
  connection.fetch(request(MultiThreadingRequestClass.CREATE_MODEL, "m"));
  expect(connection.hasModel("m")).toBe(true);
  connection.fetch(request(MultiThreadingRequestClass.EXECUTE, "m"));
  expect(newThread).toHaveBeenCalledTimes(1);

  connection.delete("m");

  expect(connection.hasModel("m")).toBe(false);
  await expect(
    connection.fetch(request(MultiThreadingRequestClass.EXECUTE, "m")),
  ).rejects.toThrow('model "m" is not loaded');
  expect(newThread).toHaveBeenCalledTimes(1);
});

test("the answer to a worker request goes back to its port, even for a model without a thread", async () => {
  const newThread = stubWorkers();
  const handleInput = vi.fn();
  const connection = new FragmentsConnection(handleInput, "worker.mjs");
  connection.fetch(request(MultiThreadingRequestClass.CREATE_MODEL, "m"));
  const [workerPort] = workerPorts;

  const answer = new Promise<any>((resolve) => {
    workerPort.onmessage = ({ data }) => {
      if (data.toMainThread) resolve(data);
    };
  });
  workerPort.postMessage({
    ...request(MultiThreadingRequestClass.RECOMPUTE_MESHES, "gone"),
    requestId: 7,
  });

  await expect(answer).resolves.toMatchObject({ requestId: 7 });
  expect(handleInput).toHaveBeenCalledWith(
    expect.objectContaining({ modelId: "gone" }),
  );
  expect(connection.hasModel("gone")).toBe(false);
  expect(newThread).toHaveBeenCalledTimes(1);
});
