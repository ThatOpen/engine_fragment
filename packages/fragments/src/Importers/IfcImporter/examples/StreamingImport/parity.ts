// Semantic comparison of two .frag files; see src/testing/frag-dump.ts.
//
// usage: yarn tsx parity.ts <a.frag> <b.frag>
//        yarn tsx parity.ts --dump <a.frag>   # canonical JSON to stdout

import { readFileSync } from "node:fs";
import { compare, dump } from "../../src/testing/frag-dump";

const load = (path: string) => dump(new Uint8Array(readFileSync(path)));

const [first, second] = process.argv.slice(2);
if (first === "--dump") {
  const { metadata, items, spatial } = load(second);
  console.log(
    JSON.stringify({ metadata, spatial, items: Object.fromEntries(items) }),
  );
} else if (first && second) {
  const result = compare(load(first), load(second));
  console.log(JSON.stringify(result, null, 2));
  process.exit(Object.keys(result.differences).length ? 1 : 0);
}
