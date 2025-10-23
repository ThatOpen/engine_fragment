import { EditKey, EditRequest, EditRequestType } from "./edit-types";

export function applyChangesToRawData(
  actions: EditRequest[],
  rawData: Map<number, any>,
  type: EditKey,
  filter?: Set<number>,
) {
  const createType = EditRequestType[`CREATE_${type}`];
  const updateType = EditRequestType[`UPDATE_${type}`];
  const deleteType = EditRequestType[`DELETE_${type}`];
  if (actions) {
    for (const action of actions) {
      if (action.type === createType || action.type === updateType) {
        if (filter && !filter.has(action.localId as number)) {
          continue;
        }
        rawData.set(action.localId as number, action.data);
        continue;
      }
      if (action.type === deleteType) {
        rawData.delete(action.localId as number);
      }
    }
  }
}

// Used for metadata and spatial structure, which have a different structure than the other data
export function applyChangesToSpecialData(
  actions: EditRequest[],
  key: "METADATA" | "SPATIAL_STRUCTURE",
) {
  const updateType = EditRequestType[`UPDATE_${key}`];
  if (actions) {
    for (let i = actions.length - 1; i >= 0; i--) {
      const action = actions[i];
      if (action.type === updateType) {
        return JSON.parse(JSON.stringify(action.data));
      }
    }
  }
  return null;
}

export function applyChangesToIds(
  actions: EditRequest[],
  ids: number[] | Uint32Array | Set<number>,
  key: EditKey,
  addCreatedElements: boolean,
) {
  const resultSet = new Set(ids);
  const deleteType = EditRequestType[`DELETE_${key}`];
  const createType = EditRequestType[`CREATE_${key}`];
  if (actions) {
    for (const action of actions) {
      if (action.type === deleteType) {
        resultSet.delete(action.localId as number);
        continue;
      }
      if (addCreatedElements && action.type === createType) {
        resultSet.add(action.localId as number);
      }
    }
    return Array.from(resultSet);
  }
  return ids;
}
