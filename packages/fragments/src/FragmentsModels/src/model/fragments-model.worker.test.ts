// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import * as path from "node:path";
import * as THREE from "three";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { FragmentsModels } from "../..";
import { RenderedFaces } from "../../../Schema";
import { EditRequestType } from "../../../Utils";
import { SingleThreadedFragmentsModel } from "../single-threading";
import { FragmentsModel } from "./fragments-model";
import {
  IModelData,
  IModelGeometry,
  IModelSerializer,
  IRawModelData,
} from "./fragments-model-interface";
import { ItemInformationType, MaterialDefinition } from "./model-types";

/**
 * FragmentsModel end to end: a real .frag, loaded and queried through a
 * worker, so every call is answered by the worker's model and what it
 * returns crosses a real `postMessage()`.
 *
 * `local` is the same file loaded in this thread, with no worker: what the
 * worker's model returns, before it is copied.
 */

const fixture = path.resolve(
  import.meta.dirname,
  "../../../../../..",
  "resources/frags/small_test.frag",
);

/** The worker `@vitest/web-worker` runs, see the file. */
const workerUrl = new URL("../../../../vitest.worker.ts", import.meta.url).href;

let fragments: FragmentsModels;
let model: FragmentsModel;
let local: SingleThreadedFragmentsModel;
/** A few items with geometry. */
let ids: number[];

beforeAll(async () => {
  const file = readFileSync(fixture);
  fragments = new FragmentsModels(workerUrl);
  model = await fragments.load(new Uint8Array(file), {
    modelId: "model",
    camera: new THREE.PerspectiveCamera(),
  });
  local = new SingleThreadedFragmentsModel("local", new Uint8Array(file));
  await local.ready;
  ids = local.getItemsIdsWithGeometry().slice(0, 4);
});

afterAll(async () => {
  local.dispose();
  await fragments.dispose();
});

test("what the worker returns arrives as a copy, without its classes", async () => {
  const [[copy]] = await model._invoke("getItemsGeometry", [ids]);
  const [[original]] = local.getItemsGeometry(ids);

  expect(original.transform).toBeInstanceOf(THREE.Matrix4);
  expect(copy.transform).not.toBeInstanceOf(THREE.Matrix4);
  expect(copy.transform.elements).toStrictEqual(original.transform.elements);
});

/** What both models answer, the one behind the worker with a promise. */
type Queried = IModelData<boolean> &
  IRawModelData<boolean> &
  IModelGeometry<boolean> &
  IModelSerializer<boolean>;

/**
 * Queries whose result is handed out as the worker sends it. Each is asked
 * of the model behind the worker and of the one in this thread.
 */
const queries: [string, (model: Queried) => unknown][] = [
  ["getSpatialStructure", (m) => m.getSpatialStructure()],
  ["getCategories", (m) => m.getCategories()],
  ["getMetadata", (m) => m.getMetadata()],
  ["getCRS", (m) => m.getCRS()],
  ["getMaxLocalId", (m) => m.getMaxLocalId()],
  ["getLocalIds", (m) => m.getLocalIds()],
  ["getGuidsByLocalIds", (m) => m.getGuidsByLocalIds(ids)],
  [
    "getLocalIdsByGuids",
    (m) => m.getLocalIdsByGuids(local.getGuidsByLocalIds(ids) as string[]),
  ],
  ["getItemsIdsWithGeometry", (m) => m.getItemsIdsWithGeometry()],
  ["getItemsOfCategories", (m) => m.getItemsOfCategories([/WALL/, /SLAB/])],
  ["getItemsChildren", (m) => m.getItemsChildren(local.getLocalIds())],
  [
    "getItemsData",
    (m) =>
      m.getItemsData(ids, {
        relationsDefault: { attributes: true, relations: true },
      }),
  ],
  ["getItemsByQuery", (m) => m.getItemsByQuery({ categories: [/WALL/] })],
  ["getMaterialsIds", (m) => m.getMaterialsIds()],
  ["getMaterials", (m) => m.getMaterials()],
  ["getRepresentationsIds", (m) => m.getRepresentationsIds()],
  ["getRepresentations", (m) => m.getRepresentations()],
  ["getLocalTransformsIds", (m) => m.getLocalTransformsIds()],
  ["getLocalTransforms", (m) => m.getLocalTransforms()],
  ["getGlobalTransformsIds", (m) => m.getGlobalTransformsIds()],
  ["getGlobalTransforms", (m) => m.getGlobalTransforms()],
  ["getSamplesIds", (m) => m.getSamplesIds()],
  ["getSamples", (m) => m.getSamples()],
  ["getItemsIds", (m) => m.getItemsIds()],
  ["getItems", (m) => m.getItems()],
  ["getRelations", (m) => m.getRelations()],
  ["getGlobalTranformsIdsOfItems", (m) => m.getGlobalTranformsIdsOfItems(ids)],
  ["getItemsVolume", (m) => m.getItemsVolume(ids)],
  [
    "getSection",
    async (m) => {
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const section = await m.getSection(plane, ids);
      // The buffer is allocated for the largest section: only its start,
      // up to `index`, is filled.
      return { ...section, buffer: section.buffer.slice(0, section.index) };
    },
  ],
  ["getCoordinates", (m) => m.getCoordinates()],
  ["getBuffer", (m) => m.getBuffer()],
  ["getBuffer, raw", (m) => m.getBuffer(true)],
  ["getSubsetBuffer", (m) => m.getSubsetBuffer(ids, true)],
];

