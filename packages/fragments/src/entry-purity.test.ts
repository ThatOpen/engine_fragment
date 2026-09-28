import { describe, expect, test } from "vitest";

// Issue #298: an app that only displays models must be able to import the
// package without evaluating the worker, which installs a global onmessage.

describe("package entry purity (issue #298)", () => {
  test("importing the entry installs no global message handler", async () => {
    expect((globalThis as any).onmessage).toBeUndefined();
    await import("./index");
    expect((globalThis as any).onmessage).toBeUndefined();
  }, 60000);

});
