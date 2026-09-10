import { readFile } from "fs/promises";
import * as path from "path";
import { ByteBuffer } from "flatbuffers";
import { afterEach, expect, test, vi } from "vitest";
import { IfcImporter } from "../..";
import { GRID_CATEGORY, GridData } from "../../../../FragmentsModels";
import * as TFB from "../../../../Schema";

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

// Converting an IFC in-process takes a few seconds; vitest's default 5s
// timeout is too tight for it.
const CONVERSION_TIMEOUT = 30_000;

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Converts an IFC fixture from `resources/ifc` and returns the grid items
 * (category {@link GRID_CATEGORY}, attribute "data") found in the produced
 * fragments flatbuffer.
 */
async function convertAndGetGrids(ifcName: string): Promise<GridData[]> {
  const bytes = new Uint8Array(
    await readFile(path.resolve(assetDir, "resources", "ifc", ifcName)),
  );
  const importer = new IfcImporter();
  importer.wasm = { path: webIfcDir + path.sep, absolute: true };
  const fragBytes = await importer.process({ bytes, raw: true });

  const buffer = new ByteBuffer(fragBytes);
  const model = TFB.Model.getRootAsModel(buffer);
  const grids: GridData[] = [];
  for (let i = 0; i < model.categoriesLength(); i++) {
    if (model.categories(i) !== GRID_CATEGORY) continue;
    const attr = model.attributes(i);
    if (!attr) continue;
    for (let j = 0; j < attr.dataLength(); j++) {
      const [name, value] = JSON.parse(attr.data(j) as string);
      if (name === "data") grids.push(JSON.parse(value));
    }
  }
  return grids;
}

const gridWarnings = (warn: ReturnType<typeof vi.spyOn>) =>
  warn.mock.calls.filter(
    ([first]) => typeof first === "string" && first.includes("IFCGRID"),
  );

test(
  "importing a valid grid yields its axes",
  async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const grids = await convertAndGetGrids("grids-baseline.ifc");

    expect(grids).toHaveLength(1);
    const [grid] = grids;
    expect(grid.id).toBe(226);
    expect(grid.uAxes.map(({ tag }) => tag)).toEqual(["A", "B"]);
    expect(grid.vAxes.map(({ tag }) => tag)).toEqual(["1", "2"]);
    expect(grid.wAxes).toEqual([]);
    // Two 3D points per polyline axis.
    for (const { tag, curve } of [...grid.uAxes, ...grid.vAxes]) {
      expect(curve, `axis ${tag}`).toHaveLength(6);
    }
    expect(gridWarnings(warn)).toEqual([]);
  },
  CONVERSION_TIMEOUT,
);

// Regression for https://github.com/ThatOpen/engine_fragment/issues/263:
// IFCGRID's ObjectPlacement is optional in the schema, but the importer read
// `ObjectPlacement.value` unguarded and its all-or-nothing catch dropped
// EVERY grid in the file when a single placement-less grid threw.
test(
  "a grid without ObjectPlacement does not drop the other grids",
  async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const grids = await convertAndGetGrids("grids-one-placementless.ifc");

    // Both grids survive: the placement-less one (#238) simply gets an
    // identity placement.
    expect(grids.map(({ id }) => id)).toEqual([226, 238]);
    const valid = grids.find(({ id }) => id === 226) as GridData;
    expect(valid.uAxes.map(({ tag }) => tag)).toEqual(["A", "B"]);
    expect(valid.vAxes.map(({ tag }) => tag)).toEqual(["1", "2"]);
    const placementless = grids.find(({ id }) => id === 238) as GridData;
    expect(placementless.uAxes.map(({ tag }) => tag)).toEqual(["X1"]);
    expect(placementless.vAxes.map(({ tag }) => tag)).toEqual(["Y1"]);

    // The fallback to the identity placement is reported, not silent.
    const warnings = gridWarnings(warn);
    expect(warnings).toHaveLength(1);
    expect(warnings[0][0]).toContain("#238");
    expect(warnings[0][0]).toContain("ObjectPlacement");
  },
  CONVERSION_TIMEOUT,
);
