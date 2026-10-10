import { readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import * as fb from "flatbuffers";
import { beforeAll, describe, expect, onTestFinished, test } from "vitest";
import { SingleThreadedFragmentsModel } from "../../../FragmentsModels";
import * as TFB from "../../../Schema";
import {
  findItemSplits,
  IfcImporter,
  IfcSplit,
  IfcSplitConfig,
  IfcSplitManifest,
} from "../index";
import { compare, dump, dumpSplits } from "./testing/frag-dump";

const fixtureDir = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
  "resources",
  "ifc",
);
const webIfcDir = path.dirname(import.meta.resolve("web-ifc"));

const geometryBatches = { batchElements: 7, probeElements: 7 };

const createImporter = () => {
  const importer = new IfcImporter();
  importer.wasm = { path: webIfcDir + path.sep, absolute: true };
  return importer;
};

const convert = (bytes: Uint8Array) =>
  createImporter().process({ bytes, raw: true, geometryBatches });

const convertSplit = async (
  bytes: Uint8Array,
  geometry: IfcSplitConfig["geometry"],
) => {
  const splits: IfcSplit[] = [];
  const manifest = await createImporter().process({
    id: "model",
    bytes,
    raw: true,
    geometryBatches,
    splits: {
      geometry,
      onSplit: (split) => {
        splits.push(split);
      },
    },
  });
  return { manifest, splits };
};

const localIdsOf = (bytes: Uint8Array) =>
  TFB.Model.getRootAsModel(new fb.ByteBuffer(bytes)).localIdsArray() ??
  new Uint32Array(0);

const load = async (id: string, bytes: Uint8Array) => {
  // the model keeps the buffer it is given
  const model = new SingleThreadedFragmentsModel(id, bytes.slice(), true);
  await model.ready;
  return model;
};

// One model stores shells that round alike once; splits store each as
// itself when a boundary falls between them (see `compare`). The rounding is
// to 0.1 mm of the mesh web-ifc gives, before it is moved to its item.
const dedupTolerance = 2e-4;

/**
 * A model's grids and alignments, read the way the viewer reads them: the
 * items of their categories, and the data each holds.
 */
const referencesOf = async (model: SingleThreadedFragmentsModel) => {
  const byCategory = await model.getItemsOfCategories([/^ThatOpen/]);
  const localIds = Object.values(byCategory).flat();
  // asked for no items, a model answers with all of them
  if (localIds.length === 0) return [];
  const items = await model.getItemsData(localIds, {});
  return items
    .map(({ _category, data }) =>
      [_category, data].map((entry) => (entry as { value: unknown }).value),
    )
    .sort();
};

/**
 * What the loader makes of some items' geometry: where each mesh is, how
 * much of it there is, and the box it fills. Not its triangles: shells that
 * differ within the tolerance can triangulate differently.
 */
const geometryOf = async (
  model: SingleThreadedFragmentsModel,
  localIds: number[],
) => {
  const items = await model.getItemsGeometry(localIds);
  return items.map((meshes) =>
    meshes.map(({ positions, indices, transform }) => {
      const box = [
        Infinity,
        Infinity,
        Infinity,
        -Infinity,
        -Infinity,
        -Infinity,
      ];
      for (const [i, value] of (positions ?? []).entries()) {
        box[i % 3] = Math.min(box[i % 3], value);
        box[3 + (i % 3)] = Math.max(box[3 + (i % 3)], value);
      }
      return {
        transform: transform.elements,
        vertices: (positions?.length ?? 0) / 3,
        triangles: (indices?.length ?? 0) / 3,
        box,
      };
    }),
  );
};

const expectSameGeometry = (
  actual: Awaited<ReturnType<typeof geometryOf>>,
  expected: Awaited<ReturnType<typeof geometryOf>>,
) => {
  expect(actual.length).toBe(expected.length);
  for (const [item, meshes] of actual.entries()) {
    expect(meshes.length).toBe(expected[item].length);
    for (const [index, { box, ...mesh }] of meshes.entries()) {
      const { box: otherBox, ...other } = expected[item][index];
      expect(mesh).toEqual(other);
      for (const [i, value] of box.entries()) {
        expect(Math.abs(value - otherBox[i])).toBeLessThanOrEqual(
          dedupTolerance,
        );
      }
    }
  }
};

