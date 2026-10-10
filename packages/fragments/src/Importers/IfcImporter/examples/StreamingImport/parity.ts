// Semantic comparison of two .frag files; see src/testing/frag-dump.ts.
//
// usage: yarn tsx parity.ts <a.frag> <b.frag>
//        yarn tsx parity.ts --dump <a.frag>   # canonical JSON to stdout
//
// Either side can be the .manifest.json convert.ts writes for a model in
// splits, which is compared as the one model its splits add up to.

import { readFileSync } from "node:fs";
import * as path from "node:path";
import { compare, dump, dumpSplits } from "../../src/testing/frag-dump";

const read = (file: string) => new Uint8Array(readFileSync(file));

const isManifest = (file: string) => file.endsWith(".json");

const load = (file: string) => {
  if (!isManifest(file)) return dump(read(file));
  const { splits } = JSON.parse(readFileSync(file, "utf8")) as {
    splits: { kind: "geometry" | "reference" | "data"; file: string }[];
  };
  return dumpSplits(
    splits.map(({ kind, file: name }) => ({
      kind,
      bytes: read(path.join(path.dirname(file), name)),
    })),
  );
};

const [first, second] = process.argv.slice(2);
if (first === "--dump") {
  const { metadata, items, spatial } = load(second);
  console.log(
    JSON.stringify({ metadata, spatial, items: Object.fromEntries(items) }),
  );
} else if (first && second) {
  // Splits deduplicate geometry each on its own, so shells one model stores
  // once can differ between them by what its dedup key rounds away; and they
  // number the grids and alignments from further on.
  const splits = isManifest(first) || isManifest(second);
  const result = compare(load(first), load(second), {
    tolerance: splits ? 2e-4 : 0,
    generatedById: !splits,
  });
  console.log(JSON.stringify(result, null, 2));
  process.exit(Object.keys(result.differences).length ? 1 : 0);
}
