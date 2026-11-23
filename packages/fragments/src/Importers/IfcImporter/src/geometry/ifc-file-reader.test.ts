import { readFile } from "fs/promises";
import * as path from "path";
import * as THREE from "three";
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
 * A 10 m box whose placement is rotated 10 degrees about Z. The x direction of
 * its transform used to be rounded to 3 decimals while the y direction kept 5,
 * which skewed the basis and moved the far end of the box by about 2 mm.
 */
test("rotated placements keep sub-millimetre precision", { timeout: 30000 }, async () => {
  const importer = new IfcImporter();
  importer.wasm = { path: webIfcDir + path.sep, absolute: true };
  const bytes = await readFile(
    path.resolve(assetDir, "resources/ifc/rotated-placement.ifc"),
  );
  const model = new SingleThreadedFragmentsModel(
    "rotated_placement",
    await importer.process({ bytes }),
  );

  const localIds = model.getLocalIdsByGuids([
    "0RotBoxAAAAAAAAAAAAAA0",
  ]) as number[];
  const [[mesh]] = model.getItemsGeometry(localIds);
  const [cx, cy, cz] = model.getCoordinates();

  // The box spans x 0..10, y -0.1..0.1, z 0..0.2 in its placement, which is
  // rotated 10 degrees about the IFC Z axis. Three.js axes are (x, z, -y).
  const angle = (10 * Math.PI) / 180;
  const corners: THREE.Vector3[] = [];
  for (const x of [0, 10]) {
    for (const y of [-0.1, 0.1]) {
      for (const z of [0, 0.2]) {
        const wx = Math.cos(angle) * x - Math.sin(angle) * y;
        const wy = Math.sin(angle) * x + Math.cos(angle) * y;
        corners.push(new THREE.Vector3(wx, z, -wy));
      }
    }
  }

  const positions = mesh.positions!;
  const vertex = new THREE.Vector3();
  let maxError = 0;
  for (let i = 0; i < positions.length; i += 3) {
    vertex
      .set(positions[i], positions[i + 1], positions[i + 2])
      .applyMatrix4(mesh.transform)
      .sub(new THREE.Vector3(cx, cy, cz));
    const error = Math.min(...corners.map((c) => c.distanceTo(vertex)));
    maxError = Math.max(maxError, error);
  }

  expect(maxError).toBeLessThan(1e-4);
});
