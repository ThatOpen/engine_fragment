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
// refuse to start when it cannot tell, and pass on what the worker answers:
// what was done, or why it could not.

/** A worker of the app's own, and the migration code the app serves with it. */
const OWN = ["w.mjs", { migrationsURL: "https://cdn.example/m.mjs" }] as const;

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
  const fragments = new FragmentsModels(...(args.length ? args : OWN));
  fragments.settings.autoCoordinate = false;
  const migrated: any[] = [];
  fragments.onModelMigrated.add((event) => migrated.push(event));
  const load = (config?: { migrate?: boolean; migrationsURL?: string }) =>
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

  describe("the worker is told the one URL to import the code from", () => {
    test("the migrationsURL option, and a load can say otherwise", async () => {
      const { fragments, created, load } = loadWith();
      await load();
      expect(created[0].config.migrationsURL).toBe(OWN[1].migrationsURL);
      await fragments.disposeModel("model");

      const migrationsURL = "https://static.example/other.mjs";
      await load({ migrationsURL });
      expect(created[1].config.migrationsURL).toBe(migrationsURL);
    });

    test("the bundled code for the bundled worker", async () => {
      const { created, load } = loadWith({}, undefined);
      await load();
      expect(created[0].config.migrationsURL).toBe(getBundledMigrationsUrl());
    });

    test("the code on unpkg for a worker from getWorker()", async () => {
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
      expect(created[0].config.migrationsURL).toBe(`${dist}/migrations.mjs`);
    });
  });

  describe("with a worker of the app's own and no migrationsURL", () => {
    const worker = "https://cdn.example/fragments/worker.mjs";

    test("load() rejects before anything is sent, whatever the file", async () => {
      const { fragments, created, migrated, load } = loadWith({}, worker);
      const sent = vi.mocked(FragmentsConnection.prototype.fetch);
      const error = await load().catch((e) => e);
      expect(error).toBeInstanceOf(MigrationsUnavailableError);
      expect(error.url).toBeUndefined();
      expect(error.message).toContain("migrationsURL");
      expect(error.message).toContain("autoMigrate");
      expect(sent).not.toHaveBeenCalled();
      expect(created).toEqual([]);
      expect(fragments.models.list.size).toBe(0);
      expect(migrated).toEqual([]);
    });

    test("with migrating off there is nothing to import, and it loads", async () => {
      const { fragments, created, load } = loadWith({}, worker);
      await load({ migrate: false });
      expect(created[0].config).toMatchObject({ migrate: false });
      expect(created[0].config.migrationsURL).toBeUndefined();
      await fragments.disposeModel("model");

      fragments.settings.autoMigrate = false;
      await load();
      expect(created).toHaveLength(2);
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

    test("the code that migrates could not be imported", async () => {
      const url = "https://cdn.example/migrations.mjs";
      const error = await refusedWith({
        name: "MigrationsUnavailableError",
        url,
        reason: "Failed to fetch dynamically imported module",
      });
      expect(error).toBeInstanceOf(MigrationsUnavailableError);
      expect(error.url).toBe(url);
      expect(error.message).toContain(url);
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