function expectManifest(
  manifest: IfcSplitManifest,
  splits: IfcSplit[],
  geometry: NonNullable<IfcSplitConfig["geometry"]>,
) {
  expect(manifest.id).toBe("model");
  expect(manifest.splits).toEqual(splits.map(({ bytes, ...info }) => info));

  // Geometry first, then the grids and alignments if there are any, then data
  const geometrySplits = splits.filter((split) => split.kind === "geometry");
  const referenceSplits = splits.filter((split) => split.kind === "reference");
  expect(splits.map((split) => split.id)).toEqual([
    ...geometrySplits.map((_, i) => `model.g${i}`),
    ...referenceSplits.map((_, i) => `model.r${i}`),
    "model.d0",
  ]);
  expect(referenceSplits.length).toBeLessThanOrEqual(1);
  expect(splits.at(-1)).toMatchObject({ kind: "data", group: "data" });
  for (const split of [...geometrySplits, ...referenceSplits]) {
    expect(split.group).toBeNull();
    expect(split.items).toBeGreaterThan(0);
  }
  for (const split of geometrySplits) {
    expect(split.items).toBeLessThanOrEqual(geometry.maxItems ?? Infinity);
  }

  // The index names, for every item of every split, the split it is in:
  // the one with its geometry, and the one with its attributes
  const indexed = { geometry: 0, data: 0 };
  for (const [position, split] of splits.entries()) {
    const column = split.kind === "geometry" ? "geometry" : "data";
    const localIds = localIdsOf(split.bytes);
    expect(split.items).toBe(localIds.length);
    expect(split.byteLength).toBe(split.bytes.length);
    for (const localId of localIds) {
      expect(findItemSplits(manifest, localId)![column]).toBe(position);
    }
    indexed[column] += localIds.length;
  }
  const { index } = manifest;
  expect([...index.localIds]).toEqual(
    [...index.localIds].sort((a, b) => a - b),
  );
  expect(index.geometry.filter((position) => position !== -1).length).toBe(
    indexed.geometry,
  );
  expect(index.data.filter((position) => position !== -1).length).toBe(
    indexed.data,
  );
  expect(findItemSplits(manifest, 0xffffffff)).toBeNull();
}

// Written as several models, a conversion must hold what one model holds:
// every item's data in the data split, every item's geometry in exactly one
// geometry split, and a manifest that says which.
describe.each(readdirSync(fixtureDir).filter((f) => f.endsWith(".ifc")))(
  "splits of %s",
  (fixture) => {
    const bytes = new Uint8Array(readFileSync(path.join(fixtureDir, fixture)));
    let whole: Uint8Array;

    beforeAll(async () => {
      whole = await convert(bytes);
    }, 300_000);

    test.each<[string, NonNullable<IfcSplitConfig["geometry"]>]>([
      ["5 elements", { maxItems: 5 }],
      ["200 elements", { maxItems: 200 }],
      ["one batch, by size", { maxBytes: 1 }],
    ])(
      "of %s hold the model one file holds",
      async (_name, geometry) => {
        const { manifest, splits } = await convertSplit(bytes, geometry);
        const result = compare(dump(whole), dumpSplits(splits), {
          tolerance: dedupTolerance,
          generatedById: false,
        });
        expect(result.differences).toEqual({});
        expectManifest(manifest, splits, geometry);
      },
      300_000,
    );

    test("load as models of their own", async () => {
      const { manifest, splits } = await convertSplit(bytes, { maxItems: 50 });
      // Models in one thread share a geometry cache keyed by model id, so
      // each gets an id no other fixture's model has, and is disposed of.
      const models: SingleThreadedFragmentsModel[] = [];
      const loadModel = async (id: string, model: Uint8Array) => {
        models.push(await load(`${fixture}/${id}`, model));
        return models.at(-1)!;
      };
      onTestFinished(() => {
        for (const model of models) model.dispose();
      });
      const wholeModel = await loadModel("whole", whole);

      // A reference split is written when there is something to put in it
      const references = await referencesOf(wholeModel);
      expect(splits.some((split) => split.kind === "reference")).toBe(
        references.length > 0,
      );

      for (const split of splits) {
        const model = await loadModel(split.id, split.bytes);
        const localIds = [...localIdsOf(split.bytes)];
        expect(await model.getCoordinates()).toEqual(
          await wholeModel.getCoordinates(),
        );

        if (split.kind === "reference") {
          expect(await model.getItemsIdsWithGeometry()).toEqual([]);
          expect(await referencesOf(model)).toEqual(references);
          continue;
        }
        // grids and alignments are in no other split
        expect(await referencesOf(model)).toEqual([]);

        if (split.kind === "data") {
          expect(await model.getItemsIdsWithGeometry()).toEqual([]);
          expect(await model.getSpatialStructure()).toEqual(
            await wholeModel.getSpatialStructure(),
          );
          const config = {
            relationsDefault: { attributes: true, relations: false },
          };
          expect(await model.getItemsData(localIds, config)).toEqual(
            await wholeModel.getItemsData(localIds, config),
          );
          expect(await model.getGuidsByLocalIds(localIds)).toEqual(
            await wholeModel.getGuidsByLocalIds(localIds),
          );
          continue;
        }

        expect(await model.getItemsIdsWithGeometry()).toEqual(localIds);
        expectSameGeometry(
          await geometryOf(model, localIds),
          await geometryOf(wholeModel, localIds),
        );
        // what a geometry split leaves out comes back empty, not as an error
        expect(await model.getSpatialStructure()).toEqual({});
        expect(await model.getGuidsByLocalIds(localIds)).toEqual(
          localIds.map(() => null),
        );
        // an item picked here is found in the data split by the same id
        const dataSplit = splits[findItemSplits(manifest, localIds[0])!.data];
        expect(dataSplit.kind).toBe("data");
      }
    }, 300_000);
  },
);
