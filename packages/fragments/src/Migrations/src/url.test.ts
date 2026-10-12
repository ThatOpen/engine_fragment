import { afterEach, describe, expect, test, vi } from "vitest";
import {
  getBundledMigrationsUrl,
  getBundledWorkerUrl,
} from "../../bundled-worker-url";
import { setWorkerMigrationsUrl } from "../../Utils/worker-migrations";
import { toClassicWorker } from "../../Utils/worker-utils";
import { resolveMigrationsUrl } from "./url";

// Issue #316: the worker imports the migration code from one URL, which the
// main thread works out. Where it cannot, there is none, and no guess.

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the URL the worker is told to import the migration code from (issue #316)", () => {
  test("the package bundles the code next to its worker", () => {
    const worker = getBundledWorkerUrl();
    expect(worker).toMatch(/^file:.*\/Worker\/worker\.mjs$/);
    expect(getBundledMigrationsUrl()).toBe(
      new URL("./migrations.mjs", worker).href,
    );
  });

  test("with no worker URL the worker is the bundled one, and so is the code", () => {
    expect(resolveMigrationsUrl({})).toBe(getBundledMigrationsUrl());
  });

  test("a worker the app serves itself has none", () => {
    for (const workerURL of [
      "worker.mjs",
      "https://cdn.example/fragments/worker.mjs",
      "blob:https://app.example/1b9d6bcd",
    ]) {
      expect(resolveMigrationsUrl({ workerURL })).toBeUndefined();
    }
  });

  test("a worker this package located comes with its own, and keeps it as a classic worker", async () => {
    // What getWorker() does with the worker it fetches from unpkg.
    const workerURL = "blob:https://app.example/7c9e6679";
    const onUnpkg =
      "https://unpkg.com/@thatopen/fragments@3.4.8/dist/Worker/migrations.mjs";
    setWorkerMigrationsUrl(workerURL, onUnpkg);
    expect(resolveMigrationsUrl({ workerURL })).toBe(onUnpkg);

    vi.stubGlobal("fetch", async () => new Response("export {};"));
    const classic = await toClassicWorker(workerURL);
    expect(classic).not.toBe(workerURL);
    expect(resolveMigrationsUrl({ workerURL: classic })).toBe(onUnpkg);

    // One made from a worker of the app's own still has none.
    const own = await toClassicWorker("https://cdn.example/worker.mjs");
    expect(resolveMigrationsUrl({ workerURL: own })).toBeUndefined();
  });

  test("the URL the app gives wins, and is made absolute for the worker", () => {
    const workerURL = "blob:https://app.example/7c9e6679";
    const given = "https://static.example/migrations-1f3a.mjs";
    expect(resolveMigrationsUrl({ migrationsURL: given })).toBe(given);
    expect(resolveMigrationsUrl({ workerURL, migrationsURL: given })).toBe(
      given,
    );

    vi.stubGlobal("document", { baseURI: "https://app.example/viewer/" });
    expect(resolveMigrationsUrl({ migrationsURL: "assets/m.mjs" })).toBe(
      "https://app.example/viewer/assets/m.mjs",
    );
    // With nothing to resolve it against, it goes as it is.
    vi.unstubAllGlobals();
    expect(resolveMigrationsUrl({ migrationsURL: "assets/m.mjs" })).toBe(
      "assets/m.mjs",
    );
  });
});
