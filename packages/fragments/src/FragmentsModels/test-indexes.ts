/* eslint-disable no-console */
// Smoke test for the VirtualIndexesController.
//
// Builds a minimal Model flatbuffer with all required fields populated as
// empty vectors plus two custom indexes, then exercises every read path on
// the controller directly. No worker, no scene, no IFC. Doubles as a worked
// example of how to build and consume user-defined ModelIndexes.
//
// Run with: yarn test-indexes  (from packages/fragments)
//   or:    npx tsx packages/fragments/src/FragmentsModels/test-indexes.ts

import * as flatbuffers from "flatbuffers";
import { Meshes, Model, ModelIndex, Transform } from "../Schema";
import { VirtualIndexesController } from "./src/virtual-model/virtual-controllers/virtual-indexes-controller";
import { EditRequest, EditRequestType, EditUtils } from "../Utils";

let pass = 0;
let fail = 0;
const log = (ok: boolean, label: string, got: unknown, want: unknown) => {
  if (ok) {
    pass++;
    console.log(`  pass  ${label}`);
  } else {
    fail++;
    console.error(`  FAIL  ${label}`);
    console.error(`        got:  ${JSON.stringify(got)}`);
    console.error(`        want: ${JSON.stringify(want)}`);
  }
};

const eq = (label: string, got: unknown, want: unknown) =>
  log(JSON.stringify(got) === JSON.stringify(want), label, got, want);

const eqArr = (label: string, got: ArrayLike<number> | null, want: number[]) => {
  if (got === null) return log(false, label, got, want);
  const arr = Array.from(got as ArrayLike<number>);
  log(JSON.stringify(arr) === JSON.stringify(want), label, arr, want);
};

// ---------------------------------------------------------------------------
// Build the Model
// ---------------------------------------------------------------------------
const builder = new flatbuffers.Builder(1024);

// Two indexes:
//   - "tags":        1:1 number -> string  (1 -> "A", 2 -> "B", 3 -> "A")
//   - "descendants": 1:N linear number -> numbers
//                    100 -> [101, 102, 202]
//                    202 -> [300, 301, 302]
const tagsName = builder.createString("tags");
const tagsKeys = ModelIndex.createNumberKeysVector(builder, [1, 2, 3]);
const tagA1 = builder.createString("A");
const tagB = builder.createString("B");
const tagA2 = builder.createString("A");
const tagsValues = ModelIndex.createStringValuesVector(builder, [tagA1, tagB, tagA2]);
ModelIndex.startModelIndex(builder);
ModelIndex.addName(builder, tagsName);
ModelIndex.addNumberKeys(builder, tagsKeys);
ModelIndex.addStringValues(builder, tagsValues);
const tagsOffset = ModelIndex.endModelIndex(builder);

const descName = builder.createString("descendants");
const descKeys = ModelIndex.createNumberKeysVector(builder, [100, 202]);
const descValues = ModelIndex.createNumberValuesVector(
  builder,
  [101, 102, 202, 300, 301, 302],
);
const descEnd = ModelIndex.createEndVector(builder, [3, 6]);
ModelIndex.startModelIndex(builder);
ModelIndex.addName(builder, descName);
ModelIndex.addNumberKeys(builder, descKeys);
ModelIndex.addNumberValues(builder, descValues);
ModelIndex.addEnd(builder, descEnd);
const descOffset = ModelIndex.endModelIndex(builder);

const indexesVec = Model.createIndexesVector(builder, [tagsOffset, descOffset]);

// Required Meshes vectors (all empty)
Meshes.startGlobalTransformsVector(builder, 0);
const globalTransforms = builder.endVector();
const shells = Meshes.createShellsVector(builder, []);
Meshes.startRepresentationsVector(builder, 0);
const representations = builder.endVector();
Meshes.startSamplesVector(builder, 0);
const samples = builder.endVector();
Meshes.startLocalTransformsVector(builder, 0);
const localTransforms = builder.endVector();
Meshes.startMaterialsVector(builder, 0);
const materials = builder.endVector();
const circleExtrusions = Meshes.createCircleExtrusionsVector(builder, []);
const meshesItems = Meshes.createMeshesItemsVector(builder, []);
const reprIds = Meshes.createRepresentationIdsVector(builder, []);
const sampleIds = Meshes.createSampleIdsVector(builder, []);
const materialIds = Meshes.createMaterialIdsVector(builder, []);
const ltIds = Meshes.createLocalTransformIdsVector(builder, []);
const gtIds = Meshes.createGlobalTransformIdsVector(builder, []);

Meshes.startMeshes(builder);
const coordinates = Transform.createTransform(
  builder,
  0, 0, 0, // position
  1, 0, 0, // xDirection
  0, 1, 0, // yDirection
);
Meshes.addCoordinates(builder, coordinates);
Meshes.addGlobalTransforms(builder, globalTransforms);
Meshes.addShells(builder, shells);
Meshes.addRepresentations(builder, representations);
Meshes.addSamples(builder, samples);
Meshes.addLocalTransforms(builder, localTransforms);
Meshes.addMaterials(builder, materials);
Meshes.addCircleExtrusions(builder, circleExtrusions);
Meshes.addMeshesItems(builder, meshesItems);
Meshes.addRepresentationIds(builder, reprIds);
Meshes.addSampleIds(builder, sampleIds);
Meshes.addMaterialIds(builder, materialIds);
Meshes.addLocalTransformIds(builder, ltIds);
Meshes.addGlobalTransformIds(builder, gtIds);
const meshes = Meshes.endMeshes(builder);

