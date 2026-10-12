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
import { buildMigrations } from "../../../../../vitest.migrations";
import { migrate } from "../../../../Migrations";
import { registry } from "../../../../Migrations/registry";
import { EditRequestType } from "../../../../Utils/edit/edit-types";
import { MultiThreadingRequestClass } from "../../model/model-types";
import { SingleThreadedFragmentsModel } from "../../single-threading";
import { isRawBuffer } from "../../utils/misc/buffer";
import { VirtualFragmentsModel } from "../../virtual-model";
import type { FragmentsThread } from "../fragments-thread";
import { ThreadModelCreator } from "./thread-model-creator";

// Issue #316: the worker migrates a file an older version wrote before it
// reads it, all of it on its own. It carries the gate and imports the code
// that migrates from a URL, for a file that is behind only.

const repoRoot = path.resolve(import.meta.dirname, "../../../../../../..");
const LATEST = registry.steps[registry.steps.length - 1].id;

const read = async (file: string) =>
  new Uint8Array(await readFile(path.join(repoRoot, file)));

// Converted with @thatopen/fragments@3.1.7: the layout changed since.
const layoutBehind = () =>
  read(
    "packages/fragments/src/Migrations/list/20251023113211_remove-alignments-and-geometries/fixtures/just_wall.3.1.7.frag",
  );

// The same, with two alignments, which only the editor can put back.
const withAlignments = () =>
  read(
    "packages/fragments/src/Migrations/list/20251023113211_remove-alignments-and-geometries/fixtures/alignment.3.1.7.frag",
  );

// Current layout, but written before files named their generator.
const contentBehind = () => read("resources/frags/small_test.frag");

/** The code as the package ships it: one file, bundled apart from the worker. */
let built: Awaited<ReturnType<typeof buildMigrations>>;
const models: VirtualFragmentsModel[] = [];

beforeAll(async () => {
  built = await buildMigrations();
}, 60000);

afterAll(() => built?.remove());

afterEach(() => {
  for (const model of models.splice(0)) model.dispose();
  vi.restoreAllMocks();
});

const newThread = () => {
  const stages: string[] = [];
  const thread = {
    actions: {} as Record<number, (input: any) => Promise<void>>,
    list: new Map<string, VirtualFragmentsModel>(),
    loading: new Set<string>(),
    aborting: new Set<string>(),
    controllerManager: { updater: { setUpdateDelay() {}, start() {} } },
    connection: {
      fetch: async (request: any) => {
        if (request.class === MultiThreadingRequestClass.LOAD_PROGRESS) {
          stages.push(request.stage);
        }
      },
    },
  };
  // eslint-disable-next-line no-new
  new ThreadModelCreator(thread as unknown as FragmentsThread);
  return { thread, stages };
};

/** Runs CREATE_MODEL the way the worker does, on a thread with no worker. */
const create = async (
  modelData: Uint8Array,
  {
    migrate: enabled,
    url = built.url,
    raw = isRawBuffer(modelData),
  }: { migrate?: boolean; url?: string | null; raw?: boolean } = {},
  { thread, stages } = newThread(),
) => {
  const input: any = {
    modelId: "model",
    modelData,
    raw,
    config: { migrate: enabled, migrationsURL: url ?? undefined },
  };
  await thread.actions[MultiThreadingRequestClass.CREATE_MODEL](input);
  const model = thread.list.get("model");
  if (model) models.push(model);
  return { input, model, stages, thread };
};

const nowhere = () => new URL("./nowhere.mjs", built.url).href;

