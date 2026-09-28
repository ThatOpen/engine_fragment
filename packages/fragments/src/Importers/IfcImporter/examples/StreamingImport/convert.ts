// Converts an IFC file in Node with the importer of any checkout of this repo,
// so the output of two versions of the pipeline can be compared with
// parity.ts.
//
// usage: yarn tsx convert.ts <repo root> <in.ifc> <out.frag>
//
// BATCH_ELEMENTS / BATCH_BYTES in the environment convert geometry in
// projected batches, one after another in this thread.

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
const batched = process.env.BATCH_ELEMENTS || process.env.BATCH_BYTES;
const bytes = await importer.process({
  bytes: new Uint8Array(readFileSync(input)),
  raw: true,
  ...(batched && {
    geometryBatches: {
      batchElements: Number(process.env.BATCH_ELEMENTS ?? 2000),
      batchBytes: Number(process.env.BATCH_BYTES ?? 32 * 1024 * 1024),
    },
  }),
});
writeFileSync(output, bytes);
console.error(
  `${path.basename(input)}: ${((performance.now() - start) / 1000).toFixed(2)} s, ${(bytes.length / 1024 / 1024).toFixed(1)} MB`,
  importer.stats?.projected ?? "",
);
