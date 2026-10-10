import type { IfcSplitInfo, IfcSplitManifest } from "./types";

/** Position of `value` in an ascending array, or -1. */
const indexOf = (sorted: Uint32Array, value: number) => {
  let low = 0;
  let high = sorted.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (sorted[middle] < value) low = middle + 1;
    else if (sorted[middle] > value) high = middle - 1;
    else return middle;
  }
  return -1;
};

/**
 * Builds {@link IfcSplitManifest.index} from the items of each split, given
 * in the order the manifest lists them.
 */
export function buildSplitIndex(
  splits: { kind: IfcSplitInfo["kind"]; localIds: ArrayLike<number> }[],
): IfcSplitManifest["index"] {
  let total = 0;
  for (const { localIds } of splits) total += localIds.length;
  const all = new Uint32Array(total);
  let filled = 0;
  for (const { localIds } of splits) {
    all.set(localIds, filled);
    filled += localIds.length;
  }
  all.sort();
  let unique = 0;
  for (let i = 0; i < all.length; i++) {
    if (i === 0 || all[i] !== all[i - 1]) all[unique++] = all[i];
  }
  const localIds = all.slice(0, unique);

  const geometry = new Int32Array(unique).fill(-1);
  const data = new Int32Array(unique).fill(-1);
  for (const [position, split] of splits.entries()) {
    const column = split.kind === "geometry" ? geometry : data;
    for (let i = 0; i < split.localIds.length; i++) {
      column[indexOf(localIds, split.localIds[i])] = position;
    }
  }
  return { localIds, geometry, data };
}

/**
 * The splits holding an item, as positions in {@link IfcSplitManifest.splits}
 * (-1 for none), or null for a local id the conversion did not keep.
 */
export function findItemSplits(
  { index }: Pick<IfcSplitManifest, "index">,
  localId: number,
) {
  const position = indexOf(index.localIds, localId);
  if (position === -1) return null;
  return { geometry: index.geometry[position], data: index.data[position] };
}
