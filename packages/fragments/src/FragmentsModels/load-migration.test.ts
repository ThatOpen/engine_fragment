import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { FragmentsModels } from "./index";
import {
  MigrationError,
  MigrationsUnavailableError,
  StaleFragmentsError,
  UnknownRevisionError,
} from "../Migrations";
import { getBundledMigrationsUrl } from "../bundled-worker-url";
import { FRAGMENTS_VERSION } from "../Utils";
import { MultiThreadingRequestClass } from "./src/model/model-types";
import { FragmentsConnection } from "./src/multithreading/fragments-connection";

// Issue #316: the worker migrates a file that is behind, on its own. What
// load() does about it is tell the worker where the code that migrates is,
// and pass on what the worker answers: what was done, or why it could not.

const realWindow = (globalThis as any).window;

beforeAll(() => {
  // ViewManager reads window for the viewport size.
  (globalThis as any).window = {
    innerWidth: 1920,
    innerHeight: 1080,
    screen: { width: 1920, height: 1080 },
    devicePixelRatio: 1,
  };
});

afterAll(() => {
  (globalThis as any).window = realWindow;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const box = { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } };

/** load() against a worker that answers CREATE_MODEL the way the test says. */
const loadWith = (
  answer: Record<string, unknown> = {},
  ...args: ConstructorParameters<typeof FragmentsModels>
) => {
  const created: any[] = [];
  vi.spyOn(FragmentsConnection.prototype, "fetch").mockImplementation(
    async (request: any) => {
      if (request.class !== MultiThreadingRequestClass.CREATE_MODEL) {
        return {};
      }
      created.push(request);
      return { boundingBox: box, ...answer };
    },
  );
  // No worker holds the model, so there is none to tell about its disposal.
  vi.spyOn(FragmentsConnection.prototype, "delete").mockResolvedValue();
  const fragments = new FragmentsModels(...(args.length ? args : ["w.mjs"]));
  fragments.settings.autoCoordinate = false;
  const migrated: any[] = [];
  fragments.onModelMigrated.add((event) => migrated.push(event));
  const load = (config?: { migrate?: boolean; migrationSources?: string[] }) =>
    fragments.load(new ArrayBuffer(8), {
      modelId: "model",
      raw: true,
      virtualModelConfig: config,
    });
  return { fragments, created, migrated, load };
};

describe("load() and migrations (issue #316)", () => {
  test("what the worker did to a file is reported, and the file is sent once", async () => {
    const applied = [
      { id: "20251023113211", title: "t", report: { assignedIds: 5 } },
    ];
    const migration = { from: "20250710102015", to: "20261011053212", applied };
    const { created, migrated, load } = loadWith({ migration });
    await load();
    expect(created).toHaveLength(1);
    expect(migrated).toEqual([{ modelId: "model", ...migration }]);
  });

  test("a file that needed nothing triggers nothing", async () => {
    const { created, migrated, load } = loadWith();
    await load();
    expect(created).toHaveLength(1);
    expect(migrated).toEqual([]);
  });

  test("the autoMigrate setting reaches the worker, and a load can override it", async () => {
    const { fragments, created, load } = loadWith();
    await load();
    expect(created[0].config.migrate).toBe(true);
    await fragments.disposeModel("model");

    fragments.settings.autoMigrate = false;
    await load();
    expect(created[1].config.migrate).toBe(false);
    await fragments.disposeModel("model");

    await load({ migrate: true });
    expect(created[2].config.migrate).toBe(true);
  });

  describe("where the worker is told to look for the code", () => {
    const bundled = getBundledMigrationsUrl();

    test("next to the worker, then where the package bundles it", async () => {
      const worker = "https://cdn.example/fragments/worker.mjs";
      const { created, load } = loadWith({}, worker);
      await load();
      expect(created[0].config.migrationSources).toEqual([
        "https://cdn.example/fragments/migrations.mjs",
        bundled,
      ]);
    });

    test("only the bundled one for the bundled worker", async () => {
      const { created, load } = loadWith({}, undefined);
      await load();
      expect(created[0].config.migrationSources).toEqual([bundled]);
    });

    test("on unpkg for a worker from getWorker()", async () => {
      const fetched: string[] = [];
      vi.stubGlobal("fetch", async (url: string) => {
        fetched.push(url);
        return new Response("export {};");
      });
      const worker = await FragmentsModels.getWorker();
      expect(worker).toMatch(/^blob:/);
      const dist = `https://unpkg.com/@thatopen/fragments@${FRAGMENTS_VERSION}/dist/Worker`;
      expect(fetched).toEqual([`${dist}/worker.mjs`]);

      const { created, load } = loadWith({}, worker);
      await load();
      expect(created[0].config.migrationSources).toEqual([
        `${dist}/migrations.mjs`,
        bundled,
      ]);
    });

    test("only where the migrationsURL option says, when it is set", async () => {
      const migrationsURL = "https://static.example/migrations-1f3a.mjs";
      const { fragments, created, load } = loadWith({}, "w.mjs", {
        migrationsURL,
      });
      await load();
      expect(created[0].config.migrationSources).toEqual([migrationsURL]);
      await fragments.disposeModel("model");

      // And a load can say otherwise.
      const migrationSources = ["https://static.example/other.mjs"];
      await load({ migrationSources });
      expect(created[1].config.migrationSources).toEqual(migrationSources);
    });
  });

  describe("a file the worker could not read rejects with the error, and leaves no model", () => {
    const pending = [{ id: "20251023113211", title: "t", rewrite: true }];

    const refusedWith = async (error: Record<string, unknown>) => {
      const { fragments, migrated, load } = loadWith({ migration: { error } });
      const thrown = await load().catch((e) => e);
      expect(fragments.models.list.has("model")).toBe(false);
      expect(migrated).toEqual([]);
      return thrown;
    };

    test("its layout changed and migrating is off", async () => {
      const error = await refusedWith({
        name: "StaleFragmentsError",
        revision: "1",
        pending,
      });
      expect(error).toBeInstanceOf(StaleFragmentsError);
      expect(error).toMatchObject({ revision: "1", pending });
    });

    test("it is newer than the package", async () => {
      const error = await refusedWith({
        name: "UnknownRevisionError",
        revision: "9",
        latest: "2",
      });
      expect(error).toBeInstanceOf(UnknownRevisionError);
      expect(error).toMatchObject({ revision: "9", latest: "2" });
    });

    test("the code that migrates could not be loaded", async () => {
      const sources = ["https://cdn.example/migrations.mjs"];
      const error = await refusedWith({
        name: "MigrationsUnavailableError",
        revision: "1",
        sources,
        reason: "https://cdn.example/migrations.mjs: Failed to fetch",
      });
      expect(error).toBeInstanceOf(MigrationsUnavailableError);
      expect(error).toMatchObject({ revision: "1", sources });
      expect(error.message).toContain("migrationsURL");
      expect(error.message).toContain("Failed to fetch");
    });

    test("a migration failed on it", async () => {
      const error = await refusedWith({
        name: "MigrationError",
        migration: "20251023113211",
        title: "Alignments become items",
        reason: "Offset is outside the bounds of the DataView",
      });
      expect(error).toBeInstanceOf(MigrationError);
      expect(error).toMatchObject({
        migration: "20251023113211",
        title: "Alignments become items",
      });
      // The message a failed migrate() gives for the same file.
      expect(error.message).toBe(
        "Fragments: migration 20251023113211 (Alignments become items) failed. Offset is outside the bounds of the DataView",
      );
    });
  });
});
