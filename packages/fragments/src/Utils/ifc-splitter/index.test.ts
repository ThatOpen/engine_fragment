import { readFile } from "fs/promises";
import * as path from "path";
import { expect, test, vi } from "vitest";
import {
  GroupData,
  IfcSplitter,
  IfcSplitterGroupsEvent,
  IfcSplitterIO,
  IfcSplitterProgressEvent,
  IfcSplitterWarningEvent,
} from ".";
import { SingleThreadedFragmentsModel } from "../../FragmentsModels";
import { IfcImporter } from "../../Importers";
import { IfcSplitterNode } from "./node";

const assetDir = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "..",
  "..",
);

const webIfcDir = path.dirname(import.meta.resolve("web-ifc"));

const syntheticIfcWithWalls = (wallCount: number) =>
  [
    "ISO-10303-21;",
    "HEADER;",
    "ENDSEC;",
    "DATA;",
    ...Array.from(
      { length: wallCount },
      (_, i) => `#${i + 1}=IFCWALL('guid${i + 1}',$,$,$,$,$,$,$);`,
    ),
    "ENDSEC;",
    "END-ISO-10303-21;",
  ].join("\n");

interface SinkState {
  text: string;
  closed: boolean;
  aborted: boolean;
}

/**
 * In-memory {@link IfcSplitterIO}. Captures what each output file received and,
 * when `failOnRead` is set, errors that Nth read partway through so the write
 * pass fails while every output sink is still open.
 */
class MemoryIO implements IfcSplitterIO {
  readonly sinks = new Map<string, SinkState>();

  private reads = 0;

  constructor(
    private readonly source: string,
    private readonly failOnRead = 0,
  ) {}

  async readableStream(): Promise<ReadableStream<string>> {
    this.reads += 1;
    const shouldFail = this.reads === this.failOnRead;
    const lines = this.source.split("\n");
    let i = 0;
    return new ReadableStream<string>({
      pull(controller) {
        if (shouldFail && i === 5) {
          controller.error(new Error("read failed"));
          return;
        }
        if (i >= lines.length) {
          controller.close();
          return;
        }
        controller.enqueue(lines[i]);
        i += 1;
      },
    });
  }

  async writableStream(filePath: string): Promise<WritableStream<string>> {
    const state: SinkState = { text: "", closed: false, aborted: false };
    this.sinks.set(filePath, state);
    return new WritableStream<string>({
      write(chunk) {
        state.text += chunk;
      },
      close() {
        state.closed = true;
      },
      abort() {
        state.aborted = true;
      },
    });
  }
}

test("split releases every output writer when the write pass fails", async () => {
  const io = new MemoryIO(syntheticIfcWithWalls(2), 2);
  const splitter = new IfcSplitter(io);

  await expect(
    splitter.split("in.ifc", 2, (groupId) => `out_${groupId}.ifc`),
  ).rejects.toThrow("read failed");

  expect(io.sinks.size).toBe(2);
  for (const [name, state] of io.sinks) {
    expect(state.aborted, `${name} aborted`).toBe(true);
    expect(state.closed, `${name} closed`).toBe(false);
  }
});

test("extract releases the output writer when the write pass fails", async () => {
  const io = new MemoryIO(syntheticIfcWithWalls(2), 2);
  const splitter = new IfcSplitter(io);

  await expect(splitter.extract("in.ifc", [1], "out.ifc")).rejects.toThrow(
    "read failed",
  );

  expect(io.sinks.get("out.ifc")?.aborted).toBe(true);
  expect(io.sinks.get("out.ifc")?.closed).toBe(false);
});

