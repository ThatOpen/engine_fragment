import { readFile } from "fs/promises";
import * as path from "path";
import { expect, test, vi } from "vitest";
import * as WEBIFC from "web-ifc";
import { IfcImporter } from "../../..";
import { SingleThreadedFragmentsModel } from "../../../../FragmentsModels";

const assetDir = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
);

const webIfcDir = path.dirname(import.meta.resolve("web-ifc"));

/**
 * The x coordinates (in mm) that lie inside the plate outline, i.e. the corners
 * of its bolt holes, deduplicated and sorted.
 */
const xPositions = (positions: ArrayLike<number>) => {
  const corners = new Set<number>();
  for (let i = 0; i < positions.length; i += 3) {
    const x = Math.round(positions[i] * 1000);
    corners.add(x);
  }
  return Array.from(corners).sort((a, b) => a - b);
};

/**
 * Repro from #237: two plates whose geometry shares triangle/vertex count,
 * area, volume, centroid and bounding box, and differs only in where the bolt
 * holes sit. Before the vertex fold entered the dedup key, both hashed to the
 * same value, so the second plate was dropped and rendered with the holes of
 * the first one.
 */
test("geometries differing only in interior detail are not deduplicated", { timeout: 30000 }, async () => {
  const importer = new IfcImporter();
  importer.wasm = { path: webIfcDir + path.sep, absolute: true };
  const bytes = await readFile(
    path.resolve(assetDir, "resources/ifc/dedup_repro.ifc"),
  );
  const model = new SingleThreadedFragmentsModel(
    "dedup_repro",
    await importer.process({ bytes }),
  );

  const localIds = model.getLocalIdsByGuids([
    "0PlateAAAAAAAAAAAAAAAA0",
    "0PlateBBBBBBBBBBBBBBBB0",
  ]) as number[];

  const [[plateA], [plateB]] = model.getItemsGeometry(localIds);

  expect(plateA.representationId).not.toBe(plateB.representationId);

  // Each plate keeps its own holes: A's at ±120 mm, B's at ±40 mm.
  expect(xPositions(plateA.positions!)).toEqual([
    -200, -132, -108, 108, 132, 200,
  ]);
  expect(xPositions(plateB.positions!)).toEqual([-200, -52, -28, 28, 52, 200]);
});

/**
 * Many reinforcing bars that share one swept disk solid, as structural
 * exports do (one representation reused by thousands of bars).
 */
const rebarModel = (bars: number) => {
  const lines = [
    "ISO-10303-21;",
    "HEADER;",
    "FILE_DESCRIPTION((''),'2;1');",
    "FILE_NAME('rebars.ifc','',(''),(''),'','','');",
    "FILE_SCHEMA(('IFC4'));",
    "ENDSEC;",
    "DATA;",
    "#1=IFCCARTESIANPOINT((0.,0.,0.));",
    "#2=IFCAXIS2PLACEMENT3D(#1,$,$);",
    "#3=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#2,$);",
    "#4=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);",
    "#5=IFCUNITASSIGNMENT((#4));",
    "#6=IFCPROJECT('0Project00000000000000',$,'Rebars',$,$,$,$,(#3),#5);",
    "#7=IFCCARTESIANPOINT((1.,0.,0.));",
    "#8=IFCPOLYLINE((#1,#7));",
    "#9=IFCSWEPTDISKSOLID(#8,0.008,$,$,$);",
    "#10=IFCSHAPEREPRESENTATION(#3,'Body','AdvancedSweptSolid',(#9));",
  ];
  const ids: string[] = [];
  for (let i = 0; i < bars; i++) {
    const id = 100 + i * 5;
    const guid = `0Rebar${String(i).padStart(16, "0")}`;
    lines.push(
      `#${id}=IFCCARTESIANPOINT((0.,${i * 0.1},0.));`,
      `#${id + 1}=IFCAXIS2PLACEMENT3D(#${id},$,$);`,
      `#${id + 2}=IFCLOCALPLACEMENT($,#${id + 1});`,
      `#${id + 3}=IFCPRODUCTDEFINITIONSHAPE($,$,(#10));`,
    );
    ids.push(`#${id + 4}`);
    lines.push(
      `#${id + 4}=IFCREINFORCINGBAR('${guid}',$,'Bar',$,$,#${id + 2},#${id + 3},$,$,0.016,$,1.,.NOTDEFINED.,$);`,
    );
  }
  lines.push(
    `#90=IFCRELAGGREGATES('0Aggregate000000000000',$,$,$,#6,(${ids.join(",")}));`,
    "ENDSEC;",
    "END-ISO-10303-21;",
  );
  return new TextEncoder().encode(lines.join("\n"));
};

/**
 * Every IfcGeometry returned by GetGeometry is a copy in the WASM heap. The
 * rebar check used to keep one copy per bar, so structural models with tens of
 * thousands of bars ran out of memory during the conversion.
 */
test(
  "releases every geometry it reads from web-ifc",
  { timeout: 30000 },
  async () => {
    let read = 0;
    let released = 0;
    const getGeometry = WEBIFC.IfcAPI.prototype.GetGeometry;
    const spy = vi
      .spyOn(WEBIFC.IfcAPI.prototype, "GetGeometry")
      .mockImplementation(function tracked(this: WEBIFC.IfcAPI, modelID, geometryID) {
        const geometry = getGeometry.call(this, modelID, geometryID);
        const release = geometry.delete.bind(geometry);
        read++;
        geometry.delete = () => {
          released++;
          release();
        };
        return geometry;
      });

    try {
      const bars = 50;
      const importer = new IfcImporter();
      importer.wasm = { path: webIfcDir + path.sep, absolute: true };
      const model = new SingleThreadedFragmentsModel(
        "rebars",
        await importer.process({ bytes: rebarModel(bars) }),
      );

      expect(model.getItemsIdsWithGeometry()).toHaveLength(bars);
      expect(read).toBeGreaterThanOrEqual(bars);
      expect(released).toBe(read);
    } finally {
      spy.mockRestore();
    }
  },
);
