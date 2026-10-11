import { readFile } from "fs/promises";
import * as path from "path";
import * as FB from "flatbuffers";
import pako from "pako";
import { describe, expect, test, vi } from "vitest";
import * as TFB from "../../Schema";
import { SingleThreadedFragmentsModel } from "../../FragmentsModels";
import { isRawBuffer } from "../../FragmentsModels/src/utils/misc/buffer";
import { VirtualFragmentsModel } from "../../FragmentsModels/src/virtual-model";
import { EditRequest, EditRequestType } from "../../Utils/edit/edit-types";
import { registry as packageRegistry } from "../registry";
import { inspect } from "./core";
import { defineMigration } from "./define";
import { MigrationError, UnknownRevisionError } from "./errors";
import { applyMigration, migrate } from "./migrate";
import { Migration, MigrationRegistry, MigrationStep } from "./types";

const repoRoot = path.resolve(import.meta.dirname, "../../../../..");
const schema = packageRegistry.steps.find(
  (step) => step.slug === "model-indexes",
)!.schema!;

// A deflated file with metadata `{ schema }` and no revision.
const file = async () =>
  new Uint8Array(
    await readFile(path.join(repoRoot, "resources/frags/small_test.frag")),
  );

const rawOf = (bytes: Uint8Array) =>
  isRawBuffer(bytes) ? bytes : pako.inflate(bytes);

const metadataOf = (bytes: Uint8Array) => {
  const model = TFB.Model.getRootAsModel(new FB.ByteBuffer(rawOf(bytes)));
  return JSON.parse(model.metadata()!);
};

const guidOf = (bytes: Uint8Array) =>
  TFB.Model.getRootAsModel(new FB.ByteBuffer(rawOf(bytes))).guid();

const setMetadata = (data: Record<string, unknown>): EditRequest => ({
  type: EditRequestType.UPDATE_METADATA,
  localId: 0,
  data,
});

/** A registry whose files start at step "10", like the ones under test. */
const registryOf = (
  ...migrations: Migration<any, any>[]
): MigrationRegistry => {
  const steps: MigrationStep[] = [{ id: "10", slug: "base", schema }];
  migrations.forEach((migration, index) => {
    steps.push({ id: String(20 + index * 10), slug: "step", migration });
  });
  return { steps, unstamped: "10" };
};

// Reads the metadata while the file is copied, and has `edit` rewrite it.
const tag = defineMigration({
  title: "Tag the metadata",
  context: () => ({ metadata: {} as Record<string, unknown> }),
  layout: {
    "Model.metadata": (model, ctx) => {
      ctx.metadata = JSON.parse(model.metadata);
      return model.metadata;
    },
  },
  edit: (ctx) => [setMetadata({ ...ctx.metadata, tagged: true })],
  report: (ctx) => ({ had: Object.keys(ctx.metadata) }),
});

