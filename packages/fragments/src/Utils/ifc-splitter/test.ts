#!/usr/bin/env node
import * as path from "path";
import { IfcSplitterNode } from "./node";

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("Usage: ifc-splitter <input.ifc> <numGroups> [outputDir]");
  console.log("  Example: ifc-splitter model.ifc 20");
  process.exit(0);
}

const inputPath = path.resolve(args[0]);
const numGroups = parseInt(args[1], 10);
const outputDir = args[2] ? path.resolve(args[2]) : path.dirname(inputPath);

try {
  const splitter = new IfcSplitterNode();
  splitter.on("progress", console.info);
  splitter.on("data", console.log);
  splitter.on("warning", console.warn);
  const splitMap = await splitter.split(inputPath, numGroups, (groupId) =>
    path.resolve(
      outputDir,
      `split_${String(groupId + 1).padStart(3, "0")}.ifc`,
    ),
  );
  console.log(splitMap);
} catch (err) {
  console.error(err);
  process.exit(1);
}
