import { ByteBuffer } from "flatbuffers";
import { readFile } from "fs/promises";
import * as path from "path";
import { afterEach, expect, test, vi } from "vitest";
import * as WEBIFC from "web-ifc";
import { IfcImporter } from "../..";
import { GRID_CATEGORY, GridData } from "../../../../FragmentsModels";
import * as FRAGS from "../../../../index";
import * as TFB from "../../../../Schema";
import { GridReader } from "./grid-reader";

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

/** A web-ifc API with each model open, in the order given. */
async function openModels(...models: Uint8Array[]) {
  const webIfc = new WEBIFC.IfcAPI();
  webIfc.SetWasmPath(webIfcDir + path.sep, true);
  await webIfc.Init();
  const modelIds = models.map((bytes) => webIfc.OpenModel(bytes));
  return { webIfc, modelIds };
}

/** A web-ifc API with each fixture from `resources/ifc` open, in the order given. */
async function openFixtures(...ifcNames: string[]) {
  const models = await Promise.all(
    ifcNames.map(
      async (ifcName) =>
        new Uint8Array(
          await readFile(path.resolve(assetDir, "resources", "ifc", ifcName)),
        ),
    ),
  );
  return openModels(...models);
}

/**
 * An IFC4 model in millimetres holding one grid, #30, at the origin. `lines`
 * declares its axes; #10 is a 2D point list running up the Y axis, and #15 a
 * polyline at x = 1000 for an axis the grid needs besides the one under test.
 */
const gridModel = (lines: string) =>
  new TextEncoder().encode(`ISO-10303-21;
HEADER;
FILE_DESCRIPTION((''),'2;1');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#2=IFCUNITASSIGNMENT((#1));
#3=IFCCARTESIANPOINT((0.,0.,0.));
#4=IFCAXIS2PLACEMENT3D(#3,$,$);
#5=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#4,$);
#6=IFCPROJECT('0p',$,'Project',$,$,$,$,(#5),#2);
#7=IFCLOCALPLACEMENT($,#4);
#10=IFCCARTESIANPOINTLIST2D(((0.,0.),(0.,4000.),(0.,10000.)),$);
#13=IFCCARTESIANPOINT((1000.,0.));
#14=IFCCARTESIANPOINT((1000.,10000.));
#15=IFCPOLYLINE((#13,#14));
${lines}
ENDSEC;
END-ISO-10303-21;
`);

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

test(
  "each grid carries its own IFC GlobalId as guid",
  async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    // Two grids with distinct GlobalIds, so a guid read from the wrong entity
    // (or shared between grids) would not match.
    const grids = await convertAndGetGrids("grids-one-placementless.ifc");

    expect(grids.map(({ id, guid }) => ({ id, guid }))).toEqual([
      { id: 226, guid: "2jMlNfpwHEGgnr29aaaaa1" },
      { id: 238, guid: "2jMlNfpwHEGgnr29aaaaa2" },
    ]);
  },
  CONVERSION_TIMEOUT,
);

// GlobalId is mandatory in the schema but real files break that, and the guid
// read runs inside the per-grid catch added for issues #263/#264: reading it
// unguarded would throw and silently drop the grid, which is the very failure
// mode that catch exists to contain.
test(
  "each grid carries its IFC Name",
  async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const grids = await convertAndGetGrids("grids-radial-axes.ifc");

    expect(grids.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: 226, name: "ValidGrid" },
      { id: 248, name: "RadialGrid" },
    ]);
  },
  CONVERSION_TIMEOUT,
);

