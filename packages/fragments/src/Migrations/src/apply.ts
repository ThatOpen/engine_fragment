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
 * that needs the editor. The worker has the editor already, and `migrate()`
 * loads it when a migration asks for an edit, so that code takes this from
 * its caller (see `run`) instead of bundling the editor a second time.
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
