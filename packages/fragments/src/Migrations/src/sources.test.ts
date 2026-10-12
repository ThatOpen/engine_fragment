import { afterEach, describe, expect, test, vi } from "vitest";
import { getBundledMigrationsUrl } from "../../bundled-worker-url";
import { setWorkerSource } from "../../Utils/worker-source";
import { getMigrationSources } from "./sources";

// Issue #316: the worker imports the migration code from a URL, and the main
// thread is the one that knows where the worker came from.

const bundled = getBundledMigrationsUrl();

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("where the worker is told to look for the migration code (issue #316)", () => {
  test("the package bundles it next to its worker", () => {
    expect(bundled).toMatch(/^file:.*\/Worker\/migrations\.mjs$/);
  });

  test("without a worker URL the worker is the bundled one, and so is the code", () => {
    expect(getMigrationSources({})).toEqual([bundled]);
  });

  test("a worker with an address has it next to it, and the bundled one after", () => {
    const workerURL = "https://cdn.example/fragments/worker.mjs";
    expect(getMigrationSources({ workerURL })).toEqual([
      "https://cdn.example/fragments/migrations.mjs",
      bundled,
    ]);
  });

  test("a minified worker goes with the minified code", () => {
    const workerURL = "https://cdn.example/fragments/worker.min.mjs?v=3";
    expect(getMigrationSources({ workerURL })[0]).toBe(
      "https://cdn.example/fragments/migrations.min.mjs",
    );
  });

  test("a relative worker URL is resolved the way the page resolves it", () => {
    vi.stubGlobal("document", { baseURI: "https://app.example/viewer/" });
    expect(getMigrationSources({ workerURL: "assets/worker.mjs" })[0]).toBe(
      "https://app.example/viewer/assets/migrations.mjs",
    );
    // With nothing to resolve it against, there is no telling where it is.
    vi.unstubAllGlobals();
    expect(getMigrationSources({ workerURL: "assets/worker.mjs" })).toEqual([
      bundled,
    ]);
  });

  test("a blob tells nothing, unless this package made it", () => {
    const unknown = "blob:https://app.example/1b9d6bcd";
    expect(getMigrationSources({ workerURL: unknown })).toEqual([bundled]);

    // What getWorker() does with the worker it fetches from unpkg.
    const fetched = "blob:https://app.example/7c9e6679";
    setWorkerSource(
      fetched,
      "https://unpkg.com/@thatopen/fragments@3.4.8/dist/Worker/worker.mjs",
    );
    const onUnpkg =
      "https://unpkg.com/@thatopen/fragments@3.4.8/dist/Worker/migrations.mjs";
    expect(getMigrationSources({ workerURL: fetched })).toEqual([
      onUnpkg,
      bundled,
    ]);

    // And toClassicWorker() with that one: a blob made from a blob.
    const classic = "blob:https://app.example/3f2504e0";
    setWorkerSource(classic, fetched);
    expect(getMigrationSources({ workerURL: classic })[0]).toBe(onUnpkg);
  });

  test("the URL the app gives is the only one tried, made absolute", () => {
    const workerURL = "https://cdn.example/fragments/worker.mjs";
    const given = "https://static.example/migrations-1f3a.mjs";
    expect(getMigrationSources({ workerURL, migrationsURL: given })).toEqual([
      given,
    ]);

    vi.stubGlobal("document", { baseURI: "https://app.example/viewer/" });
    const relative = getMigrationSources({ migrationsURL: "/m.mjs" });
    expect(relative).toEqual(["https://app.example/m.mjs"]);
  });
});
