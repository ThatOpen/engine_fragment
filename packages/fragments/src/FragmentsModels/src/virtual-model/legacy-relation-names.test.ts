import { readFileSync } from "node:fs";
import path from "node:path";
import pako from "pako";
import { describe, expect, test } from "vitest";
import { VirtualFragmentsModel } from "./virtual-fragments-model";

/**
 * Files converted before the importer fixed its spelling store the inverse
 * of IsDefinedBy as "DefinesOcurrence". A data config that cuts
 * "DefinesOccurrence" must still apply to them; otherwise reading
 * IsDefinedBy with nested relations walks back to the element and returns
 * a cyclic object (the EditProperties example overflowed the stack on it).
 */

const fixture = path.resolve(
  import.meta.dirname,
  "../../../../../..",
  "resources/frags/small_test.frag",
);

function loadModel() {
  const data = pako.inflate(new Uint8Array(readFileSync(fixture)));
  const model = new VirtualFragmentsModel(
    "legacy-relation-names-test",
    data as any,
    undefined as any,
  );
  model.setupData();
  return model;
}

const isAcyclic = (value: unknown, seen = new Set<unknown>()): boolean => {
  if (!value || typeof value !== "object") return true;
  if (seen.has(value)) return false;
  seen.add(value);
  for (const child of Object.values(value)) {
    if (!isAcyclic(child, seen)) return false;
  }
  seen.delete(value);
  return true;
};

describe("getItemsData with legacy relation names", () => {
  test("the fixture still uses the old spelling", () => {
    const raw = Buffer.from(
      pako.inflate(new Uint8Array(readFileSync(fixture))),
    ).toString("latin1");
    expect(raw.includes("DefinesOcurrence")).toBe(true);
  });

  for (const cut of ["DefinesOccurrence", "DefinesOcurrence"]) {
    test(`cutting ${cut} keeps property sets from looping back`, () => {
      const model = loadModel();
      const config = {
        relations: {
          IsDefinedBy: { attributes: true, relations: true },
          [cut]: { attributes: false, relations: false },
        },
      };
      const ids = model.getLocalIds();
      let checked = 0;
      for (const localId of ids) {
        const [data] = model.getItemsData([localId], config);
        if (!data || !Array.isArray(data.IsDefinedBy)) continue;
        expect(isAcyclic(data)).toBe(true);
        checked++;
        if (checked >= 20) break;
      }
      expect(checked).toBeGreaterThan(0);
    });
  }
});
