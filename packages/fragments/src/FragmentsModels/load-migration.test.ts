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
import { StaleFragmentsError, UnknownRevisionError } from "../Migrations";
import { MultiThreadingRequestClass } from "./src/model/model-types";
import { FragmentsConnection } from "./src/multithreading/fragments-connection";

// Issue #316: load() tells the app when the worker migrated the file, and
// turns the worker's refusal to read one into the error it stands for.

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
});

const box = { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } };

/** load() with the worker's answer to CREATE_MODEL given by the test. */
const loadWith = (answer: Record<string, unknown>) => {
  const created: any[] = [];
  vi.spyOn(FragmentsConnection.prototype, "fetch").mockImplementation(
    async (request: any) => {
      if (request.class === MultiThreadingRequestClass.CREATE_MODEL) {
        created.push(request);
        return { boundingBox: box, ...answer };
      }
      return {};
    },
  );
  // No worker holds the model, so there is none to tell about its disposal.
  vi.spyOn(FragmentsConnection.prototype, "delete").mockResolvedValue();
  const fragments = new FragmentsModels("worker.mjs");
  fragments.settings.autoCoordinate = false;
  const migrated: any[] = [];
  fragments.onModelMigrated.add((event) => migrated.push(event));
  const load = (config?: { migrate?: boolean }) =>
    fragments.load(new ArrayBuffer(8), {
      modelId: "model",
      raw: true,
      virtualModelConfig: config,
    });
  return { fragments, created, migrated, load };
};

describe("load() and migrations (issue #316)", () => {
  test("onModelMigrated tells what the worker did to the file", async () => {
    const migration = {
      from: "20250710102015",
      to: "20261011053212",
      applied: [{ id: "20251023113211", title: "t", report: { n: 1 } }],
    };
    const { migrated, load } = loadWith({ migration });
    await load();
    expect(migrated).toEqual([{ modelId: "model", ...migration }]);
  });

  test("a file that needed nothing triggers nothing", async () => {
    const { migrated, load } = loadWith({});
    await load();
    expect(migrated).toEqual([]);
  });

  test("the autoMigrate setting reaches the worker, and a load can override it", async () => {
    const { fragments, created, load } = loadWith({});
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

  test("a file the worker refused rejects with the error, and leaves no model", async () => {
    const pending = [{ id: "20251023113211", title: "t", rewrite: true }];
    const stale = loadWith({
      migration: {
        error: { name: "StaleFragmentsError", revision: "1", pending },
      },
    });
    const error = await stale.load().catch((e) => e);
    expect(error).toBeInstanceOf(StaleFragmentsError);
    expect(error).toMatchObject({ revision: "1", pending });
    expect(stale.fragments.models.list.has("model")).toBe(false);
    expect(stale.migrated).toEqual([]);

    vi.restoreAllMocks();
    const newer = loadWith({
      migration: {
        error: { name: "UnknownRevisionError", revision: "9", latest: "2" },
      },
    });
    const unknown = await newer.load().catch((e) => e);
    expect(unknown).toBeInstanceOf(UnknownRevisionError);
    expect(unknown).toMatchObject({ revision: "9", latest: "2" });
  });
});
