import { readFile } from "fs/promises";
import * as path from "path";
import { afterEach, describe, expect, test } from "vitest";
import { getRevision, migrate } from "../../../../Migrations";
import { registry } from "../../../../Migrations/registry";
import { EditRequestType } from "../../../../Utils/edit/edit-types";
import { MultiThreadingRequestClass } from "../../model/model-types";
import { SingleThreadedFragmentsModel } from "../../single-threading";
import { isRawBuffer } from "../../utils/misc/buffer";
import { VirtualFragmentsModel } from "../../virtual-model";
import type { FragmentsThread } from "../fragments-thread";
import { ThreadModelCreator } from "./thread-model-creator";

// Issue #316: the worker migrates a file an older version of the package
// wrote before it reads it, and tells the main thread what it did.

const repoRoot = path.resolve(import.meta.dirname, "../../../../../../..");
const LATEST = registry.steps[registry.steps.length - 1].id;

const read = async (file: string) =>
  new Uint8Array(await readFile(path.join(repoRoot, file)));

// Converted with @thatopen/fragments@3.1.7: the layout changed since.
const layoutBehind = () =>
  read(
    "packages/fragments/src/Migrations/list/20251023113211_remove-alignments-and-geometries/fixtures/just_wall.3.1.7.frag",
  );

// Current layout, but written before files named their generator.
const contentBehind = () => read("resources/frags/small_test.frag");

const models: VirtualFragmentsModel[] = [];

afterEach(() => {
  for (const model of models.splice(0)) model.dispose();
});

/** Runs CREATE_MODEL the way the worker does, on a thread with no worker. */
const create = async (
  modelData: Uint8Array,
  config?: { migrate?: boolean },
) => {
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
  const raw = isRawBuffer(modelData);
  const input: any = { modelId: "model", modelData, raw, config };
  await thread.actions[MultiThreadingRequestClass.CREATE_MODEL](input);
  const model = thread.list.get("model");
  if (model) models.push(model);
  return { input, model, stages };
};

describe("CREATE_MODEL on a file an older version wrote (issue #316)", () => {
  test("a file whose layout changed is migrated, then read", async () => {
    const { input, model, stages } = await create(await layoutBehind());
    expect(input.migration).toMatchObject({
      from: "20250710102015",
      to: LATEST,
    });
    expect(input.migration.applied.map((step: any) => step.id)).toEqual([
      "20251023113211",
      "20261011053212",
    ]);
    expect(stages).toContain("migrating");
    // What the worker holds is the migrated file.
    expect(model!.getMetadata().revision).toBe(LATEST);
    expect(model!.getCategories()).toContain("IFCWALL");
    expect(input.boundingBox).toBeDefined();
    expect(input.modelData).toBeUndefined();
  }, 30000);

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

  test("a file from a newer version of the package is refused", async () => {
    const source = new SingleThreadedFragmentsModel("m", await contentBehind());
    const data = { ...source.getMetadata(), revision: "99990101000000" };
    source.edit([{ type: EditRequestType.UPDATE_METADATA, localId: 0, data }]);
    const newer = source.save();
    source.dispose();
    expect(() => getRevision(newer)).toThrow(/newer than this version/);

    const { input, model } = await create(newer);
    expect(model).toBeUndefined();
    expect(input.migration.error).toEqual({
      name: "UnknownRevisionError",
      revision: "99990101000000",
      latest: LATEST,
    });
  });
});
