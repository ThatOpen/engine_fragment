import * as path from "path";
import { expect, test, vi } from "vitest";
import {
  IfcSplitterGroupsEvent,
  IfcSplitterProgressEvent,
  IfcSplitterWarningEvent,
} from ".";
import { IfcSplitterNode } from "./node";

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
  const inputPath = path.resolve(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "..",
    "resources/ifc/school_str.ifc",
  );
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
  const inputPath = path.resolve(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "..",
    "resources/ifc/school_str.ifc",
  );
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
    path.resolve(__dirname, ".tmp", "extracted.ifc"),
  );

  expect(
    onProgress.mock.calls.map(([{ stage }]) => ({ stage })),
  ).toMatchSnapshot("onProgress");

  expect(onSplitsResolved).not.toHaveBeenCalled();
  expect(onExtractWarning).not.toHaveBeenCalled();

  await expect(
    JSON.stringify(
      [...extractedIds].sort((a, b) => a - b),
      jsonReplacer,
      2,
    ),
  ).toMatchFileSnapshot("__snapshots__/extractedIds.json");

  expect(new Set(idsToExtract).isSubsetOf(extractedIds)).toBeTruthy();
});