test(
  "a grid without GlobalId still imports, with no guid",
  async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const grids = await convertAndGetGrids("grids-one-guidless.ifc");

    // Both grids survive; the guid-less one simply carries no guid.
    expect(grids.map(({ id }) => id)).toEqual([226, 238]);
    const valid = grids.find(({ id }) => id === 226) as GridData;
    expect(valid.guid).toBe("2jMlNfpwHEGgnr29aaaaa1");
    const guidless = grids.find(({ id }) => id === 238) as GridData;
    expect(guidless.guid).toBeUndefined();

    // Its geometry is intact, not a salvaged husk.
    expect(guidless.uAxes.map(({ tag }) => tag)).toEqual(["X1"]);
    expect(guidless.vAxes.map(({ tag }) => tag)).toEqual(["Y1"]);

    // Nothing was skipped, so nothing is reported.
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

// Regression for https://github.com/ThatOpen/engine_fragment/issues/264:
// grid axes whose curve is not a point list (IFCCIRCLE, IFCLINE,
// IFCTRIMMEDCURVE...) were silently skipped, leaving no trace of them in the
// converted grid.
test(
  "unsupported grid axis curves are surfaced instead of dropped silently",
  async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const grids = await convertAndGetGrids("grids-radial-axes.ifc");

    expect(grids.map(({ id }) => id)).toEqual([226, 248]);

    // The purely-polyline grid is untouched and reports nothing.
    const valid = grids.find(({ id }) => id === 226) as GridData;
    expect(valid.unsupportedAxes).toBeUndefined();

    // The radial grid keeps its polyline axes...
    const radial = grids.find(({ id }) => id === 248) as GridData;
    expect(radial.uAxes.map(({ tag }) => tag)).toEqual(["A", "B"]);
    expect(radial.vAxes.map(({ tag }) => tag)).toEqual(["1", "2"]);
    // ...never emits an empty-curve axis (the grid label code slices the
    // first/last points of each curve, so an empty one would produce NaNs)...
    for (const { tag, curve } of [...radial.uAxes, ...radial.vAxes]) {
      expect(curve.length, `axis ${tag}`).toBeGreaterThan(0);
    }
    // ...and reports the axes it could not represent, with their curve types.
    expect(radial.unsupportedAxes).toEqual([
      { tag: "R1", curveType: "IFCCIRCLE" },
      { tag: "L1", curveType: "IFCLINE" },
      { tag: "T1", curveType: "IFCTRIMMEDCURVE" },
    ]);

    // The skipped axes are also reported at import time.
    const warnings = gridWarnings(warn);
    expect(warnings).toHaveLength(1);
    const [message] = warnings[0];
    expect(message).toContain("#248");
    for (const text of ["R1", "L1", "T1", "IFCCIRCLE"]) {
      expect(message).toContain(text);
    }
  },
  CONVERSION_TIMEOUT,
);

test("reads the grids of the model it is given, not only the first one", async () => {
  const { webIfc, modelIds } = await openFixtures(
    "grids-baseline.ifc",
    "grids-radial-axes.ifc",
  );
  const [baseline, radial] = modelIds;
  expect(radial).not.toBe(baseline);

  const ids = (modelId: number) =>
    new GridReader(webIfc, modelId).read().value.map(({ id }) => id);

  expect(ids(radial)).toEqual([226, 248]);
  expect(ids(baseline)).toEqual([226]);

  webIfc.Dispose();
});

test("an indexed polycurve runs through its segments, in their order", async () => {
  const { webIfc } = await openModels(
    gridModel(`#11=IFCINDEXEDPOLYCURVE(#10,$,$);
#12=IFCINDEXEDPOLYCURVE(#10,(IFCLINEINDEX((3,2)),IFCLINEINDEX((2,1))),$);
#20=IFCGRIDAXIS('1',#11,.T.);
#21=IFCGRIDAXIS('A',#12,.T.);
#22=IFCGRIDAXIS('B',#15,.T.);
#30=IFCGRID('0g',$,'Grid',$,$,#7,$,(#20),(#21,#22),$,.RECTANGULAR.);`),
  );

  const {
    value: [grid],
    errors,
  } = new GridReader(webIfc, 0).read();

  // Without segments, every point in turn.
  expect(grid.uAxes).toEqual([
    { tag: "1", curve: [0, 0, 0, 0, 4, 0, 0, 10, 0] },
  ]);
  // With them, the order they give: here the list reversed, its joint once.
  expect(grid.vAxes).toEqual([
    { tag: "A", curve: [0, 10, 0, 0, 4, 0, 0, 0, 0] },
    { tag: "B", curve: [1, 0, 0, 1, 10, 0] },
  ]);
  expect(grid.unsupportedAxes).toBeUndefined();
  expect(errors).toEqual([]);

  webIfc.Dispose();
});

