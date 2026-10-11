import { readFile } from "fs/promises";
import * as path from "path";
import * as FB from "flatbuffers";
import pako from "pako";
import { describe, expect, test } from "vitest";
import * as TFB from "../../../Schema";
import { SingleThreadedFragmentsModel } from "../../../FragmentsModels";
import { getRevision, migrate } from "../..";
import { registry } from "../../registry";
import { Copier } from "../../src/layout/copier";

const here = import.meta.dirname;
const repoRoot = path.resolve(here, "../../../../../..");
const BASELINE = "20250710102015";
const THIS = "20251023113211";

// Later migrations are theirs to test: these run on the registry as it was
// when this one was the newest.
const steps = registry.steps.slice(
  0,
  registry.steps.findIndex((step) => step.id === THIS) + 1,
);
const options = { registry: { steps, unstamped: THIS } };

const fixture = async (name: string) =>
  new Uint8Array(await readFile(path.join(here, "fixtures", name)));

const resource = async (name: string) =>
  new Uint8Array(await readFile(path.join(repoRoot, "resources/frags", name)));

const generated = (bytes: Uint8Array) =>
  TFB.Model.getRootAsModel(new FB.ByteBuffer(bytes));

const strings = (length: number, at: (index: number) => string) =>
  Array.from({ length }, (_, index) => at(index));

