import { readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, expect, test } from "vitest";
import { IfcImporter } from "../../index";
import { compare, dump } from "../testing/frag-dump";

const fixtureDir = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
  "resources",
  "ifc",
);
const webIfcDir = path.dirname(import.meta.resolve("web-ifc"));

const convert = (bytes: Uint8Array, batchElements?: number) => {
  const importer = new IfcImporter();
  importer.wasm = { path: webIfcDir + path.sep, absolute: true };
  return importer.process({
    bytes,
    raw: true,
    ...(batchElements && {
      geometryBatches: { batchElements, probeElements: batchElements },
    }),
  });
};

// Converting a file as many small projections, each its own web-ifc model,
// must give the model a single whole-file pass gives: the same geometry, in
// the same place, deduplicated the same way — at any batch size.
describe.each(readdirSync(fixtureDir).filter((f) => f.endsWith(".ifc")))(
  "projected geometry batches match a single pass on %s",
  (fixture) => {
    const bytes = new Uint8Array(readFileSync(path.join(fixtureDir, fixture)));

    test.each([1, 7, 500])(
      "batches of %i elements",
      async (size) => {
        const whole = dump(await convert(bytes));
        const batched = dump(await convert(bytes, size));
        expect(compare(whole, batched).differences).toEqual({});
      },
      300_000,
    );
  },
);