test("an arc segment is reported, not drawn as straight lines", async () => {
  const { webIfc } = await openModels(
    gridModel(`#11=IFCINDEXEDPOLYCURVE(#10,(IFCLINEINDEX((1,2)),IFCARCINDEX((2,3,1))),$);
#20=IFCGRIDAXIS('1',#11,.T.);
#21=IFCGRIDAXIS('A',#15,.T.);
#30=IFCGRID('0g',$,'Grid',$,$,#7,$,(#20),(#21),$,.RECTANGULAR.);`),
  );

  const {
    value: [grid],
    errors,
  } = new GridReader(webIfc, 0).read();

  expect(grid.uAxes).toEqual([]);
  expect(grid.vAxes.map(({ tag }) => tag)).toEqual(["A"]);
  const arc = {
    tag: "1",
    curveType: "IFCINDEXEDPOLYCURVE with IFCARCINDEX segments",
  };
  expect(grid.unsupportedAxes).toEqual([arc]);
  expect(errors).toEqual([
    { kind: "unsupportedAxes", gridId: 30, axes: [arc] },
  ]);

  webIfc.Dispose();
});

test("returns what it skips in errors, and logs nothing itself", async () => {
  const warn = vi.spyOn(console, "warn");
  const error = vi.spyOn(console, "error");
  // #30's axis is a point, not an IFCGRIDAXIS, so it has no AxisCurve.
  const { webIfc } = await openModels(
    gridModel(`#21=IFCGRIDAXIS('A',#15,.T.);
#30=IFCGRID('0g',$,'Unreadable',$,$,#7,$,(#13),(#21),$,.RECTANGULAR.);
#31=IFCGRID('1g',$,'Placementless',$,$,$,$,(#21),(#21),$,.RECTANGULAR.);`),
  );

  const { value, errors } = new GridReader(webIfc, 0).read();

  expect(value.map(({ id }) => id)).toEqual([31]);
  expect(errors).toEqual([
    { kind: "unreadableGrid", gridId: 30, cause: expect.any(TypeError) },
    { kind: "noPlacement", gridId: 31 },
  ]);
  expect(warn).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();
  webIfc.Dispose();
});

test("returns a model whose grids cannot be listed in errors", () => {
  const error = vi.spyOn(console, "error");
  const fault = new Error("no coordination matrix");
  const webIfc = {
    GetCoordinationMatrix: () => {
      throw fault;
    },
  } as unknown as WEBIFC.IfcAPI;

  expect(new GridReader(webIfc, 0).read()).toEqual({
    value: [],
    errors: [{ kind: "unreadableModel", cause: fault }],
  });
  expect(error).not.toHaveBeenCalled();
});

test("returns an axis it cannot represent in errors", async () => {
  const { webIfc } = await openFixtures("grids-radial-axes.ifc");

  const { errors } = new GridReader(webIfc, 0).read();

  expect(errors).toEqual([
    {
      kind: "unsupportedAxes",
      gridId: 248,
      axes: [
        { tag: "R1", curveType: "IFCCIRCLE" },
        { tag: "L1", curveType: "IFCLINE" },
        { tag: "T1", curveType: "IFCTRIMMEDCURVE" },
      ],
    },
  ]);
  webIfc.Dispose();
});

test("is part of the package's public API", () => {
  expect(FRAGS.GridReader).toBe(GridReader);
});
