import { readFile } from "fs/promises";
import * as path from "path";
import { expect, test } from "vitest";
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
test("geometries differing only in interior detail are not deduplicated", async () => {
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
