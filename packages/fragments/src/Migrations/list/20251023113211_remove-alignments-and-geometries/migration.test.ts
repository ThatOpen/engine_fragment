import { readFile } from "fs/promises";
import * as path from "path";
import * as FB from "flatbuffers";
import pako from "pako";
import { describe, expect, test } from "vitest";
import * as TFB from "../../../Schema";
import { SingleThreadedFragmentsModel } from "../../../FragmentsModels";
import { VirtualFragmentsModel } from "../../../FragmentsModels/src/virtual-model";
import { IfcImporter } from "../../../Importers";
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
      report: { convertedAlignments: 0, droppedAlignments: 0 },
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

  // No real file at hand has unique attributes or relation names, so these
  // are written by hand in the 3.1 layout.
  const transform = {
    position: { x: 0, y: 0, z: 0 },
    x_direction: { x: 1, y: 0, z: 0 },
    y_direction: { x: 0, y: 1, z: 0 },
  };
  const handWritten = (root: Record<string, unknown>) =>
    Copier.write(registry.steps[0].schema!, {
      metadata: JSON.stringify({ schema: "IFC4X3" }),
      guids: [],
      guids_items: [],
      max_local_id: 10,
      local_ids: [1, 2],
      categories: ["IFCSITE", "IFCWALL"],
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
      ...root,
    });

  test("the fields after the removed ones land in their new slot", async () => {
    const stale = handWritten({
      alignments: [],
      geometries: {
        samples: [],
        representations: [],
        transforms: [],
        lines: [],
      },
      unique_attributes: ["Name", "Tag"],
      relation_names: ["ContainedInStructure"],
    });
    expect(getRevision(stale).revision).toBe(BASELINE);

    const result = await migrate(stale, options);
    expect(result.applied[0].report).toEqual({
      convertedAlignments: 0,
      droppedAlignments: 0,
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

  test("the alignments of a file written by 3.0 are counted, not converted", async () => {
    // 3.0 laid its civil geometry out another way, which no descriptor here
    // covers. Such a file lacks the two fields 3.1 added to the root.
    const stale = handWritten({
      alignments: [{ absolute: [0] }, { absolute: [1] }],
      geometries: {
        samples: [],
        representations: [],
        transforms: [],
        lines: [],
      },
    });
    expect(getRevision(stale).revision).toBe(BASELINE);
    const result = await migrate(stale, options);
    expect(result.applied[0].report).toMatchObject({
      convertedAlignments: 0,
      droppedAlignments: 2,
    });
    expect(generated(result.bytes).categoriesLength()).toBe(2);
  });
});

// resources/ifc/alignment.ifc, converted with @thatopen/fragments@3.1.7. It
// holds two alignments: three horizontal curves over two vertical ones, and
// two over one.
describe("the alignments of a 3.1 file", () => {
  type Curve = { points: ArrayLike<number>; type: number };
  type Alignment = Record<"absolute" | "horizontal" | "vertical", Curve[]>;
  const KINDS = ["absolute", "horizontal", "vertical"] as const;

  /** What the current code reads as the alignments of a raw file. */
  const alignmentsOf = (bytes: Uint8Array) => {
    const model = new VirtualFragmentsModel(
      "m",
      bytes as any,
      undefined as any,
    );
    const alignments = model.getAlignments() as Alignment[];
    const ids = model.getItemsOfCategories([/^ThatOpenAlignment$/]);
    const result = {
      alignments,
      ids: ids.ThatOpenAlignment ?? [],
      maxLocalId: model.getMaxLocalId(),
    };
    model.dispose();
    return result;
  };

  const shape = (alignments: Alignment[]) =>
    alignments.map((alignment) =>
      KINDS.map((kind) => alignment[kind].map((curve) => curve.type)),
    );

  test("become the items 3.2 keeps alignments as, curve for curve", async () => {
    // What web-ifc gave the 3.1.7 importer for this IFC, laid out the way the
    // importer lays alignments out since 3.2: first curve and first point
    // first, each curve with its own type.
    const file = path.join(here, "fixtures", "alignment.3.1.7.expected.json");
    const expected: Alignment[] = JSON.parse(await readFile(file, "utf-8"));

    const result = await migrate(await fixture("alignment.3.1.7.frag"), {
      ...options,
      raw: true,
    });
    expect(result.applied[0].report).toMatchObject({
      convertedAlignments: 2,
      droppedAlignments: 0,
    });

    const { alignments, ids, maxLocalId } = alignmentsOf(result.bytes);
    expect(shape(alignments)).toEqual(shape(expected));
    // lines 1, clothoid 2, arc 3, parabola 4
    expect(shape(alignments)).toEqual([
      [
        [1, 3, 2],
        [1, 3, 2],
        [1, 4],
      ],
      [[1, 3], [1, 3], [1]],
    ]);
    for (let a = 0; a < expected.length; a++) {
      for (const kind of KINDS) {
        expected[a][kind].forEach((curve, index) => {
          // 3.1 stored the points as 32-bit floats.
          const points = Array.from(curve.points, Math.fround);
          expect(alignments[a][kind][index].points).toEqual(points);
        });
      }
    }

    // The items take the next ids of the file, in the order of the alignments.
    expect(ids).toEqual([maxLocalId - 2, maxLocalId - 1]);
  });

  test("come out as the current importer writes them for the same IFC", async () => {
    const importer = new IfcImporter();
    const webIfc = path.dirname(import.meta.resolve("web-ifc"));
    importer.wasm = {
      path: webIfc.replace("file://", "") + path.sep,
      absolute: true,
    };
    const ifc = await readFile(
      path.join(repoRoot, "resources/ifc/alignment.ifc"),
    );
    const native = (await importer.process({
      bytes: ifc,
      raw: true,
    })) as Uint8Array;

    const migrated = await migrate(await fixture("alignment.3.1.7.frag"), {
      ...options,
      raw: true,
    });
    // The curves and their types. Not the points: the two were sampled by
    // different versions of web-ifc, which do not cut a clothoid alike.
    expect(shape(alignmentsOf(migrated.bytes).alignments)).toEqual(
      shape(alignmentsOf(native).alignments),
    );
  }, 30000);
});