describe("files written by 3.1", () => {
  // Converted from resources/ifc with @thatopen/fragments@3.1.7 off npm.
  test("the current code misreads one", async () => {
    const stale = generated(
      pako.inflate(await fixture("school_str.3.1.7.frag")),
    );
    // The file has no relation names. What is read here is the table that
    // used to sit in that slot.
    expect(stale.relationNamesLength()).toBeGreaterThan(0);
  });

  test.each(["just_wall.3.1.7.frag", "school_str.3.1.7.frag"])(
    "%s is recognized, though it carries no revision",
    async (name) => {
      const info = getRevision(await fixture(name), options);
      expect(info.revision).toBe(BASELINE);
      expect(info.stamped).toBe(false);
      expect(info.readable).toBe(false);
      expect(info.pending[0]).toMatchObject({ id: THIS, rewrite: true });
    },
  );

  test("a file written by 3.0 is recognized too", async () => {
    const info = getRevision(await fixture("just_wall.3.0.11.frag"));
    expect(info.revision).toBe(BASELINE);
  });

  test.each([
    "small_test.frag",
    "school_str.frag",
    "school_arq.frag",
    "synthetic_large_grid.frag",
  ])("%s, written since, is not taken for one", async (name) => {
    const info = getRevision(await resource(name), options);
    expect(info.revision).toBe(THIS);
    expect(info.pending).toEqual([]);
  });

  test("migrating one gives what the current importer writes for the same IFC", async () => {
    const result = await migrate(await fixture("school_str.3.1.7.frag"), {
      ...options,
      raw: true,
    });
    expect(result.from).toBe(BASELINE);
    expect(result.to).toBe(THIS);
    expect(result.applied[0]).toMatchObject({
      id: THIS,
      report: { droppedAlignments: 0, droppedGeometrySamples: 0 },
    });

    const migrated = generated(result.bytes);
    // resources/frags/school_str.frag is the same IFC converted by 3.4.
    const native = generated(pako.inflate(await resource("school_str.frag")));
    expect(migrated.relationNamesLength()).toBe(0);
    expect(migrated.uniqueAttributesLength()).toBe(0);
    expect(migrated.localIdsArray()).toEqual(native.localIdsArray());
    expect(migrated.guidsItemsArray()).toEqual(native.guidsItemsArray());
    expect(
      strings(migrated.categoriesLength(), (i) => migrated.categories(i)),
    ).toEqual(strings(native.categoriesLength(), (i) => native.categories(i)));

    // The ids 3.1 did not have are the ones 3.4 assigns.
    const a = migrated.meshes()!;
    const b = native.meshes()!;
    expect(a.globalTransformIdsArray()).toEqual(b.globalTransformIdsArray());
    expect(a.representationIdsArray()).toEqual(b.representationIdsArray());
    expect(a.materialIdsArray()).toEqual(b.materialIdsArray());
    expect(a.sampleIdsArray()).toEqual(b.sampleIdsArray());
    expect(a.localTransformIdsArray()).toEqual(b.localTransformIdsArray());
    expect(migrated.maxLocalId()).toBe(native.maxLocalId());
    expect(result.applied[0].report!.assignedIds).toBe(
      a.globalTransformIdsLength() +
        a.representationIdsLength() +
        a.materialIdsLength() +
        a.sampleIdsLength() +
        a.localTransformIdsLength(),
    );
  });

  test.each(["just_wall.3.1.7.frag", "just_wall.3.0.11.frag"])(
    "%s loads once migrated, and is then left alone",
    async (name) => {
      const stale = await fixture(name);
      const result = await migrate(stale, options);
      const model = new SingleThreadedFragmentsModel("wall", result.bytes);
      await model.ready;
      expect(model.getMetadata().revision).toBe(result.to);
      expect(model.getCategories()).toContain("IFCWALL");
      expect(model.getMaterialsIds().length).toBeGreaterThan(0);
      model.dispose();

      const again = await migrate(result.bytes, options);
      expect(again.applied).toEqual([]);
      expect(again.bytes).toBe(result.bytes);
      expect(getRevision(result.bytes, options)).toMatchObject({
        revision: result.to,
        stamped: true,
        pending: [],
      });
    },
  );

  test("what the file had in the removed fields is counted, and the rest lands in its new slot", async () => {
    // No IFC at hand has alignments, so this file is written by hand in the
    // 3.1 layout.
    const transform = {
      position: { x: 0, y: 0, z: 0 },
      x_direction: { x: 1, y: 0, z: 0 },
      y_direction: { x: 0, y: 1, z: 0 },
    };
    const stale = Copier.write(registry.steps[0].schema!, {
      metadata: JSON.stringify({ schema: "IFC4X3" }),
      guids: [],
      guids_items: [],
      max_local_id: 10,
      local_ids: [1, 2],
      categories: ["IFCALIGNMENT", "IFCWALL"],
      meshes: {
        coordinates: transform,
        meshes_items: [],
        samples: [],
        representations: [],
        materials: [{ r: 255, g: 0, b: 0, a: 255 }],
        circle_extrusions: [],
        shells: [],
        local_transforms: [transform],
        global_transforms: [],
      },
      guid: "hand-written",
      alignments: [
        { absolute: [0, 1], horizontal: [0], vertical: [1] },
        { absolute: [2] },
      ],
      geometries: {
        samples: [
          { id: 0, transform: 0 },
          { id: 1, transform: 0 },
          { id: 2, transform: 0 },
        ],
        representations: [],
        transforms: [transform],
        lines: [{ points: [0, 0, 0, 1, 1, 1] }],
      },
      unique_attributes: ["Name", "Tag"],
      relation_names: ["ContainedInStructure"],
    });
    expect(getRevision(stale).revision).toBe(BASELINE);

    const result = await migrate(stale, options);
    expect(result.applied[0].report).toEqual({
      droppedAlignments: 2,
      droppedGeometrySamples: 3,
      assignedIds: 2,
    });
    const model = generated(result.bytes);
    expect(
      strings(model.uniqueAttributesLength(), (i) => model.uniqueAttributes(i)),
    ).toEqual(["Name", "Tag"]);
    expect(
      strings(model.relationNamesLength(), (i) => model.relationNames(i)),
    ).toEqual(["ContainedInStructure"]);
    expect(model.meshes()!.materialIdsArray()).toEqual(new Uint32Array([10]));
    expect(model.meshes()!.localTransformIdsArray()).toEqual(
      new Uint32Array([11]),
    );
    expect(model.maxLocalId()).toBe(13);
    expect(JSON.parse(model.metadata()!)).toEqual({
      schema: "IFC4X3",
      revision: THIS,
    });
  });
});
