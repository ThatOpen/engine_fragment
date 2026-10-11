import { readFile } from "fs/promises";
import * as path from "path";
import pako from "pako";
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
  StaleFragmentsError,
  UnknownRevisionError,
  getRevision,
} from "../Migrations";
import { registry } from "../Migrations/registry";
import { applyRequests } from "../Migrations/src/apply";
import { EditRequestType } from "../Utils/edit/edit-types";
import { MultiThreadingRequestClass } from "./src/model/model-types";
import { SingleThreadedFragmentsModel } from "./src/single-threading";
import { FragmentsConnection } from "./src/multithreading/fragments-connection";

// Issue #316: the worker tells load() that a file is behind and hands it
// back. load() migrates it, with code it only loads then, sends it again and
// tells the app what was done.

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const LATEST = registry.steps[registry.steps.length - 1].id;
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

// Converted with @thatopen/fragments@3.1.7, inflated as the worker hands it back.
const stale = async (name = "just_wall") => {
  const file = path.join(
    repoRoot,
    "packages/fragments/src/Migrations/list/20251023113211_remove-alignments-and-geometries/fixtures",
    `${name}.3.1.7.frag`,
  );
  return pako.inflate(new Uint8Array(await readFile(file)));
};

/**
 * load() against a worker that answers CREATE_MODEL the way the test says:
 * the first time with `answer`, and with a model once the file was migrated.
 */
const loadWith = (answer: Record<string, unknown>) => {
  const created: any[] = [];
  const transferred: any[] = [];
  vi.spyOn(FragmentsConnection.prototype, "fetch").mockImplementation(
    async (request: any, content?: any[]) => {
      if (request.class !== MultiThreadingRequestClass.CREATE_MODEL) {
        return {};
      }
      created.push(request);
      transferred.push(content);
      return request.migrated
        ? { boundingBox: box }
        : { boundingBox: box, ...answer };
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
  return { fragments, created, transferred, migrated, load };
};

describe("load() and migrations (issue #316)", () => {
  test("a file the worker hands back is migrated, sent again, and reported", async () => {
    const modelData = await stale();
    const { created, transferred, migrated, load } = loadWith({
      migration: { pending: true },
      modelData,
    });
    await load();

    expect(created).toHaveLength(2);
    const [, again] = created;
    // What goes back is raw, at the newest revision, and moved, not copied.
    expect(again).toMatchObject({ raw: true, migrated: true, requests: [] });
    expect(getRevision(again.modelData)).toMatchObject({
      revision: LATEST,
      stamped: true,
      pending: [],
    });
    expect(transferred[1]).toEqual([again.modelData.buffer]);

    expect(migrated).toHaveLength(1);
    expect(migrated[0]).toMatchObject({
      modelId: "model",
      from: "20250710102015",
      to: LATEST,
    });
    expect(migrated[0].applied.map((step: any) => step.id)).toEqual([
      "20251023113211",
      "20261011053212",
    ]);
    expect(migrated[0].applied[0].report).toMatchObject({ assignedIds: 5 });
  });

  test("what the migrations ask to edit goes back with the file, for the worker to apply", async () => {
    // This one has two alignments, which become items through the editor.
    const { created, migrated, load } = loadWith({
      migration: { pending: true },
      modelData: await stale("alignment"),
    });
    await load();

    const [, again] = created;
    expect(again.requests).toHaveLength(3);
    // The main thread did the copies and left the edit: the alignments are
    // items once the worker has applied it.
    const alignmentsIn = (bytes: Uint8Array) => {
      const model = new SingleThreadedFragmentsModel("m", bytes, true);
      const ids = model.getItemsOfCategories([/^ThatOpenAlignment$/]);
      model.dispose();
      return ids.ThatOpenAlignment ?? [];
    };
    expect(alignmentsIn(again.modelData)).toHaveLength(0);
    const applied = applyRequests(again.modelData, again.requests);
    expect(alignmentsIn(applied)).toHaveLength(2);
    expect(getRevision(applied)).toMatchObject({
      revision: LATEST,
      pending: [],
    });
    expect(migrated[0].applied[0].report).toMatchObject({
      convertedAlignments: 2,
    });
  });

  test("a file that needed nothing is sent once and triggers nothing", async () => {
    const { created, migrated, load } = loadWith({});
    await load();
    expect(created).toHaveLength(1);
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
    const refused = loadWith({
      migration: {
        error: { name: "StaleFragmentsError", revision: "1", pending },
      },
    });
    const error = await refused.load().catch((e) => e);
    expect(error).toBeInstanceOf(StaleFragmentsError);
    expect(error).toMatchObject({ revision: "1", pending });
    expect(refused.fragments.models.list.has("model")).toBe(false);
    expect(refused.migrated).toEqual([]);

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

  test("a file from a newer version rejects with the error, and is not sent again", async () => {
    const file = path.join(repoRoot, "resources/frags/small_test.frag");
    const source = new SingleThreadedFragmentsModel(
      "source",
      new Uint8Array(await readFile(file)),
    );
    const data = { ...source.getMetadata(), revision: "99990101000000" };
    source.edit([{ type: EditRequestType.UPDATE_METADATA, localId: 0, data }]);
    const newer = source.save();
    source.dispose();

    const { fragments, created, load } = loadWith({
      migration: { pending: true },
      modelData: newer,
    });
    const error = await load().catch((e) => e);
    expect(error).toBeInstanceOf(UnknownRevisionError);
    expect(error).toMatchObject({ revision: "99990101000000", latest: LATEST });
    expect(created).toHaveLength(1);
    expect(fragments.models.list.has("model")).toBe(false);
  });
});
