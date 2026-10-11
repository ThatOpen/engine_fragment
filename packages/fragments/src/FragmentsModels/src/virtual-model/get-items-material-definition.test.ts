import { readFileSync } from "node:fs";
import path from "node:path";
import pako from "pako";
import { describe, expect, test } from "vitest";
import { VirtualFragmentsModel } from "./virtual-fragments-model";

/**
 * getItemsMaterialDefinition used to read `meshes.samples(itemIndex)`, i.e. a
 * meshes_items index taken as a sample index, and paired the item indices with
 * localIds by position. On small_test.frag that gave 69 of 93 items with
 * geometry a material none of their samples uses.
 */

const fixture = path.resolve(
  import.meta.dirname,
  "../../../../../..",
  "resources/frags/small_test.frag",
);

function loadModel() {
  const data = pako.inflate(new Uint8Array(readFileSync(fixture)));
  const model = new VirtualFragmentsModel(
    "get-items-material-definition-test",
    data as any,
    undefined as any,
  );
  model.setupData();
  return model;
}

const hex = (r: number, g: number, b: number) =>
  ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");

describe("VirtualFragmentsModel.getItemsMaterialDefinition", () => {
  test("returns, for every item, exactly the materials of its own samples", () => {
    const model = loadModel();
    const meshes = (model as any).data.meshes();

    // Expected: walk the samples (sample.item -> meshes_items -> localIds).
    const expected = new Map<number, Set<string>>();
    for (let i = 0; i < meshes.samplesLength(); i++) {
      const sample = meshes.samples(i);
      const itemIndex = sample.item();
      const localId = (model as any).data.localIds(
        meshes.meshesItems(itemIndex),
      );
      const m = meshes.materials(sample.material());
      if (!expected.has(localId)) expected.set(localId, new Set());
      expected.get(localId)!.add(hex(m.r(), m.g(), m.b()));
    }
    const localIds = [...expected.keys()];
    expect(localIds.length).toBeGreaterThan(0);

    const actual = new Map<number, Set<string>>();
    for (const {
      localIds: ids,
      definition,
    } of model.getItemsMaterialDefinition(localIds)) {
      for (const id of ids) {
        if (!actual.has(id)) actual.set(id, new Set());
        actual.get(id)!.add(definition.color.getHexString());
      }
    }

    expect(actual).toEqual(expected);
  });

  test("returns only the items that were asked for", () => {
    const model = loadModel();
    const all = model.getItemsMaterialDefinition(model.getLocalIds());
    const someIds = [...new Set(all.flatMap((g) => g.localIds))].slice(0, 3);
    const some = model.getItemsMaterialDefinition(someIds);
    const returned = new Set(some.flatMap((g) => g.localIds));
    expect([...returned].sort()).toEqual([...someIds].sort());
  });
});
