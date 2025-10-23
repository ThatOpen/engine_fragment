import * as ET from "./edit-types";
import * as TIS from "./temp-id-solvers";

export function solveIds(requests: ET.EditRequest[], nextId: number) {
  // Temp ids allow to reference items that are not yet created
  // and therefore don't have a known local id when making the request
  // We only need them for SAMPLES, because samples are the only items that
  // reference other items in meshes
  // We will also give a local id to all the items that don't have one

  const tempIds = new Map<string, number>();

  const result: number[] = [];

  for (const request of requests) {
    if (request.localId !== undefined) {
      continue;
    }
    const newId = nextId++;
    if (request.tempId) {
      tempIds.set(request.tempId, newId);
    }
    request.localId = newId;
    result.push(newId);
  }

  // Now, let's resolve the temp ids to local ids for the samples

  for (const request of requests) {
    if (
      request.type === ET.EditRequestType.UPDATE_SAMPLE ||
      request.type === ET.EditRequestType.CREATE_SAMPLE
    ) {
      const sample = request.data as ET.SampleRequestData;
      TIS.solveSampleTempId(sample, "item", tempIds);
      TIS.solveSampleTempId(sample, "material", tempIds);
      TIS.solveSampleTempId(sample, "representation", tempIds);
      TIS.solveSampleTempId(sample, "localTransform", tempIds);
      continue;
    }
    if (
      request.type === ET.EditRequestType.UPDATE_GLOBAL_TRANSFORM ||
      request.type === ET.EditRequestType.CREATE_GLOBAL_TRANSFORM
    ) {
      const gt = request.data as ET.RawGlobalTransformData;
      TIS.solveGtTempId(gt, "itemId", tempIds);
      continue;
    }
    TIS.solveLocalIdTempId(request, "localId", tempIds);
  }

  tempIds.clear();

  return result;
}