describe("migrate", () => {
  test("a migration changes the file, stamps it and reports from its ctx", async () => {
    const registry = registryOf(tag);
    const input = await file();
    const result = await migrate(input, { registry });

    expect(result.from).toBe("10");
    expect(result.to).toBe("20");
    expect(result.applied).toEqual([
      { id: "20", title: "Tag the metadata", report: { had: ["schema"] } },
    ]);
    expect(metadataOf(result.bytes)).toMatchObject({
      tagged: true,
      revision: "20",
    });
    // The input was deflated, so is the output. And the input is untouched.
    expect(isRawBuffer(result.bytes)).toBe(false);
    expect(metadataOf(input)).not.toHaveProperty("revision");

    const again = await migrate(result.bytes, { registry });
    expect(again.applied).toEqual([]);
    expect(again.bytes).toBe(result.bytes);
    expect(again.from).toBe("20");
  });

  test("the output is raw when the input is, or when asked", async () => {
    const registry = registryOf(tag);
    const deflated = await file();
    const asked = await migrate(deflated, { registry, raw: true });
    expect(isRawBuffer(asked.bytes)).toBe(true);
    const raw = await migrate(pako.inflate(deflated), { registry });
    expect(isRawBuffer(raw.bytes)).toBe(true);
    expect(metadataOf(raw.bytes).revision).toBe("20");
  });

  test("a file no step has anything to do on is returned as it is", async () => {
    const idle = defineMigration({ title: "Nothing to do", edit: () => [] });
    const input = await file();
    const result = await migrate(input, { registry: registryOf(idle) });
    expect(result.bytes).toBe(input);
    expect(result.applied).toEqual([]);
    expect(result.to).toBe("10");
  });

  test("layout steps run before edit steps, whatever their order", async () => {
    const order: string[] = [];
    const first = defineMigration({
      title: "Edits",
      edit: () => {
        order.push("edit of the older step");
        return [];
      },
    });
    const second = defineMigration({
      title: "Renames the model",
      layout: {
        "Model.guid": () => {
          order.push("layout of the newer step");
          return "renamed";
        },
      },
    });
    const result = await migrate(await file(), {
      registry: registryOf(first, second),
    });
    expect(order).toEqual([
      "layout of the newer step",
      "edit of the older step",
    ]);
    expect(guidOf(result.bytes)).toBe("renamed");
    // Only the step that changed the file is listed.
    expect(result.applied).toEqual([{ id: "30", title: "Renames the model" }]);
    expect(metadataOf(result.bytes).revision).toBe("30");
  });

  test("an edit step alone changes the file, with no model built for it", async () => {
    const setup = vi.spyOn(VirtualFragmentsModel.prototype, "setupData");
    const blind = defineMigration({
      title: "Sets the metadata",
      context: () => ({ set: true }),
      edit: (ctx) => [setMetadata(ctx)],
    });
    const result = await migrate(await file(), { registry: registryOf(blind) });
    expect(metadataOf(result.bytes)).toEqual({ set: true, revision: "20" });
    expect(setup).not.toHaveBeenCalled();
    setup.mockRestore();
  });

  test("what the edit steps create gets the next ids of the file, in order", async () => {
    const create = (category: string) =>
      defineMigration({
        title: `Adds two ${category}`,
        edit: () =>
          ["A", "B"].map((name) => ({
            type: EditRequestType.CREATE_ITEM,
            data: { category, data: { Name: { value: name } } },
          })),
      });
    const input = await file();
    const before = new SingleThreadedFragmentsModel("before", input);
    const next = before.getMaxLocalId();
    before.dispose();

    const result = await migrate(input, {
      registry: registryOf(create("FIRST"), create("SECOND")),
    });
    const after = new SingleThreadedFragmentsModel("after", result.bytes);
    const added = after.getItemsOfCategories([/^(FIRST|SECOND)$/]);
    expect(added.FIRST).toEqual([next, next + 1]);
    expect(added.SECOND).toEqual([next + 2, next + 3]);
    expect(after.getMaxLocalId()).toBe(next + 4);
    expect(after.getMetadata().revision).toBe("30");
    after.dispose();
  });

  test("the layout step and the edit step of a migration share a ctx", async () => {
    const move = defineMigration({
      title: "Moves the guid into the metadata",
      context: () => ({ guid: "", metadata: {} }),
      layout: {
        "Model.guid": (model, ctx) => {
          ctx.guid = model.guid;
          ctx.metadata = JSON.parse(model.metadata);
          return "moved";
        },
      },
      edit: (ctx) => [setMetadata({ ...ctx.metadata, was: ctx.guid })],
      report: (ctx) => ({ guid: ctx.guid }),
    });
    const input = await file();
    const before = guidOf(input);
    const result = await migrate(input, { registry: registryOf(move) });
    expect(guidOf(result.bytes)).toBe("moved");
    expect(metadataOf(result.bytes)).toMatchObject({
      was: before,
      revision: "20",
    });
    expect(result.applied[0].report).toEqual({ guid: before });
  });

  test("a step can claim the files that predate it and carry no revision", async () => {
    const raw = rawOf(await file());
    const registry = registryOf(tag, tag);
    registry.unstamped = "30";
    // Nothing claims the file: it is past every step.
    expect(inspect(raw, registry).info.revision).toBe("30");

    const claimed = registryOf(tag, tag);
    claimed.unstamped = "30";
    claimed.steps[2].matchesUnstamped = () => true;
    const { info } = inspect(raw, claimed);
    expect(info).toMatchObject({
      revision: "20",
      stamped: false,
      latest: "30",
      readable: true,
    });
    expect(info.pending).toEqual([
      { id: "30", title: "Tag the metadata", rewrite: false },
    ]);
  });

  test("a file from a newer package is refused, not misread", async () => {
    const registry = registryOf(tag);
    const { bytes } = await migrate(await file(), { registry });
    const older = registryOf();
    await expect(migrate(bytes, { registry: older })).rejects.toThrow(
      UnknownRevisionError,
    );
    expect(() => inspect(rawOf(bytes), older)).toThrow(
      /newer than this version of the package/,
    );
  });

  test("a failing migration says which one, and nothing is returned", async () => {
    const broken = defineMigration({
      title: "Breaks",
      edit: () => {
        throw new Error("no");
      },
    });
    const run = migrate(await file(), { registry: registryOf(tag, broken) });
    await expect(run).rejects.toThrow(MigrationError);
    await expect(run).rejects.toThrow(/migration 30 \(Breaks\) failed. no/);
  });
});

describe("applyMigration", () => {
  test("leaves the edit of an app's migration pending on its model", async () => {
    const model = new SingleThreadedFragmentsModel("model", await file());
    // An app's migration reads the model it has.
    const own = defineMigration({
      title: "Tag the metadata",
      context: () => ({ had: [] as string[] }),
      edit: (ctx) => {
        const metadata = model.getMetadata();
        ctx.had = Object.keys(metadata);
        return [setMetadata({ ...metadata, tagged: true })];
      },
      report: (ctx) => ({ had: ctx.had }),
    });
    const { requests, report } = await applyMigration(model, own);
    expect(requests).toHaveLength(1);
    expect(report).toEqual({ had: ["schema"] });
    expect(model.getMetadata().tagged).toBe(true);
    expect(metadataOf(model.save())).toMatchObject({ tagged: true });
    model.dispose();
  });

  test("refuses a migration that changes the layout", async () => {
    const model = new SingleThreadedFragmentsModel("model", await file());
    const layout = defineMigration({ title: "Layout", layout: {} });
    await expect(applyMigration(model, layout)).rejects.toThrow(
      /cannot be applied to a model/,
    );
    model.dispose();
  });
});