// Required Model vectors (all empty)
const localIds = Model.createLocalIdsVector(builder, []);
const categories = Model.createCategoriesVector(builder, []);
const guidsItems = Model.createGuidsItemsVector(builder, []);
const guids = Model.createGuidsVector(builder, []);
const guid = builder.createString("test-model");

Model.startModel(builder);
Model.addLocalIds(builder, localIds);
Model.addCategories(builder, categories);
Model.addMeshes(builder, meshes);
Model.addGuidsItems(builder, guidsItems);
Model.addGuids(builder, guids);
Model.addGuid(builder, guid);
Model.addIndexes(builder, indexesVec);
const modelOffset = Model.endModel(builder);
builder.finish(modelOffset);

const bytes = builder.asUint8Array();
const bb = new flatbuffers.ByteBuffer(bytes);
const model = Model.getRootAsModel(bb);

// ---------------------------------------------------------------------------
// Exercise the controller
// ---------------------------------------------------------------------------
const controller = new VirtualIndexesController(model);

console.log("Names");
eq("getNames()", controller.getNames(), ["tags", "descendants"]);

console.log("\ntags (1:1 number -> string)");
eq("getInfo('tags')", controller.getInfo("tags"), {
  name: "tags",
  mode: "oneToOne",
  keyType: "number",
  valueType: "string",
  size: 3,
});
eq("getEntry('tags', 1)", controller.getEntry("tags", 1), "A");
eq("getEntry('tags', 2)", controller.getEntry("tags", 2), "B");
eq("getEntry('tags', 3)", controller.getEntry("tags", 3), "A");
eq("getEntry('tags', 999)", controller.getEntry("tags", 999), null);
eq("has('tags', 1)", controller.has("tags", 1), true);
eq("has('tags', 999)", controller.has("tags", 999), false);
eqArr(
  "getInverseEntry('tags', 'A')",
  controller.getInverseEntry("tags", "A") as Uint32Array,
  [1, 3],
);
eqArr(
  "getInverseEntry('tags', 'B')",
  controller.getInverseEntry("tags", "B") as Uint32Array,
  [2],
);
eq("getInverseEntry('tags', 'Z')", controller.getInverseEntry("tags", "Z"), null);

console.log("\ndescendants (1:N linear number -> numbers)");
eq("getInfo('descendants')", controller.getInfo("descendants"), {
  name: "descendants",
  mode: "oneToNLinear",
  keyType: "number",
  valueType: "number",
  size: 2,
});
eqArr(
  "getEntry('descendants', 100)",
  controller.getEntry("descendants", 100) as Uint32Array,
  [101, 102, 202],
);
eqArr(
  "getEntry('descendants', 202)",
  controller.getEntry("descendants", 202) as Uint32Array,
  [300, 301, 302],
);
eq("getEntry('descendants', 999)", controller.getEntry("descendants", 999), null);
eqArr(
  "getInverseEntry('descendants', 301)",
  controller.getInverseEntry("descendants", 301) as Uint32Array,
  [202],
);
eqArr(
  "getInverseEntry('descendants', 202)",
  controller.getInverseEntry("descendants", 202) as Uint32Array,
  [100],
);

console.log("\nMissing index");
eq("getInfo('nope')", controller.getInfo("nope"), null);
eq("getEntry('nope', 1)", controller.getEntry("nope", 1), null);

// ---------------------------------------------------------------------------
// Edit pipeline: CREATE / UPDATE / DELETE through EditUtils.edit, then
// re-parse the resulting buffer and verify the new state.
// ---------------------------------------------------------------------------
console.log("\nEdit pipeline (save & reload)");

const requests: EditRequest[] = [
  // Drop "tags" entirely
  { type: EditRequestType.DELETE_INDEX, name: "tags" },
  // Replace "descendants" with new content
  {
    type: EditRequestType.UPDATE_INDEX,
    data: {
      name: "descendants",
      keys: [100, 202],
      values: [501, 502, 600],
      end: [2, 3],
    },
  },
  // Add a brand new keys-only index
  {
    type: EditRequestType.CREATE_INDEX,
    data: { name: "withGeometry", keys: [10, 20, 30] },
  },
];

const { model: editedBytes } = EditUtils.edit(model, requests, {
  raw: true,
  delta: false,
});
const editedBb = new flatbuffers.ByteBuffer(editedBytes as Uint8Array);
const editedModel = Model.getRootAsModel(editedBb);
const editedCtl = new VirtualIndexesController(editedModel);

eq("after edit: getNames()", editedCtl.getNames(), [
  "descendants",
  "withGeometry",
]);
eq(
  "after edit: getInfo('tags') is null (deleted)",
  editedCtl.getInfo("tags"),
  null,
);
eq("after edit: getInfo('descendants').size", editedCtl.getInfo("descendants")?.size, 2);
eqArr(
  "after edit: getEntry('descendants', 100)",
  editedCtl.getEntry("descendants", 100) as Uint32Array,
  [501, 502],
);
eqArr(
  "after edit: getEntry('descendants', 202)",
  editedCtl.getEntry("descendants", 202) as Uint32Array,
  [600],
);
eq(
  "after edit: getInfo('withGeometry')",
  editedCtl.getInfo("withGeometry"),
  {
    name: "withGeometry",
    mode: "keysOnly",
    keyType: "number",
    valueType: "none",
    size: 3,
  },
);
eq("after edit: has('withGeometry', 20)", editedCtl.has("withGeometry", 20), true);
eq("after edit: has('withGeometry', 99)", editedCtl.has("withGeometry", 99), false);

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
