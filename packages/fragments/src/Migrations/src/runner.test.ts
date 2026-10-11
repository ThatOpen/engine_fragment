import { readFile } from "fs/promises";
import * as path from "path";
import * as FB from "flatbuffers";
import pako from "pako";
import { describe, expect, test, vi } from "vitest";
import * as TFB from "../../Schema";
import { SingleThreadedFragmentsModel } from "../../FragmentsModels";
import { VirtualFragmentsModel } from "../../FragmentsModels/src/virtual-model";
import { isRawBuffer } from "../../FragmentsModels/src/utils/misc/buffer";
import { EditRequest, EditRequestType } from "../../Utils/edit/edit-types";
import { registry as packageRegistry } from "../registry";
import { defineMigration } from "./define";
import { MigrationError, UnknownRevisionError } from "./errors";
import { applyMigration, getRevision, migrate } from "./runner";
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

const metadataOf = (bytes: Uint8Array) => {
  const raw = isRawBuffer(bytes) ? bytes : pako.inflate(bytes);
  const model = TFB.Model.getRootAsModel(new FB.ByteBuffer(raw));
  return JSON.parse(model.metadata()!);
};

const guidOf = (bytes: Uint8Array) => {
  const raw = isRawBuffer(bytes) ? bytes : pako.inflate(bytes);
  return TFB.Model.getRootAsModel(new FB.ByteBuffer(raw)).guid();
};

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

const tag = defineMigration({
  title: "Tag the metadata",
  context: () => ({ keys: [] as string[] }),
  edit: (model, ctx) => {
    const metadata = model.getMetadata();
    ctx.keys = Object.keys(metadata);
    return [setMetadata({ ...metadata, tagged: true })];
  },
  report: (ctx) => ({ had: ctx.keys }),
});

describe("migrate", () => {
  test("an edit step changes the file, stamps it and reports from its ctx", async () => {
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
    const seen: (string | null)[] = [];
    const first = defineMigration({
      title: "Reads the guid",
      edit: (model) => {
        seen.push(guidOf(new Uint8Array(model.getBuffer(true))));
        return [];
      },
    });
    const second = defineMigration({
      title: "Renames the model",
      layout: { "Model.guid": () => "renamed" },
    });
    const result = await migrate(await file(), {
      registry: registryOf(first, second),
    });
    expect(seen).toEqual(["renamed"]);
    expect(guidOf(result.bytes)).toBe("renamed");
    // Only the step that changed the file is listed.
    expect(result.applied).toEqual([{ id: "30", title: "Renames the model" }]);
    expect(metadataOf(result.bytes).revision).toBe("30");
  });

  test("an edit step builds a model only if it reads from it", async () => {
    const setup = vi.spyOn(VirtualFragmentsModel.prototype, "setupData");
    const blind = defineMigration({
      title: "Sets the metadata without looking",
      edit: () => [setMetadata({ set: true })],
    });
    const result = await migrate(await file(), { registry: registryOf(blind) });
    expect(metadataOf(result.bytes)).toEqual({ set: true, revision: "20" });
    expect(setup).not.toHaveBeenCalled();

    // `tag` reads the metadata of the model.
    await migrate(await file(), { registry: registryOf(tag) });
    expect(setup).toHaveBeenCalledTimes(1);
    setup.mockRestore();
  });

  test("what an edit step creates gets the next ids of the file", async () => {
    const create = defineMigration({
      title: "Adds two items",
      edit: () =>
        ["A", "B"].map((name) => ({
          type: EditRequestType.CREATE_ITEM,
          data: { category: "ADDED", data: { Name: { value: name } } },
        })),
    });
    const input = await file();
    const before = new SingleThreadedFragmentsModel("before", input);
    const next = before.getMaxLocalId();
    before.dispose();

    const result = await migrate(input, { registry: registryOf(create) });
    const after = new SingleThreadedFragmentsModel("after", result.bytes);
    const added = after.getItemsOfCategories([/^ADDED$/]).ADDED;
    expect(added).toEqual([next, next + 1]);
    expect(after.getMaxLocalId()).toBe(next + 2);
    after.dispose();
  });

  test("the layout step and the edit step of a migration share a ctx", async () => {
    const move = defineMigration({
      title: "Moves the guid into the metadata",
      context: () => ({ guid: "" }),
      layout: {
        "Model.guid": (model, ctx) => {
          ctx.guid = model.guid;
          return "moved";
        },
      },
      edit: (model, ctx) => [
        setMetadata({ ...model.getMetadata(), was: ctx.guid }),
      ],
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

  test("a migration can claim the files that predate it and carry no revision", async () => {
    const registry = registryOf(tag, tag);
    registry.unstamped = "30";
    // Nothing claims the file: it is past every step.
    expect(getRevision(await file(), { registry }).revision).toBe("30");

    const claiming = { ...tag, matchesUnstamped: () => true };
    const claimed = registryOf(tag, claiming);
    claimed.unstamped = "30";
    const info = getRevision(await file(), { registry: claimed });
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
    expect(() => getRevision(bytes, { registry: older })).toThrow(
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
  test("leaves the edit of a migration pending on a model", async () => {
    const model = new SingleThreadedFragmentsModel("model", await file());
    const { requests, report } = await applyMigration(model, tag);
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
