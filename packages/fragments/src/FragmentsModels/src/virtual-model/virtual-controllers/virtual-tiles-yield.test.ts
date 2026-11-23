import { afterEach, describe, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Pako from "pako";
import { VirtualFragmentsModel } from "../virtual-fragments-model";

// Tile generation used to yield the worker with setTimeout(0) about twenty
// times per model. Browsers clamp nested timers to 4 ms, so every load waited
// 60-80 ms even when generating took a millisecond, as for the delta model
// the editor loads after every edit. It now yields once at the start (so a
// load can be aborted before it generates) and then only after a time
// budget, still reporting progress and checking for aborts at every step.

const FRAG = fileURLToPath(
  new URL(
    "../../../../../../../resources/frags/school_arq.frag",
    import.meta.url,
  ),
);

const model = () => {
  const connection: any = { fetch: async () => {}, fetchMeshCompute: () => {} };
  const inflated = Pako.inflate(readFileSync(FRAG));
  const data = inflated.buffer.slice(
    inflated.byteOffset,
    inflated.byteOffset + inflated.byteLength,
  );
  return new VirtualFragmentsModel("m", data, connection, {
    multithreading: { meshConnectionThreshold: 0, meshConnectionRate: 0 },
  });
};

/** Timer yields made while generating tiles. */
const countYields = () => {
  const original = globalThis.setTimeout;
  let yields = 0;
  vi.spyOn(globalThis, "setTimeout").mockImplementation(((
    handler: (...args: any[]) => void,
    timeout?: number,
    ...args: any[]
  ) => {
    if (!timeout) yields++;
    return original(handler, timeout, ...args);
  }) as typeof setTimeout);
  return () => yields;
};

afterEach(() => vi.restoreAllMocks());

describe("tile generation yields", () => {
  test("a model generated within the budget yields only once", async () => {
    const virtual = model();
    vi.spyOn(performance, "now").mockReturnValue(1000);
    const yields = countYields();
    const progress: number[] = [];
    let abortChecks = 0;
    await virtual.setupData(
      (value) => progress.push(value),
      () => abortChecks++,
    );
    expect(yields()).toBe(1);
    expect(progress.length).toBeGreaterThan(1);
    expect(abortChecks).toBe(progress.length);
  });

  test("a slow generation still yields, so an abort gets through", async () => {
    const virtual = model();
    let now = 0;
    // Every step takes longer than the budget.
    vi.spyOn(performance, "now").mockImplementation(() => (now += 20));
    const yields = countYields();
    let checks = 0;
    await expect(
      virtual.setupData(undefined, () => {
        if (++checks === 3) throw new Error("aborted");
      }),
    ).rejects.toThrow("aborted");
    expect(yields()).toBe(3);
  });
});
