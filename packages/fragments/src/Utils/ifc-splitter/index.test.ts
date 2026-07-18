import * as path from "path";
import { expect, test, vi } from "vitest";
import {
  IfcSplitterGroupsEvent,
  IfcSplitterProgressEvent,
  IfcSplitterWarningEvent,
} from ".";
import { IfcSplitterNode } from "./node";
import { IfcImporter } from "../../Importers";
import { readFile } from "fs/promises";
import { SingleThreadedFragmentsModel } from "../../FragmentsModels";

const assetDir = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "..",
  "..",
);

const webIfcDir = path.dirname(import.meta.resolve("web-ifc"));

const jsonReplacer = (k: unknown, v: unknown) => {
  if (v instanceof Map) {
    return Object.fromEntries(v);
  }
  if (v instanceof Set) {
    return [...v];
  }
  return v;
};

test("split ifc", async () => {
  const splitter = new IfcSplitterNode();
  const inputPath = path.resolve(assetDir, "resources/ifc/school_str.ifc");
  const onProgress = vi.fn<(event: IfcSplitterProgressEvent) => unknown>();
  const onSplitsResolved = vi.fn<(event: IfcSplitterGroupsEvent) => unknown>();
  const onExtractWarning = vi.fn<(event: IfcSplitterWarningEvent) => unknown>();
  splitter.onProgress.add(onProgress);
  splitter.onSplitsResolved.add(onSplitsResolved);
  splitter.onExtractWarning.add(onExtractWarning);
  const splitMap = await splitter.split(inputPath, 10, (groupId) =>
    path.resolve(
      __dirname,
      ".tmp",
      `split_${String(groupId + 1).padStart(3, "0")}.ifc`,
    ),
  );

  expect(
    onProgress.mock.calls.map(([{ stage }]) => ({ stage })),
  ).toMatchSnapshot("onProgress");
  expect(onSplitsResolved).toHaveBeenCalledOnce();

  const { data } = onSplitsResolved.mock.calls[0][0];
  await expect(
    JSON.stringify(
      new Map(
        data.map((groupData, index) => {
          const { fileName, fileIds, ...rest } = groupData!;
          return [index, rest];
        }),
      ),
      jsonReplacer,
      2,
    ),
  ).toMatchFileSnapshot("__snapshots__/resolvedSplits.json");

  expect(onExtractWarning).not.toHaveBeenCalled();

  await expect(
    JSON.stringify(
      new Map([...splitMap.values()].map((data, index) => [index, data])),
      jsonReplacer,
      2,
    ),
  ).toMatchFileSnapshot("__snapshots__/splitMap.json");

  expect([...splitMap.values()].map((data) => data)).toEqual(
    data.map((groupData) => groupData!.fileIds),
  );
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

  expect(
    onProgress.mock.calls.map(([{ stage }]) => ({ stage })),
  ).toMatchSnapshot("onProgress");

  expect(onSplitsResolved).not.toHaveBeenCalled();
  expect(onExtractWarning).not.toHaveBeenCalled();

  expect(extractedIds.size).toBe(14576);

  expect(new Set(idsToExtract).isSubsetOf(extractedIds)).toBeTruthy();

  const importer = new IfcImporter();
  importer.addAllAttributes();
  importer.addAllRelations();
  importer.wasm = { path: webIfcDir + path.sep, absolute: true };
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
        message: "getItemsGeometry",
        action: (model: SingleThreadedFragmentsModel) =>
          model.getItemsGeometry(idsToExtract),
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
        message: "getRepresentations",
        action: async (model: SingleThreadedFragmentsModel) =>
          (await model.getRepresentations(idsToExtract)).values(),
      },
      {
        message: "getSamples",
        action: (model: SingleThreadedFragmentsModel) =>
          model.getSamples(idsToExtract),
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