// Regression: group membership used to live in a `1 << g` bitmask over a
// Uint32Array, so group 32 aliased group 0, group 33 aliased group 1, and so
// on — silently duplicating elements into the wrong output files.
test.each([1, 32, 33, 64, 100])(
  "split into %i groups keeps every group distinct",
  async (numGroups) => {
    const io = new MemoryIO(syntheticIfcWithWalls(numGroups));
    const splitter = new IfcSplitter(io);

    const splitMap = await splitter.split(
      "in.ifc",
      numGroups,
      (groupId) => `out_${groupId}.ifc`,
    );

    expect(splitMap.size).toBe(numGroups);
    expect(io.sinks.size).toBe(numGroups);

    // One wall per group, and each wall lands in exactly one output file.
    const owners = new Map<number, string[]>();
    for (const [name, state] of io.sinks) {
      expect(state.closed, `${name} closed`).toBe(true);
      const walls = [...state.text.matchAll(/^#(\d+)=IFCWALL/gm)].map((m) =>
        Number(m[1]),
      );
      expect(walls, `${name} wall count`).toHaveLength(1);
      const existing = owners.get(walls[0]) ?? [];
      owners.set(walls[0], [...existing, name]);
    }

    expect(owners.size, "every wall assigned exactly once").toBe(numGroups);
    for (const [wall, files] of owners) {
      expect(files, `#${wall} owners`).toHaveLength(1);
    }
  },
);

test.each([0, -1, 1.5, NaN])(
  "split rejects numGroups=%s",
  async (numGroups) => {
    const splitter = new IfcSplitterNode();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const readableStream = vi.spyOn((splitter as any).io, "readableStream");
    await expect(
      splitter.split(
        path.resolve(assetDir, "resources/ifc/school_str.ifc"),
        numGroups,
        () => path.resolve(import.meta.dirname, ".tmp", "unreachable.ifc"),
      ),
    ).rejects.toThrow(RangeError);
    // rejected before any I/O happened
    expect(readableStream).not.toHaveBeenCalled();
  },
);

test("split ifc", async () => {
  const splitter = new IfcSplitterNode();
  const inputPath = path.resolve(assetDir, "resources/ifc/school_str.ifc");
  const onProgress = vi.fn<(event: IfcSplitterProgressEvent) => unknown>();
  const onSplitsResolved = vi.fn<(event: IfcSplitterGroupsEvent) => unknown>();
  const onExtractWarning = vi.fn<(event: IfcSplitterWarningEvent) => unknown>();
  splitter.onProgress.add(onProgress);
  splitter.onSplitsResolved.add(onSplitsResolved);
  splitter.onExtractWarning.add(onExtractWarning);
  const splitCount = 10;
  const splitMap = await splitter.split(inputPath, splitCount, (groupId) =>
    path.resolve(
      __dirname,
      ".tmp",
      `split_${String(groupId + 1).padStart(3, "0")}.ifc`,
    ),
  );

  expect(onProgress.mock.calls.map(([{ stage }]) => stage)).toEqual([
    "parse",
    "spatial",
    "void-fill",
    "style-maps",
    "classify",
    "aggregate",
    "cluster",
    "distribute",
    "relations",
    "resolve",
    "build-index",
    "write",
  ]);
  expect(onSplitsResolved).toHaveBeenCalledOnce();

  const { data } = onSplitsResolved.mock.calls[0][0] as { data: GroupData[] };
  expect(
    data.map(({ elementCount, totalIds, rewrittenLines }) => {
      return { elementCount, totalIds, rewrittenLines: rewrittenLines.size };
    }),
  ).toEqual([
    {
      elementCount: 92,
      rewrittenLines: 427,
      totalIds: 23892,
    },
    {
      elementCount: 92,
      rewrittenLines: 428,
      totalIds: 22972,
    },
    {
      elementCount: 92,
      rewrittenLines: 441,
      totalIds: 23438,
    },
    {
      elementCount: 92,
      rewrittenLines: 439,
      totalIds: 23954,
    },
    {
      elementCount: 92,
      rewrittenLines: 442,
      totalIds: 22957,
    },
    {
      elementCount: 92,
      rewrittenLines: 443,
      totalIds: 22979,
    },
    {
      elementCount: 92,
      rewrittenLines: 444,
      totalIds: 23459,
    },
    {
      elementCount: 91,
      rewrittenLines: 442,
      totalIds: 22957,
    },
    {
      elementCount: 91,
      rewrittenLines: 441,
      totalIds: 22501,
    },
    {
      elementCount: 91,
      rewrittenLines: 438,
      totalIds: 23390,
    },
  ]);

  expect(onExtractWarning).not.toHaveBeenCalled();

  expect(splitMap.size).toBe(splitCount);
  for (const { fileName, fileIds } of data) {
    expect(splitMap.get(fileName), fileName).toEqual(fileIds);
  }
});

test("extract ifc", async () => {
  const splitter = new IfcSplitterNode();
  const inputPath = path.resolve(assetDir, "resources/ifc/school_str.ifc");
  const inputFrag = path.resolve(assetDir, "resources/frags/school_str.frag");
  const outputPath = path.resolve(__dirname, ".tmp", "extracted.ifc");
  const onProgress = vi.fn<(event: IfcSplitterProgressEvent) => unknown>();
  const onSplitsResolved = vi.fn<(event: IfcSplitterGroupsEvent) => unknown>();
  const onExtractWarning = vi.fn<(event: IfcSplitterWarningEvent) => unknown>();
  splitter.onProgress.add(onProgress);
  splitter.onSplitsResolved.add(onSplitsResolved);
  splitter.onExtractWarning.add(onExtractWarning);

  const idsToExtract = [501];
  const extractedIds = await splitter.extract(
    inputPath,
    idsToExtract,
    outputPath,
  );

  expect(onProgress.mock.calls.map(([{ stage }]) => stage)).toEqual([
    "parse",
    "spatial",
    "void-fill",
    "style-maps",
    "classify",
    "aggregate",
    "cluster",
    "relations",
    "resolve",
    "write",
  ]);

  expect(onSplitsResolved).not.toHaveBeenCalled();
  expect(onExtractWarning).not.toHaveBeenCalled();

  expect(extractedIds.size).toBe(14576);

  expect(idsToExtract.every((id) => extractedIds.has(id))).toBeTruthy();

  const importer = new IfcImporter();
  importer.addAllAttributes();
  importer.addAllRelations();
  importer.wasm = { path: webIfcDir + path.sep, absolute: true };
  importer.webIfcSettings.COORDINATE_TO_ORIGIN = false;
  const extractedFrag = await importer.process({
    bytes: await readFile(outputPath),
  });
  const extractedModel = new SingleThreadedFragmentsModel(
    "extracted",
    extractedFrag,
  );
  const fixtureModel = new SingleThreadedFragmentsModel(
    "fixture",
    await readFile(inputFrag),
  );
  expect(extractedModel.getItemsGeometry(idsToExtract)).toEqual([
    [
      expect.objectContaining({
        localId: 501,
        sampleId: 96583,
        representationId: 96580,
      }),
    ],
  ]);
  expect(fixtureModel.getItemsGeometry(idsToExtract)).toEqual([
    [
      expect.objectContaining({
        localId: 501,
        sampleId: 99301,
        representationId: 98690,
      }),
    ],
  ]);
  const comparisons = await Promise.all(
    [
      {
        message: "getGuidsByLocalIds",
        action: (model: SingleThreadedFragmentsModel) =>
          model.getGuidsByLocalIds(idsToExtract),
      },
      {
        message: "getItemsData",
        action: (model: SingleThreadedFragmentsModel) =>
          model.getItemsData(idsToExtract),
      },
      {
        message: "getItemsChildren",
        action: (model: SingleThreadedFragmentsModel) =>
          model.getItemsChildren(idsToExtract),
      },
      {
        message: "getMaterials",
        action: (model: SingleThreadedFragmentsModel) =>
          model.getMaterials(idsToExtract),
      },
      {
        message: "getRelations",
        action: (model: SingleThreadedFragmentsModel) =>
          model.getRelations(idsToExtract),
      },
      {
        message: "getSamples",
        action: async (model: SingleThreadedFragmentsModel) =>
          [...(await model.getSamples(idsToExtract))].map(
            ([, { item, localTransform, material }]) => ({
              item,
              localTransform,
              material,
            }),
          ),
      },
    ].map(async ({ message, action }) => ({
      message,
      actual: await action(extractedModel),
      expected: await action(fixtureModel),
    })),
  );

  comparisons.map(({ message, actual, expected }) =>
    expect.soft(actual, message).toEqual(expected),
  );
});
