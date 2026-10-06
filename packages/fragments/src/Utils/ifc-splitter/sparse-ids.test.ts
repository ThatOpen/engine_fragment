import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import * as os from "os";
import * as path from "path";
import { afterAll, beforeAll, expect, test } from "vitest";
import { IfcSplitterNode } from "./node";

// Regression (#313): the splitter sized its tables and its passes by the
// HIGHEST `#id` in the file instead of by the number of entities. Three lines
// with one large id were enough to allocate hundreds of megabytes and spin for
// seconds, and an id past 2^31 - 1 wrapped inside the Int32Array that stores
// references, silently dropping whatever it pointed at.

const MAX_SPLIT_MS = 5_000;
// The ref buffer starts at 16 MB regardless of the file, so the bound has to
// sit above that. Sizing anything by the id costs 4 bytes per id: 200 MB for
// the smallest id used here.
const MAX_ARRAY_BUFFER_GROWTH = 64 * 1024 * 1024;

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "ifc-splitter-sparse-ids-"));
});

afterAll(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

const ifcOf = (dataLines: string[]) =>
  [
    "ISO-10303-21;",
    "HEADER;",
    "FILE_DESCRIPTION((''),'2;1');",
    "FILE_NAME('sparse.ifc','',(''),(''),'','','');",
    "FILE_SCHEMA(('IFC4'));",
    "ENDSEC;",
    "DATA;",
    ...dataLines,
    "ENDSEC;",
    "END-ISO-10303-21;",
    "",
  ].join("\n");

const dataLinesOf = async (filePath: string) =>
  (await readFile(filePath, "utf8"))
    .split("\n")
    .filter((line) => line.startsWith("#"));

/**
 * Runs `task` and reports how long it took and how far the array-buffer
 * memory rose above where it started, sampled at every progress event (the
 * last ones fire while the id -> groups index is alive).
 */
const measure = async <T>(
  splitter: IfcSplitterNode,
  task: () => Promise<T>,
) => {
  const baseline = process.memoryUsage().arrayBuffers;
  let peak = baseline;
  splitter.onProgress.add(() => {
    peak = Math.max(peak, process.memoryUsage().arrayBuffers);
  });
  const start = performance.now();
  const result = await task();
  const elapsed = performance.now() - start;
  return { result, elapsed, arrayBufferGrowth: peak - baseline };
};

const splitInTwo = async (name: string, dataLines: string[]) => {
  const inputPath = path.join(tmpDir, `${name}.ifc`);
  await writeFile(inputPath, ifcOf(dataLines));
  const splitter = new IfcSplitterNode();
  const outputPath = (groupId: number) =>
    path.join(tmpDir, `${name}_${groupId}.ifc`);
  const measured = await measure(splitter, () =>
    splitter.split(inputPath, 2, outputPath),
  );
  return {
    ...measured,
    inputPath,
    outputs: await Promise.all([0, 1].map((g) => dataLinesOf(outputPath(g)))),
  };
};

test("split costs the entities of the file, not its highest id", async () => {
  const project = "#1=IFCPROJECT('0YvctVUKr0kugbFTf53O9L',$,'P',$,$,$,$,$,$);";
  const wall = "#2=IFCWALL('1YvctVUKr0kugbFTf53O9L',$,'W',$,$,$,$,$,$);";
  const farWall =
    "#50000000=IFCWALL('2YvctVUKr0kugbFTf53O9L',$,'W',$,$,$,$,$,$);";

  const { result, elapsed, arrayBufferGrowth, outputs } = await splitInTwo(
    "far-id",
    [project, wall, farWall],
  );

  expect(outputs).toEqual([
    [project, wall],
    [project, farWall],
  ]);
  expect([...result.get(0)!.ids]).toEqual([1, 2]);
  expect([...result.get(1)!.ids]).toEqual([1, 50000000]);
  expect(elapsed, "split time in ms").toBeLessThan(MAX_SPLIT_MS);
  expect(arrayBufferGrowth, "array buffer growth in bytes").toBeLessThan(
    MAX_ARRAY_BUFFER_GROWTH,
  );
});

// Ids past 2^31 - 1, each one reached a different way: as a plain reference
// (the placement), as an element of its own (the far wall) and as a relation
// that has to be rewritten per group.
const beyondInt32 = {
  project: "#1=IFCPROJECT('0YvctVUKr0kugbFTf53O9L',$,'P',$,$,$,$,$,$);",
  wall: "#2=IFCWALL('1YvctVUKr0kugbFTf53O9L',$,'W',$,#2147483650,$,$,$);",
  axis: "#3=IFCAXIS2PLACEMENT3D(#4,$,$);",
  point: "#4=IFCCARTESIANPOINT((0.,0.,0.));",
  pset: "#5=IFCPROPERTYSET('3YvctVUKr0kugbFTf53O9L',$,'Pset',$,());",
  placement: "#2147483650=IFCLOCALPLACEMENT($,#3);",
  farWall:
    "#3000000000=IFCWALL('2YvctVUKr0kugbFTf53O9L',$,'W',$,#2147483650,$,$,$);",
  rel: (walls: string) =>
    `#3000000001=IFCRELDEFINESBYPROPERTIES('4YvctVUKr0kugbFTf53O9L',$,$,$,${walls},#5);`,
};

const beyondInt32Lines = () => {
  const { project, wall, axis, point, pset, placement, farWall, rel } =
    beyondInt32;
  return [
    project,
    wall,
    axis,
    point,
    pset,
    placement,
    farWall,
    rel("(#2,#3000000000)"),
  ];
};

test("split keeps ids past 2^31 - 1 and the references to them", async () => {
  const { project, wall, axis, point, pset, placement, farWall, rel } =
    beyondInt32;

  const { result, elapsed, arrayBufferGrowth, outputs } = await splitInTwo(
    "beyond-int32",
    beyondInt32Lines(),
  );

  expect(outputs).toEqual([
    [project, wall, axis, point, pset, placement, rel("(#2)")],
    [project, axis, point, pset, placement, farWall, rel("(#3000000000)")],
  ]);
  expect([...result.get(0)!.ids].sort((a, b) => a - b)).toEqual([
    1, 2, 3, 4, 5, 2147483650, 3000000001,
  ]);
  expect([...result.get(1)!.ids].sort((a, b) => a - b)).toEqual([
    1, 3, 4, 5, 2147483650, 3000000000, 3000000001,
  ]);
  expect(elapsed, "split time in ms").toBeLessThan(MAX_SPLIT_MS);
  expect(arrayBufferGrowth, "array buffer growth in bytes").toBeLessThan(
    MAX_ARRAY_BUFFER_GROWTH,
  );
});

test("extract keeps ids past 2^31 - 1 and the references to them", async () => {
  const { project, axis, point, pset, placement, farWall, rel } = beyondInt32;
  const inputPath = path.join(tmpDir, "beyond-int32-extract.ifc");
  const outputPath = path.join(tmpDir, "beyond-int32-extracted.ifc");
  await writeFile(inputPath, ifcOf(beyondInt32Lines()));
  const splitter = new IfcSplitterNode();

  const { result, elapsed, arrayBufferGrowth } = await measure(splitter, () =>
    splitter.extract(inputPath, [3000000000], outputPath),
  );

  expect(await dataLinesOf(outputPath)).toEqual([
    project,
    axis,
    point,
    pset,
    placement,
    farWall,
    rel("(#3000000000)"),
  ]);
  expect([...result].sort((a, b) => a - b)).toEqual([
    1, 3, 4, 5, 2147483650, 3000000000, 3000000001,
  ]);
  expect(elapsed, "extract time in ms").toBeLessThan(MAX_SPLIT_MS);
  expect(arrayBufferGrowth, "array buffer growth in bytes").toBeLessThan(
    MAX_ARRAY_BUFFER_GROWTH,
  );
});

// The file from the issue report, verbatim.
test("split survives the file reported in #313", async () => {
  const project =
    "#1=IFCPROJECT('0YvctVUKr0kugbFTf53O9L',$,'Poison',$,$,$,$,$,$);";
  const wall = "#2=IFCWALL('1YvctVUKr0kugbFTf53O9L',$,'W',$,$,$,$,$,$);";
  const farWall =
    "#1000000000000=IFCWALL('2YvctVUKr0kugbFTf53O9L',$,'W',$,$,$,$,$,$);";

  const { result, elapsed, arrayBufferGrowth, outputs } = await splitInTwo(
    "poison",
    [project, wall, farWall],
  );

  expect(outputs).toEqual([
    [project, wall],
    [project, farWall],
  ]);
  expect([...result.get(1)!.ids]).toEqual([1, 1000000000000]);
  expect(elapsed, "split time in ms").toBeLessThan(MAX_SPLIT_MS);
  expect(arrayBufferGrowth, "array buffer growth in bytes").toBeLessThan(
    MAX_ARRAY_BUFFER_GROWTH,
  );
});

// Ids that are neither contiguous nor listed in ascending order. The groups
// must come out exactly as they do for the same entities listed in order.
test("split does not depend on the order the file lists its ids in", async () => {
  const wallCount = 24_000;
  const ascending = Array.from(
    { length: wallCount },
    (_, i) => `#${i * 3 + 7}=IFCWALL('guid${i}',$,$,$,$,$,$,$);`,
  );
  // The highest ids come first, long before the file has enough lines to make
  // them look anything but outliers.
  const highestFirst = [
    ...ascending.slice(-1000),
    ...ascending.slice(0, -1000),
  ];
  const idsOf = (lines: string[]) =>
    lines.map((line) => Number(line.slice(1, line.indexOf("="))));
  const ascendingIdsOf = (lines: string[]) =>
    idsOf(lines).sort((a, b) => a - b);

  const [inOrder, outOfOrder] = [
    await splitInTwo("ascending", ascending),
    await splitInTwo("highest-first", highestFirst),
  ];

  for (const g of [0, 1]) {
    expect(inOrder.outputs[g]).toHaveLength(wallCount / 2);
    expect(ascendingIdsOf(outOfOrder.outputs[g])).toEqual(
      idsOf(inOrder.outputs[g]),
    );
    expect([...outOfOrder.result.get(g)!.ids]).toEqual([
      ...inOrder.result.get(g)!.ids,
    ]);
  }
  expect(idsOf([...inOrder.outputs[0], ...inOrder.outputs[1]])).toHaveLength(
    new Set(idsOf(ascending)).size,
  );
}, 30_000);

// Past 2^53 - 1 a double no longer tells neighbouring ids apart, so two
// entities would collapse into one. Refusing the file beats corrupting it.
test("split refuses an id too large to be told apart from its neighbours", async () => {
  const inputPath = path.join(tmpDir, "unsafe-id.ifc");
  await writeFile(
    inputPath,
    ifcOf([
      "#1=IFCPROJECT('0YvctVUKr0kugbFTf53O9L',$,'P',$,$,$,$,$,$);",
      "#9007199254740993=IFCWALL('1YvctVUKr0kugbFTf53O9L',$,'W',$,$,$,$,$,$);",
    ]),
  );
  const splitter = new IfcSplitterNode();

  await expect(
    splitter.split(inputPath, 1, () => path.join(tmpDir, "unsafe-id_0.ifc")),
  ).rejects.toThrow(/exceeds the largest id the splitter can represent/);
});
