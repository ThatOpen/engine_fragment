import type { UnstampedProbe } from "../../src/types";

// 3.2 removed two fields from the middle of the root table, so every field
// after them sits two slots lower than a 3.1 file has it. Files of that time
// carry no version: the layout is all there is to tell them by.
//   slot   3.1                 3.2 and later
//   12     alignments          unique_attributes
//   13     geometries (table)  relation_names
//   14     unique_attributes   indexes (tables)
//   15     relation_names      -
export default (probe: UnstampedProbe) =>
  probe.rootSlots > 15 ||
  probe.isStringVector(12) === false ||
  probe.isStringVector(13) === false ||
  probe.isStringVector(14) === true;