test.each(queries)(
  "%s() returns what the worker's model returns",
  async (_name, query) => {
    expect(await query(model)).toStrictEqual(await query(local));
  },
);

describe("what the copy flattens is rebuilt", () => {
  test("getItemsGeometry() returns transforms as THREE.Matrix4", async () => {
    const geometries = await model.getItemsGeometry(ids);

    for (const { transform } of geometries.flat()) {
      expect(transform).toBeInstanceOf(THREE.Matrix4);
    }
    expect(geometries).toStrictEqual(local.getItemsGeometry(ids));
  });

  test("getGeometries() returns transforms as THREE.Matrix4", async () => {
    const [meshes] = await model.getItemsGeometry([ids[0]]);
    const representations = meshes.map((mesh) => mesh.representationId!);

    const geometries = await model.getGeometries(representations);

    expect(geometries).toHaveLength(new Set(representations).size);
    for (const { transform, positions, representationId } of geometries) {
      // A representation on its own isn't placed.
      expect(transform).toStrictEqual(new THREE.Matrix4());
      const mesh = meshes.find((m) => m.representationId === representationId);
      expect(positions).toStrictEqual(mesh!.positions);
    }
  });

  test("an item's geometry has its transforms as THREE.Matrix4", async () => {
    const geometry = await model.getItem(ids[0]).getGeometry();

    const transforms = await geometry!.getTransform();

    const [meshes] = local.getItemsGeometry([ids[0]]);
    expect(transforms).toStrictEqual(meshes.map((mesh) => mesh.transform));
  });

  test("getPositions() returns THREE.Vector3", async () => {
    const positions = await model.getPositions(ids);

    expect(positions).toStrictEqual(
      local.getPositions(ids).map(({ x, y, z }) => new THREE.Vector3(x, y, z)),
    );
  });

  test("getBoxes() and getMergedBox() return THREE.Box3", async () => {
    const boxes = await model.getBoxes(ids);
    const merged = await model.getMergedBox(ids);

    expect(boxes).toHaveLength(ids.length);
    expect(merged.isEmpty()).toBe(false);
    expect(merged).toStrictEqual(
      boxes.reduce((all, box) => all.union(box), new THREE.Box3()),
    );
  });

  test("getItemsMaterialDefinition() returns the file's colors as THREE.Color", async () => {
    const materials = await model.getMaterials();
    const fileColors = [...materials.values()].map(({ r, g, b }) =>
      new THREE.Color(`rgb(${r}, ${g}, ${b})`).getHex(),
    );

    const definitions = await model.getItemsMaterialDefinition(ids);

    expect(definitions.length).toBeGreaterThan(0);
    for (const { definition } of definitions) {
      expect(definition.color).toBeInstanceOf(THREE.Color);
      // Read back in sRGB, as the file has it: a second conversion from
      // sRGB wouldn't land on one of its colors.
      expect(fileColors).toContain(definition.color.getHex());
    }
  });

  test("an item's attributes name their types", async () => {
    const attributes = await model.getItem(ids[0]).getAttributes();

    expect(attributes!.get("Name")).toStrictEqual({
      value: expect.any(String),
      type: "IFCLABEL",
    });
  });
});

