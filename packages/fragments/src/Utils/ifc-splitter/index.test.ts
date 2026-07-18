import { readFile } from "fs/promises";
import * as path from "path";
import { expect, test, vi } from "vitest";
import {
  GroupData,
  IfcSplitterGroupsEvent,
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
    "build-mask",
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

  expect(new Set(idsToExtract).isSubsetOf(extractedIds)).toBeTruthy();

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
