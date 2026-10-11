import { readFile } from "fs/promises";
import * as path from "path";
import { afterEach, describe, expect, test } from "vitest";
import { getRevision, migrate } from "../../../../Migrations";
import { registry } from "../../../../Migrations/registry";
import { prepare } from "../../../../Migrations/src/core";
import type { EditRequest } from "../../../../Utils/edit/edit-types";
import { EditRequestType } from "../../../../Utils/edit/edit-types";
import { MultiThreadingRequestClass } from "../../model/model-types";
import { SingleThreadedFragmentsModel } from "../../single-threading";
import { isRawBuffer } from "../../utils/misc/buffer";
import { VirtualFragmentsModel } from "../../virtual-model";
import type { FragmentsThread } from "../fragments-thread";
import { ThreadModelCreator } from "./thread-model-creator";

// Issue #316: the worker tells whether a file is behind, and nothing more.
// One that is goes back to the main thread, which has the code to migrate it.

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

const models: VirtualFragmentsModel[] = [];

afterEach(() => {
  for (const model of models.splice(0)) model.dispose();
});

const newThread = () => {
  const stages: string[] = [];
  const thread = {
    actions: {} as Record<number, (input: any) => Promise<void>>,
    list: new Map<string, VirtualFragmentsModel>(),
    loading: new Set<string>(),
    aborting: new Set<string>(),
    migrating: new Set<string>(),
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
  options: {
    migrate?: boolean;
    migrated?: boolean;
    requests?: EditRequest[];
  } = {},
  { thread, stages } = newThread(),
) => {
  const input: any = {
    modelId: "model",
    modelData,
    raw: isRawBuffer(modelData),
    config: { migrate: options.migrate },
    migrated: options.migrated,
    requests: options.requests,
  };
  await thread.actions[MultiThreadingRequestClass.CREATE_MODEL](input);
  const model = thread.list.get("model");
  if (model) models.push(model);
  return { input, model, stages, thread };
};

describe("CREATE_MODEL on a file an older version wrote (issue #316)", () => {
  test.each([
    ["whose layout changed", layoutBehind],
    ["that only lags on content", contentBehind],
  ])("a file %s is handed back, inflated, to be migrated", async (_, file) => {
    const { input, model, stages, thread } = await create(await file());
    expect(model).toBeUndefined();
    expect(input.migration).toEqual({ pending: true });
    expect(stages).toContain("migrating");
    // The answer moves the bytes back instead of copying them.
    expect(isRawBuffer(input.modelData)).toBe(true);
    expect(input.transferBack).toEqual([input.modelData.buffer]);
    expect(getRevision(input.modelData).pending.length).toBeGreaterThan(0);
    // The load is still in flight, so an abort has to find it.
    expect(thread.migrating.has("model")).toBe(true);
  });

  test("the migrated file comes back and is read without being asked again", async () => {
    const first = await create(await layoutBehind());
    // What the main thread does with it.
    const { bytes, requests } = await prepare(first.input.modelData);
    expect(requests).toEqual([]);
    const second = await create(bytes, { migrated: true, requests }, first);
    expect(second.input.migration).toBeUndefined();
    expect(second.thread.migrating.has("model")).toBe(false);
    expect(second.model!.getMetadata().revision).toBe(LATEST);
    expect(second.model!.getCategories()).toContain("IFCWALL");
    expect(second.input.boundingBox).toBeDefined();
  }, 30000);

  test("what the migrations ask to edit is applied here, where the editor is", async () => {
    const first = await create(await withAlignments());
    const { bytes, requests } = await prepare(first.input.modelData);
    // Two items to create, and the revision, which the file gets with them.
    expect(requests.map((request) => request.type)).toEqual([
      EditRequestType.CREATE_ITEM,
      EditRequestType.CREATE_ITEM,
      EditRequestType.UPDATE_METADATA,
    ]);

    const second = await create(bytes, { migrated: true, requests }, first);
    expect(second.model!.getAlignments()).toHaveLength(2);
    expect(second.model!.getMetadata().revision).toBe(LATEST);
    expect(second.stages.filter((stage) => stage === "migrating")).toHaveLength(
      2,
    );
  }, 30000);

  test("an abort that lands while the file is being migrated stops the load when it comes back", async () => {
    const first = await create(await contentBehind());
    // What ABORT_MODEL does for a load that is in flight.
    expect(first.thread.migrating.has("model")).toBe(true);
    first.thread.aborting.add("model");
    const { bytes } = await migrate(first.input.modelData, { raw: true });
    const second = create(bytes, { migrated: true }, first);
    await expect(second).rejects.toThrow(/was aborted/);
    expect(first.thread.list.has("model")).toBe(false);
    expect(first.thread.aborting.has("model")).toBe(false);
  });

  test("a file that is up to date is read as it is", async () => {
    const { bytes } = await migrate(await contentBehind());
    const { input, model, stages } = await create(bytes);
    expect(input.migration).toBeUndefined();
    expect(stages).not.toContain("migrating");
    expect(model).toBeDefined();
  }, 30000);

  test("with migrating off, a file that only lags on content is read as it is", async () => {
    const { input, model } = await create(await contentBehind(), {
      migrate: false,
    });
    expect(input.migration).toBeUndefined();
    expect(model!.getMetadata()).not.toHaveProperty("revision");
  }, 30000);

  test("with migrating off, a file whose layout changed is refused", async () => {
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

  test("a file from a newer version of the package is not read", async () => {
    const source = new SingleThreadedFragmentsModel("m", await contentBehind());
    const data = { ...source.getMetadata(), revision: "99990101000000" };
    source.edit([{ type: EditRequestType.UPDATE_METADATA, localId: 0, data }]);
    const newer = source.save();
    source.dispose();

    // Migrating is what says so, with the error itself.
    const handedBack = await create(newer);
    expect(handedBack.model).toBeUndefined();
    expect(handedBack.input.migration).toEqual({ pending: true });
    await expect(migrate(handedBack.input.modelData)).rejects.toThrow(
      /newer than this version/,
    );

    // With migrating off the worker has to refuse it on its own.
    const refused = await create(newer, { migrate: false });
    expect(refused.model).toBeUndefined();
    expect(refused.input.migration.error).toMatchObject({
      name: "UnknownRevisionError",
      revision: "99990101000000",
      latest: LATEST,
    });
  });
});
