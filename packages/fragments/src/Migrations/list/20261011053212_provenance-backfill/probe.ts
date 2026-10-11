import type { UnstampedProbe } from "../../src/types";

// The revision came after the generator and the version (#273), and every
// writer stamps the three together. So a file with no revision that does
// name its generator was written in between, and has nothing to catch up
// on: only the ones that name none are behind.
export default ({ metadata }: UnstampedProbe) =>
  typeof metadata?.generator !== "string" ||
  typeof metadata?.version !== "string";
