import { readFile } from "fs/promises";
import * as path from "path";
import * as FB from "flatbuffers";
import pako from "pako";
import { describe, expect, test } from "vitest";
import * as TFB from "../../../Schema";
import { SingleThreadedFragmentsModel } from "../../../FragmentsModels";
import { EditRequestType } from "../../../Utils/edit/edit-types";
import { getRevision, migrate } from "../..";
import { UNSTAMPED_REVISION } from "../unstamped";

const here = import.meta.dirname;
const repoRoot = path.resolve(here, "../../../../../..");
const THIS = path.basename(here).split("_")[0];
const BEFORE = "20260429202010";

const read = async (...parts: string[]) =>
  new Uint8Array(await readFile(path.join(...parts)));

// Written before the provenance stamp: its metadata is `{ schema }`.
const unstamped = () => read(repoRoot, "resources/frags/small_test.frag");

const metadataOf = (bytes: Uint8Array) => {
  const model = TFB.Model.getRootAsModel(new FB.ByteBuffer(bytes));
  return JSON.parse(model.metadata()!);
};

/** The file with other metadata, as a version without revisions would save it. */
const withMetadata = async (data: Record<string, unknown>) => {
  const model = new SingleThreadedFragmentsModel("model", await unstamped());
  model.edit([{ type: EditRequestType.UPDATE_METADATA, localId: 0, data }]);
  const bytes = model.save();
  model.dispose();
  return bytes;
};

describe("provenance backfill", () => {
  test("this is the migration files with no revision are measured against", () => {
    expect(UNSTAMPED_REVISION).toBe(THIS);
  });

  test("a file that names no generator is behind, and gets one", async () => {
    const stale = await unstamped();
    const info = getRevision(stale);
    expect(info).toMatchObject({
      revision: BEFORE,
      stamped: false,
      readable: true,
    });
    expect(info.pending.map((step) => step.id)).toEqual([THIS]);

    const result = await migrate(stale, { raw: true });
    expect(result.applied).toEqual([
      {
        id: THIS,
        title: "Every file says what generated it",
        report: { backfilled: ["generator", "version"] },
      },
    ]);
    const before = metadataOf(pako.inflate(stale));
    expect(metadataOf(result.bytes)).toEqual({
      ...before,
      generator: "unknown",
      version: "unknown",
      revision: result.to,
    });

    const again = await migrate(result.bytes);
    expect(again.applied).toEqual([]);
    expect(again.bytes).toBe(result.bytes);
  });

  test("a file that names its generator is not behind, revision or not", async () => {
    const written = await withMetadata({
      generator: "@thatopen/fragments",
      version: "3.4.8",
    });
    const info = getRevision(written);
    expect(info).toMatchObject({
      revision: THIS,
      stamped: false,
      pending: [],
    });
    const result = await migrate(written);
    expect(result.bytes).toBe(written);
    expect(result.applied).toEqual([]);
  });

  test("only what is missing is filled in", async () => {
    const half = await withMetadata({ generator: "someone else" });
    const result = await migrate(half);
    expect(result.applied[0].report).toEqual({ backfilled: ["version"] });
    expect(metadataOf(result.bytes)).toEqual({
      generator: "someone else",
      version: "unknown",
      revision: result.to,
    });
  });

  test("it runs after the layout migration on a 3.1 file", async () => {
    const stale = await read(
      here,
      "../20251023113211_remove-alignments-and-geometries/fixtures/just_wall.3.1.7.frag",
    );
    const result = await migrate(stale, { raw: true });
    expect(result.applied.map((step) => step.id)).toEqual([
      "20251023113211",
      THIS,
    ]);
    expect(metadataOf(result.bytes)).toMatchObject({
      generator: "unknown",
      version: "unknown",
      revision: THIS,
    });
  });
});
