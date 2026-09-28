import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { FragmentsModels } from "./index";

// Found while triaging #298: two FragmentsModels timers that dispose() could
// not reach. Neither is perpetual, but a disposed instance must own no timers.

describe("FragmentsModels.dispose() timers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("a mesh update event landing after dispose() does not re-arm the redraw timer", async () => {
    const fragments = new FragmentsModels("worker.mjs");
    await fragments.dispose();
    expect(vi.getTimerCount()).toBe(0);

    // The worker flushes a late tile batch; MeshManager fires its update event.
    (fragments.models as any)._onUpdate();

    expect(vi.getTimerCount()).toBe(0);
  });

  test("dispose() cancels the coalesced forced update and releases its awaiters", async () => {
    const fragments = new FragmentsModels("worker.mjs");
    // Inside the rate-limit window, so the forced call is coalesced.
    (fragments as any)._lastUpdate = performance.now();
    let released = false;
    const pending = fragments.update(true)!.then(() => {
      released = true;
    });
    expect(vi.getTimerCount()).toBe(1);

    await fragments.dispose();

    expect(vi.getTimerCount()).toBe(0);
    await pending;
    expect(released).toBe(true);
  });
});