describe("CREATE_MODEL on a file an older version wrote (issue #316)", () => {
  test("a file whose layout changed is migrated here, and then read", async () => {
    const { input, model, stages } = await create(await layoutBehind());
    expect(model!.getMetadata().revision).toBe(LATEST);
    expect(model!.getCategories()).toContain("IFCWALL");
    expect(input.boundingBox).toBeDefined();
    expect(stages.filter((stage) => stage === "migrating")).toHaveLength(2);

    // All the main thread gets is what was done: no file goes back to it.
    expect(input.modelData).toBeUndefined();
    expect(input.migration).toMatchObject({
      from: "20250710102015",
      to: LATEST,
    });
    expect(input.migration.applied.map((step: any) => step.id)).toEqual([
      "20251023113211",
      "20261011053212",
    ]);
    expect(input.migration.applied[0].report).toMatchObject({ assignedIds: 5 });
    // And it has to survive the way there.
    expect(structuredClone(input.migration)).toEqual(input.migration);
  }, 30000);

  test("a file that only lags on content is migrated the same way", async () => {
    const { input, model } = await create(await contentBehind());
    expect(model!.getMetadata()).toMatchObject({
      revision: LATEST,
      generator: "unknown",
    });
    expect(input.migration.applied.map((step: any) => step.id)).toEqual([
      "20261011053212",
    ]);
  }, 30000);

  test("what the migrations ask to edit is applied with the editor of the worker", async () => {
    const { input, model } = await create(await withAlignments());
    expect(model!.getAlignments()).toHaveLength(2);
    expect(model!.getMetadata().revision).toBe(LATEST);
    expect(input.migration.applied[0].report).toMatchObject({
      convertedAlignments: 2,
    });
  }, 30000);

  test("the result is the file migrate() gives", async () => {
    const source = await withAlignments();
    const expected = await migrate(source.slice(), { raw: true });
    const { model } = await create(source);
    const loaded = model!.getBuffer(true);
    expect(Buffer.from(loaded).equals(expected.bytes)).toBe(true);
  }, 30000);

  test("a file that is up to date is read without the code", async () => {
    const { bytes } = await migrate(await contentBehind());
    const { input, model, stages } = await create(bytes, { url: nowhere() });
    expect(input.migration).toBeUndefined();
    expect(stages).not.toContain("migrating");
    expect(model).toBeDefined();
  }, 30000);

  test("an abort that lands while the code is being imported stops the load", async () => {
    const { thread, stages } = newThread();
    const { fetch } = thread.connection;
    thread.connection.fetch = async (request: any) => {
      await fetch(request);
      // What ABORT_MODEL does for a load that is in flight.
      if (request.stage === "migrating" && thread.loading.has("model")) {
        thread.aborting.add("model");
      }
    };
    const aborted = create(await layoutBehind(), {}, { thread, stages });
    await expect(aborted).rejects.toThrow(/was aborted/);
    expect(thread.list.has("model")).toBe(false);
    expect(thread.aborting.has("model")).toBe(false);
    expect(thread.loading.has("model")).toBe(false);
  });

  test("a migration that fails on the file is answered as the error", async () => {
    // The root table says what the file is, the rest of it is gone.
    const whole = pako.inflate(await layoutBehind());
    const broken = whole.slice(0, Math.floor(whole.length / 2));
    const { input, model } = await create(broken, { raw: true });
    expect(model).toBeUndefined();
    expect(input.modelData).toBeUndefined();
    expect(input.migration.error).toMatchObject({
      name: "MigrationError",
      migration: "20251023113211",
      title: expect.any(String),
      reason: expect.any(String),
    });
  });

  describe("when the code cannot be imported, the file is refused", () => {
    test.each([
      ["whose layout changed", layoutBehind],
      ["that only lags on content", contentBehind],
    ])("a file %s, naming the URL", async (_, file) => {
      const url = nowhere();
      const { input, model } = await create(await file(), { url });
      expect(model).toBeUndefined();
      expect(input.modelData).toBeUndefined();
      expect(input.migration.error).toMatchObject({
        name: "MigrationsUnavailableError",
        url,
        reason: expect.any(String),
      });
    });

    test("and a file sent with no URL at all", async () => {
      const { input, model } = await create(await contentBehind(), {
        url: null,
      });
      expect(model).toBeUndefined();
      expect(input.migration.error).toEqual({
        name: "MigrationsUnavailableError",
      });
    });
  });

  describe("with migrating off", () => {
    test("a file that only lags on content is read as it is", async () => {
      const { input, model } = await create(await contentBehind(), {
        migrate: false,
      });
      expect(input.migration).toBeUndefined();
      expect(model!.getMetadata()).not.toHaveProperty("revision");
    }, 30000);

    test("a file whose layout changed is refused", async () => {
      const { input, model } = await create(await layoutBehind(), {
        migrate: false,
      });
      expect(model).toBeUndefined();
      expect(input.modelData).toBeUndefined();
      expect(input.migration.error).toMatchObject({
        name: "StaleFragmentsError",
        revision: "20250710102015",
      });
      expect(input.migration.error.pending[0]).toMatchObject({
        id: "20251023113211",
        rewrite: true,
      });
    });
  });

  test.each([
    ["on", undefined],
    ["off", false],
  ])(
    "a file from a newer version of the package is not read, migrating %s",
    async (_, enabled) => {
      const source = new SingleThreadedFragmentsModel(
        "m",
        await contentBehind(),
      );
      const data = { ...source.getMetadata(), revision: "99990101000000" };
      source.edit([
        { type: EditRequestType.UPDATE_METADATA, localId: 0, data },
      ]);
      const newer = source.save();
      source.dispose();

      // The gate is enough to tell, so nothing is imported for it.
      const refused = await create(newer, { migrate: enabled, url: null });
      expect(refused.model).toBeUndefined();
      expect(refused.input.modelData).toBeUndefined();
      expect(refused.input.migration.error).toMatchObject({
        name: "UnknownRevisionError",
        revision: "99990101000000",
        latest: LATEST,
      });
    },
  );
});
