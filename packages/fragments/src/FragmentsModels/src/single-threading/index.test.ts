import { readFile } from "fs/promises";
import * as path from "path";
import { afterEach, expect, test, vi } from "vitest";
import { SingleThreadedFragmentsModel } from ".";
import { LoadAbortedError } from "../model";
import { MeshConnection } from "../multithreading/mesh-connection";
import { VirtualTilesController } from "../virtual-model/virtual-controllers";

// Lifecycle tests for SingleThreadedFragmentsModel (issues #261 and #262):
// an awaitable, memoized `ready` promise for the setup the constructor
// starts, and a dispose() that stops every timer the constructor created.

const fragPath = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
  "resources",
  "frags",
  "small_test.frag",
);

const loadFrag = async () => new Uint8Array(await readFile(fragPath));

// Count live Timeout handles. Always measured from a setImmediate context so
// the measurement itself never runs inside a firing timer (which counts
// itself as active).
function countTimeouts(): Promise<number> {
  return new Promise((resolve) => {
    setImmediate(() =>
      resolve(
        (process as any)
          .getActiveResourcesInfo()
          .filter((x: string) => x === "Timeout").length,
      ),
    );
  });
}

// Cycle the event loop until the live Timeout count drops back to `floor`
// (or below), without owning a Timeout handle ourselves. Returns true if it
// drained within `maxMs`, false otherwise.
function timeoutsDrainTo(floor: number, maxMs: number): Promise<boolean> {
  const t0 = Date.now();
  return new Promise((resolve) => {
    const tick = async () => {
      const n = await countTimeouts();
      if (n <= floor) resolve(true);
      else if (Date.now() - t0 > maxMs) resolve(false);
      else setImmediate(tick);
    };
    setImmediate(tick);
  });
}

// Wait `ms` without creating a Timeout handle (keeps handle counts clean).
// Timers scheduled by the code under test still fire while we spin.
const spin = (ms: number) =>
  new Promise<void>((resolve) => {
    const t = Date.now();
    const tick = () => (Date.now() - t >= ms ? resolve() : setImmediate(tick));
    setImmediate(tick);
  });

afterEach(() => {
  vi.restoreAllMocks();
});

test("ready is a memoized promise: setup runs once and queries are stable across awaits (#261)", async () => {
  const generateSpy = vi.spyOn(VirtualTilesController.prototype, "generate");

  const model = new SingleThreadedFragmentsModel("m261", await loadFrag());
  try {
    // The public awaitable that was missing on unpatched main.
    expect(model.ready).toBeInstanceOf(Promise);
    // Memoized: the getter hands back the stored constructor promise, it
    // never re-runs the setup (a naive public setupData() forwarder would
    // re-append every sample into the tile buffers).
    expect(model.ready).toBe(model.ready);

    await model.ready;
    const idsAfterFirstAwait = model.getItemsIdsWithGeometry();
    expect(idsAfterFirstAwait.length).toBeGreaterThan(0);

    // Awaiting again must not re-trigger anything.
    await model.ready;
    const idsAfterSecondAwait = model.getItemsIdsWithGeometry();
    expect(idsAfterSecondAwait).toEqual(idsAfterFirstAwait);

    // Tile generation ran exactly once for this model.
    expect(generateSpy).toHaveBeenCalledTimes(1);
  } finally {
    model.dispose();
  }
});

test("dispose() right after construction stops the setup chain and every timer (#262)", async () => {
  const baseline = await countTimeouts();

  const uncaught: unknown[] = [];
  const onUncaught = (e: unknown) => uncaught.push(e);
  process.on("uncaughtException", onUncaught);
  try {
    const model = new SingleThreadedFragmentsModel("m262", await loadFrag());
    model.dispose();
    // Disposing twice is a no-op, not a crash.
    model.dispose();

    // The setup chain aborts at its next yield and the mesh-connection
    // interval never existed, so the process handle count returns to the
    // pre-construction baseline. On unpatched main the 64 ms interval
    // (and the surviving setup chain) keep this from ever draining.
    expect(await timeoutsDrainTo(baseline, 5000)).toBe(true);

    // No timer callback blew up while we watched (~350 ms is over five
    // ticks of the old 64 ms interval).
    await spin(350);
    expect(uncaught).toEqual([]);
  } finally {
    process.off("uncaughtException", onUncaught);
  }
});

test("ready rejects with LoadAbortedError after dispose(), and never as an unhandled rejection (#261 + #262)", async () => {
  const unhandled: unknown[] = [];
  const onUnhandled = (e: unknown) => unhandled.push(e);
  process.on("unhandledRejection", onUnhandled);
  try {
    // Observed: the awaited `ready` reports the abort.
    const observed = new SingleThreadedFragmentsModel(
      "m-observed",
      await loadFrag(),
    );
    observed.dispose();
    await expect(observed.ready).rejects.toBeInstanceOf(LoadAbortedError);

    // Unobserved: nobody awaits `ready`; the abort must be swallowed by the
    // internally attached handler instead of surfacing process-wide.
    const unobserved = new SingleThreadedFragmentsModel(
      "m-unobserved",
      await loadFrag(),
    );
    unobserved.dispose();
    await spin(300);
    expect(unhandled).toEqual([]);
  } finally {
    process.off("unhandledRejection", onUnhandled);
  }
});

test("MeshConnection without a connection starts no interval, throws nothing and accumulates nothing (#262)", async () => {
  const baseline = await countTimeouts();

  const uncaught: unknown[] = [];
  const onUncaught = (e: unknown) => uncaught.push(e);
  process.on("uncaughtException", onUncaught);
  try {
    const meshConnection = new MeshConnection("m", undefined);

    // No repeating timer was started for a connection-less instance. The
    // count may drop below the baseline if an unrelated runner timer expires
    // meanwhile, but it must never exceed it (on unpatched main the new
    // 64 ms interval makes it baseline + 1).
    expect(await countTimeouts()).toBeLessThanOrEqual(baseline);

    // Requests on the connection-less path are dropped instead of feeding an
    // unbounded list that nothing ever flushes; enough of them to trip the
    // over-threshold direct refresh() call site too. On unpatched main the
    // first refresh tick throws `Cannot read properties of undefined
    // (reading 'fetchMeshCompute')` inside the timer callback.
    for (let i = 0; i < 50; i++) {
      meshConnection.process({ modelId: "m", tileId: i });
    }
    expect((meshConnection as any)._list).toEqual([]);

    await spin(350);
    expect(uncaught).toEqual([]);

    meshConnection.dispose();
    meshConnection.dispose();
    expect(await countTimeouts()).toBeLessThanOrEqual(baseline);
  } finally {
    process.off("uncaughtException", onUncaught);
  }
});
