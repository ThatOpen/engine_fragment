import { edit } from "../../Utils/edit/edit-function";
import { EditRequest, EditRequestType } from "../../Utils/edit/edit-types";
import { getModelFromBuffer } from "../../Utils/edit/fetch-functions";
import { solveIds } from "../../Utils/edit/id-solver";

/**
 * Applies the requests the edit steps of a migration asked for to a raw
 * file, the way a model's `edit()` followed by `save()` does, without the
 * model: what the requests create gets the next local ids of the file, which
 * then moves past them.
 *
 * It is apart from the rest of the migration code because it is the one part
 * that needs the editor. The worker has it, so `load()` leaves this to the
 * worker and the main thread never loads the editor for a migration.
 */
export function applyRequests(bytes: Uint8Array, requests: EditRequest[]) {
  const file = getModelFromBuffer(bytes, true);
  const all = [...requests];
  const next = file.maxLocalId();
  const created = solveIds(all, next);
  all.push({
    type: EditRequestType.UPDATE_MAX_LOCAL_ID,
    localId: next + created.length,
  });
  return edit(file, all, { raw: true }).model;
}
