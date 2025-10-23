import * as ET from "./edit-types";

export function solveGtTempId(
  sample: ET.RawGlobalTransformData,
  key: "itemId",
  tempIdsToLocalIds: Map<string, number>,
) {
  const value = sample[key];
  if (typeof value === "string") {
    const localId = tempIdsToLocalIds.get(value);
    if (localId === undefined) {
      throw new Error(`Malformed request: temp id ${sample[key]} not found`);
    }
    sample[key] = localId;
  }
}

export function solveSampleTempId(
  sample: ET.SampleRequestData,
  key: "item" | "material" | "representation" | "localTransform",
  tempIdsToLocalIds: Map<string, number>,
) {
  const value = sample[key];
  if (typeof value === "string") {
    const localId = tempIdsToLocalIds.get(value);
    if (localId === undefined) {
      throw new Error(`Malformed request: temp id ${sample[key]} not found`);
    }
    sample[key] = localId;
  }
}

export function solveLocalIdTempId(
  request: ET.EditRequest,
  key: "localId",
  tempIdsToLocalIds: Map<string, number>,
) {
  const value = request[key];
  if (typeof value === "string") {
    const localId = tempIdsToLocalIds.get(value);
    if (localId === undefined) {
      throw new Error(`Malformed request: temp id ${request[key]} not found`);
    }
    request[key] = localId;
  }
}
