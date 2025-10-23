import * as FB from "flatbuffers";
import * as TFB from "../../Schema";

export function buildSample(
  builder: FB.Builder,
  localIdToIndex: Map<number, number>,
  itemId: number,
  matId: number,
  reprId: number,
  ltId: number,
) {
  if (!localIdToIndex.has(itemId)) {
    throw new Error("Invalid sample: item id not found");
  }
  if (!localIdToIndex.has(matId)) {
    throw new Error("Invalid sample: mat id not found");
  }
  if (!localIdToIndex.has(reprId)) {
    throw new Error("Invalid sample: repr id not found");
  }
  if (!localIdToIndex.has(ltId)) {
    throw new Error("Invalid sample: lt id not found");
  }

  const itemIndex = localIdToIndex.get(itemId) as number;
  const matIndex = localIdToIndex.get(matId) as number;
  const reprIndex = localIdToIndex.get(reprId) as number;
  const ltIndex = localIdToIndex.get(ltId) as number;

  TFB.Sample.createSample(builder, itemIndex, matIndex, reprIndex, ltIndex);
}
