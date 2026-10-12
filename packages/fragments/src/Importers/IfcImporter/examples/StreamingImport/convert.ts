// Converts an IFC file in Node with the importer of any checkout of this repo,
// so the output of two versions of the pipeline can be compared with
// parity.ts.
//
// usage: yarn tsx convert.ts <repo root> <in.ifc> <out.frag>
//
// BATCH_ELEMENTS / BATCH_BYTES in the environment convert geometry in
// projected batches, one after another in this thread.
//
// SPLIT_ITEMS / SPLIT_BYTES write the model as splits instead of one file:
// <out>.g0.frag … and <out>.d0.frag, with <out>.manifest.json naming them,
// which parity.ts takes in place of a .frag.

import { readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";

const [root, input, output] = process.argv.slice(2);
if (!(root && input && output)) {
  console.error("usage: convert.ts <repo root> <in.ifc> <out.frag>");
  process.exit(2);
}

const FRAGS = await import(
  path.resolve(root, "packages/fragments/src/index.ts")
);
const webIfcDir = path.dirname(import.meta.resolve("web-ifc"));

const importer = new FRAGS.IfcImporter();
importer.wasm = { path: webIfcDir + path.sep, absolute: true };

const start = performance.now();
const split = process.env.SPLIT_ITEMS || process.env.SPLIT_BYTES;
const batched = process.env.BATCH_ELEMENTS || process.env.BATCH_BYTES || split;
const base = output.replace(/\.frag$/, "");
const files: Record<string, string> = {};
let written = 0;
const result = await importer.process({
  bytes: new Uint8Array(readFileSync(input)),
  raw: true,
  ...(batched && {
    geometryBatches: {
      batchElements: Number(process.env.BATCH_ELEMENTS ?? 2000),
      batchBytes: Number(process.env.BATCH_BYTES ?? 32 * 1024 * 1024),
    },
  }),
  ...(split && {
    splits: {
      geometry: {
        maxItems: Number(process.env.SPLIT_ITEMS ?? 20_000),
        ...(process.env.SPLIT_BYTES && {
          maxBytes: Number(process.env.SPLIT_BYTES),
        }),
      },
      onSplit: ({ id, bytes }: { id: string; bytes: Uint8Array }) => {
        files[id] = `${base}${id.slice(id.lastIndexOf("."))}.frag`;
        writeFileSync(files[id], bytes);
        written += bytes.length;
      },
    },
  }),
});
if (result instanceof Uint8Array) {
  writeFileSync(output, result);
  written = result.length;
} else {
  // each split's file sits next to the manifest, and is named in it
  const splits = result.splits.map((info: { id: string }) => ({
    ...info,
    file: path.basename(files[info.id]),
  }));
  const { localIds, geometry, data } = result.index;
  writeFileSync(
    `${base}.manifest.json`,
    JSON.stringify({
      ...result,
      splits,
      index: {
        localIds: [...localIds],
        geometry: [...geometry],
        data: [...data],
      },
    }),
  );
}
console.error(
  `${path.basename(input)}: ${((performance.now() - start) / 1000).toFixed(2)} s, ${(written / 1024 / 1024).toFixed(1)} MB`,
  result instanceof Uint8Array ? "" : `in ${result.splits.length} splits`,
  importer.stats?.projected ?? "",
);