describe("highlights", () => {
  /** Grey tells a second sRGB conversion apart, which pure red doesn't. */
  const grey: MaterialDefinition = {
    color: new THREE.Color(0x808080),
    renderedFaces: RenderedFaces.ONE,
    opacity: 1,
    transparent: false,
  };

  /** The highlighted items, in the order the worker lists them. */
  let highlighted: number[];

  beforeAll(async () => {
    await model.highlight([ids[0]], grey);
    await model.setOpacity([ids[1]], 0.5);
    highlighted = await model.getHighlightItemIds();
  });

  afterAll(() => model.resetHighlight());

  test("getHighlight() returns colors as THREE.Color", async () => {
    const [colored, faded, none] = await model.getHighlight(ids.slice(0, 3));

    expect(colored.color).toBeInstanceOf(THREE.Color);
    expect(colored.color.getHex()).toBe(0x808080);
    // A highlight that only changes the opacity has no color to rebuild.
    expect(faded).toMatchObject({ opacity: 0.5 });
    expect(faded.color).toBeUndefined();
    expect(none).toBeUndefined();
  });

  /**
   * Each kind of result getSequenced() can return that a method of its own
   * returns too, with that method.
   */
  const sequenced: [
    ItemInformationType,
    (localIds: number[]) => Promise<unknown>,
  ][] = [
    ["guid", (localIds) => model.getGuidsByLocalIds(localIds)],
    ["visibility", (localIds) => model.getVisible(localIds)],
    ["children", (localIds) => model.getItemsChildren(localIds)],
    ["data", (localIds) => model.getItemsData(localIds)],
    ["geometry", (localIds) => model.getItemsGeometry(localIds)],
    ["highlight", (localIds) => model.getHighlight(localIds)],
    ["mergedBoxes", (localIds) => model.getMergedBox(localIds)],
  ];

  test("getHighlightItemIds() returns the highlighted items", () => {
    expect(highlighted).toStrictEqual(ids.slice(0, 2));
  });

  test.each(sequenced)(
    "getSequenced() returns %s as the method for it does",
    async (result, method) => {
      const response = await model.getSequenced(result, ["highlighted"]);

      expect(response).toStrictEqual(await method(highlighted));
    },
  );

  test("getSequenced() returns null for a result the worker doesn't know", async () => {
    const response = await model.getSequenced("unknown" as any, []);

    expect(response).toBeNull();
  });
});

// Last: the edit stays for the rest of the file.
describe("after an edit", () => {
  const shift = 100;
  /** The item the edit moves along x, and one it leaves alone. */
  let moved: number;
  let still: number;

  beforeAll(async () => {
    const [[localId, transform]] = await model.getGlobalTransforms();
    const [x, y, z] = transform.position;
    await fragments.editor.edit(model.modelId, [
      {
        type: EditRequestType.UPDATE_GLOBAL_TRANSFORM,
        localId,
        data: { ...transform, position: [x + shift, y, z] },
      },
    ]);
    [moved] = await model.getEditedElements();
    still = ids.find((id) => id !== moved)!;
  });

  test("the edited items are in a model of their own", () => {
    expect(moved).toBe(ids[0]);
    expect(model._getDeltaModel()).toBeInstanceOf(FragmentsModel);
  });

  test("getItemsGeometry() returns the edited transforms as THREE.Matrix4", async () => {
    const [edited, untouched] = await model.getItemsGeometry([moved, still]);

    const [original] = local.getItemsGeometry([moved]);
    expect(edited).toHaveLength(original.length);
    for (const { transform, sampleId } of edited) {
      expect(transform).toBeInstanceOf(THREE.Matrix4);
      const before = original.find((mesh) => mesh.sampleId === sampleId)!;
      const [dx, dy, dz] = new THREE.Vector3()
        .setFromMatrixPosition(transform)
        .sub(new THREE.Vector3().setFromMatrixPosition(before.transform));
      expect(dx).toBeCloseTo(shift);
      expect(dy).toBeCloseTo(0);
      expect(dz).toBeCloseTo(0);
    }
    expect(untouched).toStrictEqual(local.getItemsGeometry([still])[0]);
  });

  test("getGeometries() returns the edited transforms as THREE.Matrix4", async () => {
    const [meshes] = await model.getItemsGeometry([moved]);
    const representations = meshes.map((mesh) => mesh.representationId!);

    const geometries = await model.getGeometries(representations);

    expect(geometries).toHaveLength(new Set(representations).size);
    for (const { transform } of geometries) {
      expect(transform).toBeInstanceOf(THREE.Matrix4);
    }
  });
});
