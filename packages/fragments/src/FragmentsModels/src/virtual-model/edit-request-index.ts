import { EditRequest, EditRequestType, isIndexRequest } from "../../../Utils";

type RequestOfType<T extends EditRequestType> = Extract<
  EditRequest,
  { type: T }
>;

type LocalIdRequest = EditRequest & { localId?: number | string };

/**
 * Incremental lookup structures over the pending edit requests of a
 * VirtualFragmentsModel.
 *
 * Property reads used to scan the whole `requests` array once per item, so a
 * bulk read of N items with E pending requests cost O(N × E). This index keeps
 * the requests grouped by the localId they target (in push order) plus the
 * set of deleted items, so each per-item lookup is O(k) in the number of
 * requests for that item.
 *
 * The owner keeps it in sync on push / undo / redo; any operation that
 * replaces the requests array (reset, history selection, restoring saved
 * requests) rebuilds it. `sync()` is the safety net for the tracked array
 * being swapped or mutated behind the index's back.
 */
export class EditRequestIndex {
  /** Local ids with a pending DELETE_ITEM request. */
  readonly deletedItems = new Set<number>();

  private _byLocalId = new Map<number | string, EditRequest[]>();
  private _deleteCounts = new Map<number, number>();
  private _source: EditRequest[] | null = null;
  private _size = 0;

  /**
   * Makes sure the index reflects `requests`. Cheap when the tracked array is
   * unchanged; rebuilds when it was replaced or its length drifted.
   */
  sync(requests: EditRequest[]) {
    if (this._source === requests && this._size === requests.length) {
      return;
    }
    this.rebuild(requests);
  }

  rebuild(requests: EditRequest[]) {
    this._byLocalId.clear();
    this._deleteCounts.clear();
    this.deletedItems.clear();
    this._source = requests;
    this._size = 0;
    for (const request of requests) {
      this.push(request);
    }
  }

  /** Registers a request that was just appended to the tracked array. */
  push(request: EditRequest) {
    this._size++;
    const localId = this.localIdOf(request);
    if (localId === undefined) {
      return;
    }
    let list = this._byLocalId.get(localId);
    if (!list) {
      list = [];
      this._byLocalId.set(localId, list);
    }
    list.push(request);
    if (
      request.type === EditRequestType.DELETE_ITEM &&
      typeof localId === "number"
    ) {
      this._deleteCounts.set(
        localId,
        (this._deleteCounts.get(localId) ?? 0) + 1,
      );
      this.deletedItems.add(localId);
    }
  }

  /** Unregisters a request that was just removed from the tracked array. */
  pop(request: EditRequest) {
    this._size--;
    const localId = this.localIdOf(request);
    if (localId === undefined) {
      return;
    }
    const list = this._byLocalId.get(localId);
    if (list) {
      // Undo removes the newest request, so this is normally the last entry
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i] === request) {
          list.splice(i, 1);
          break;
        }
      }
      if (list.length === 0) {
        this._byLocalId.delete(localId);
      }
    }
    if (
      request.type === EditRequestType.DELETE_ITEM &&
      typeof localId === "number"
    ) {
      const count = (this._deleteCounts.get(localId) ?? 1) - 1;
      if (count > 0) {
        this._deleteCounts.set(localId, count);
      } else {
        this._deleteCounts.delete(localId);
        this.deletedItems.delete(localId);
      }
    }
  }

  /** Newest pending request of one of the given types targeting `localId`. */
  latest<T extends EditRequestType>(
    localId: number | string,
    ...types: T[]
  ): RequestOfType<T> | undefined {
    const list = this._byLocalId.get(localId);
    if (!list) {
      return undefined;
    }
    for (let i = list.length - 1; i >= 0; i--) {
      const request = list[i];
      if (types.includes(request.type as T)) {
        return request as RequestOfType<T>;
      }
    }
    return undefined;
  }

  /** Oldest pending request of one of the given types targeting `localId`. */
  first<T extends EditRequestType>(
    localId: number | string,
    ...types: T[]
  ): RequestOfType<T> | undefined {
    const list = this._byLocalId.get(localId);
    if (!list) {
      return undefined;
    }
    for (const request of list) {
      if (types.includes(request.type as T)) {
        return request as RequestOfType<T>;
      }
    }
    return undefined;
  }

  private localIdOf(request: EditRequest) {
    // Index requests are name-keyed and never target an item
    if (isIndexRequest(request)) {
      return undefined;
    }
    return (request as LocalIdRequest).localId;
  }
}
