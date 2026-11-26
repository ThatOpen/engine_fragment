// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { FragmentsModels } from "./index";
import { MultiThreadingRequestClass } from "./src/model/model-types";

// Delivers every message synchronously, so whatever the main thread does with
// one is promise callbacks only, all settled before the next macrotask.
function SyncMessageChannel() {
  const port1: any = { onmessage: null };
  const port2: any = { onmessage: null };
  port1.postMessage = (data: any) => port2.onmessage?.({ data });
  port2.postMessage = (data: any) => port1.onmessage?.({ data });
  return { port1, port2 };
}

const workers: { port?: any }[] = [];

// Stands in for the fragments worker: it takes the port the main thread hands
// it and answers every request on it (a created model answers with its
// bounding box). Replies to its own requests it leaves alone.
class FakeWorker {
  port?: any;

  constructor() {
    workers.push(this);
  }

  postMessage(port: any) {
    this.port = port;
    port.onmessage = ({ data }: { data: any }) => {
      if (data.toMainThread) return;
      port.postMessage({
        ...data,
        toMainThread: true,
        boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
      });
    };
  }

  terminate() {}
}

describe("a request from the worker of a disposed model", () => {
  beforeEach(() => {
    workers.length = 0;
    vi.stubGlobal("Worker", FakeWorker);
    vi.stubGlobal("MessageChannel", SyncMessageChannel);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Disposing the last model on a worker terminates it, but a mesh request the
  // worker posted just before still reaches the main thread. Replying to it
  // started a new worker only to deliver the reply; that worker threw
  // "handler is not a function" on a request id it never sent, and was never
  // terminated.
  test("does not start another worker", async () => {
    const fragments = new FragmentsModels("worker.mjs");
    fragments.settings.autoCoordinate = false;
    await fragments.load(new Uint8Array([1, 2, 3]), {
      modelId: "model",
      raw: true,
    });
    await fragments.disposeModel("model");

    workers[0].port.postMessage({
      class: MultiThreadingRequestClass.RECOMPUTE_MESHES,
      modelId: "model",
      list: [],
      requestId: 0,
    });
    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    expect(workers.length).toBe(1);
  });
});
