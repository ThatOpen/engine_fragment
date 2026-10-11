import { readFile } from "fs/promises";
import * as path from "path";
import pako from "pako";
import { describe, expect, test } from "vitest";
import { isRawBuffer } from "../../FragmentsModels/src/utils/misc/buffer";
import { newModel } from "../../Utils/edit/new-model-function";
import { gate } from "../gate";
import { registry } from "../registry";
import { inspect } from "./core";
import { check } from "./gate";
import { migrate } from "./migrate";

// The gate is what the worker holds: it has to say of every file what the
// registry says, without the layouts and the migrations the registry has.

const repoRoot = path.resolve(import.meta.dirname, "../../../../..");
const fixtures =
  "packages/fragments/src/Migrations/list/20251023113211_remove-alignments-and-geometries/fixtures";
const LATEST = registry.steps[registry.steps.length - 1].id;

const raw = async (file: string) => {
  const bytes = new Uint8Array(await readFile(path.join(repoRoot, file)));
  return isRawBuffer(bytes) ? bytes : pako.inflate(bytes);
};

describe("the gate", () => {
  test("lists the steps of the registry, and which of them have work to do", () => {
    expect(gate.unstamped).toBe(registry.unstamped);
    expect(gate.steps.map((step) => step.id)).toEqual(
      registry.steps.map((step) => step.id),
    );
    for (const [index, step] of registry.steps.entries()) {
      const { migration } = step;
      const work =
        step.rewrite === true ||
        migration?.layout !== undefined ||
        migration?.edit !== undefined;
      expect(gate.steps[index].work === true).toBe(work);
      expect(gate.steps[index].rewrite).toBe(step.rewrite);
      expect(gate.steps[index].matchesUnstamped).toBe(step.matchesUnstamped);
    }
  });

  test.each([
    "resources/frags/small_test.frag",
    "resources/frags/school_str.frag",
    "resources/frags/school_arq.frag",
    "resources/frags/synthetic_large_grid.frag",
    `${fixtures}/just_wall.3.0.11.frag`,
    `${fixtures}/just_wall.3.1.7.frag`,
    `${fixtures}/school_str.3.1.7.frag`,
    `${fixtures}/alignment.3.1.7.frag`,
  ])("says of %s what the registry says", async (file) => {
    const bytes = await raw(file);
    const verdict = check(bytes, gate);
    const { info } = inspect(bytes);
    expect(verdict.known).toBe(true);
    expect(verdict.revision).toBe(info.revision);
    expect(verdict.stamped).toBe(info.stamped);
    expect(verdict.latest).toBe(info.latest);
    expect(verdict.readable).toBe(info.readable);
    expect(verdict.pending.map(({ id, rewrite }) => ({ id, rewrite }))).toEqual(
      info.pending.map(({ id, rewrite }) => ({ id, rewrite })),
    );
    // Every one of these is behind, which is why they are here.
    expect(verdict.pending.length).toBeGreaterThan(0);

    const migrated = await migrate(bytes, { raw: true });
    expect(check(migrated.bytes, gate)).toMatchObject({
      revision: LATEST,
      known: true,
      pending: [],
      readable: true,
    });
  });

  test("lets a file this package writes through", () => {
    const verdict = check(newModel({ raw: true }), gate);
    expect(verdict).toMatchObject({ revision: LATEST, known: true });
    expect(verdict.pending).toEqual([]);
  });

  test("does not know a revision that is not a step", async () => {
    const bytes = await raw("resources/frags/small_test.frag");
    const newer = { ...gate, steps: gate.steps.slice(0, 2) };
    const { bytes: stamped } = await migrate(bytes, { raw: true });
    expect(check(stamped, newer)).toMatchObject({
      revision: LATEST,
      known: false,
      readable: false,
    });
  });
});
