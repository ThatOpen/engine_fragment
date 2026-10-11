import { readFileSync } from "node:fs";
import path from "node:path";
import pako from "pako";
import { describe, expect, test } from "vitest";
import { Model } from "../../../Schema";
import { EditRequestType } from "../../../Utils";
import { MaterialDefinition } from "../model/model-types";
import { ParserHelper } from "../utils/geometry/parser-helper";
import { VirtualFragmentsModel } from "./virtual-fragments-model";

/**
 * getItemsMaterialDefinition reads the samples of the items it is asked for
 * from an index (item -> samples) instead of walking every sample. These
 * tests compare it with that walk, which is kept here as the reference.
 */

const fixtures = ["small_test.frag", "school_str.frag"];

function loadModel(fixture: string) {
  const file = path.resolve(
    import.meta.dirname,
    "../../../../../..",
    "resources/frags",
    fixture,
  );
  const data = pako.inflate(new Uint8Array(readFileSync(file)));
  return new VirtualFragmentsModel(
    `material-index-${fixture}`,
    data as any,
    undefined as any,
  );
}

// The walk over every sample that the index replaces.
function scanSamples(model: Model, indices: number[]) {
  const result: { localIds: number[]; definition: MaterialDefinition }[] = [];
  const meshes = model.meshes();
  if (!meshes) return [];
  const wanted = new Set(indices);
  const map = new Map<number, Set<number>>();
  for (let i = 0; i < meshes.samplesLength(); i++) {
    const sample = meshes.samples(i);
    if (!sample) continue;
    const itemIndex = sample.item();
    if (!wanted.has(itemIndex)) continue;
    const localId = model.localIds(meshes.meshesItems(itemIndex)!);
    if (localId === null) continue;
    const materialIndex = sample.material();
    let materialItems = map.get(materialIndex);
    if (!materialItems) {
      materialItems = new Set();
      map.set(materialIndex, materialItems);
    }
    materialItems.add(localId);
  }
  for (const [materialIndex, localIds] of map.entries()) {
    const material = meshes.materials(materialIndex);
    if (!material) continue;
    const definition = ParserHelper.parseMaterial(material);
    result.push({ localIds: [...localIds], definition });
  }
  return result;
}

function expectSame(model: VirtualFragmentsModel, indices: number[]) {
  const indexed = model.materials.getItemsMaterialDefinition(
    model.data,
    indices,
    [],
  );
  expect(indexed).toEqual(scanSamples(model.data, indices));
}

describe.each(fixtures)("item to samples index on %s", (fixture) => {
  const model = loadModel(fixture);
  const itemCount = model.data.meshes()!.meshesItemsLength();
  const all = Array.from({ length: itemCount }, (_, i) => i);

  test("gives every single item what the walk over the samples gives", () => {
    expect(itemCount).toBeGreaterThan(0);
    for (const itemIndex of all) {
      const indexed = model.materials.getItemsMaterialDefinition(
        model.data,
        [itemIndex],
        [],
      );
      const scanned = scanSamples(model.data, [itemIndex]);
      // Not expectSame: one assertion per item would be slow to report.
      if (JSON.stringify(indexed) !== JSON.stringify(scanned)) {
        expect(indexed, `item ${itemIndex}`).toEqual(scanned);
      }
    }
  });

  test("gives the same groups, in the same order, for sets of items", () => {
    expectSame(model, all);
    expectSame(model, [...all].reverse());
    expectSame(
      model,
      all.filter((i) => i % 7 === 3),
    );
    expectSame(model, all.filter((i) => i % 7 === 3).reverse());
    // Shuffled with a fixed sequence, so a failure can be reproduced.
    const shuffled = [...all];
    let seed = 12345;
    for (let i = shuffled.length - 1; i > 0; i--) {
      seed = (seed * 48271) % 2147483647;
      const j = seed % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    expectSame(model, shuffled);
    expectSame(model, shuffled.slice(0, 100));
  });

  test("ignores repeated and unknown items like the walk does", () => {
    expectSame(model, []);
    expectSame(model, [0, 0, 1, 1, 0]);
    expectSame(model, [-1, itemCount, itemCount + 5, 0.5, 1]);
  });

  test("goes through the public call with local ids", () => {
    const localIds = model.getLocalIds();
    const indices = model.properties.getItemIdsFromLocalIds(localIds);
    expect(model.getItemsMaterialDefinition(localIds)).toEqual(
      scanSamples(model.data, indices),
    );
  });
});

describe("item to samples index validity", () => {
  test("an edit leaves the samples of the loaded model untouched", () => {
    const model = loadModel("small_test.frag");
    const all = model.getLocalIds();
    const before = model.getItemsMaterialDefinition(all);
    const bytes = (model.data.bb as any).bytes() as Uint8Array;
    const copy = bytes.slice();
    const buffer = model.data.bb;

    const sampleId = model.data.meshes()!.sampleIds(0)!;
    const { deltaModelBuffer } = model.edit([
      { type: EditRequestType.DELETE_SAMPLE, localId: sampleId },
    ]);
    expect(deltaModelBuffer.byteLength).toBeGreaterThan(0);
    expect(model.save().byteLength).toBeGreaterThan(0);

    expect(model.data.bb).toBe(buffer);
    expect(Buffer.compare(bytes, copy)).toBe(0);
    expect(model.getItemsMaterialDefinition(all)).toEqual(before);
  });

  test("is rebuilt when the controller is given another model", () => {
    const small = loadModel("small_test.frag");
    const other = loadModel("school_str.frag");
    const indices = [0, 1, 2, 3, 4, 5];
    const controller = small.materials;
    expect(
      controller.getItemsMaterialDefinition(small.data, indices, []),
    ).toEqual(scanSamples(small.data, indices));
    expect(
      controller.getItemsMaterialDefinition(other.data, indices, []),
    ).toEqual(scanSamples(other.data, indices));
    expect(
      controller.getItemsMaterialDefinition(small.data, indices, []),
    ).toEqual(scanSamples(small.data, indices));
  });
});
