import {
  ModelUid,
  MultiThreadingRequestClass,
  TileRequest,
  TileRequestClass,
  WorkerRequest,
} from "./model-types";
import { MaterialManager } from "./material-manager";
import { MeshManager } from "./mesh-manager";
import type { Cloned } from "../multithreading/cloned";

/**
 * Manages a list of requests for the MeshManager.
 */
export class RequestsManager {
  /**
   * List of requests.
   */
  readonly list: Cloned<TileRequest>[] = [];

  /**
   * Checks if there are any pending requests.
   *
   * @returns `true` if there are pending requests, otherwise `false`.
   */
  get arePending() {
    return this.list.length > 0;
  }

  /**
   * Callback function to be invoked when a request with
   * `TileRequestClass.FINISH` is added. Receives the FINISH's `seq`
   * stamp (the highest RPC seq the worker had processed when emitting
   * this FINISH); used by the fence-based `forceUpdateFinish` to
   * resolve waiters whose target seq has now settled, per model.
   */
  onFinish: (seq: number | undefined, uid: ModelUid) => void = () => {};

  // The answer is the request: its payload is emptied once taken, so it
  // isn't copied back to the worker.
  async handleRequest(meshes: MeshManager, request: Cloned<WorkerRequest>) {
    if (request.class === MultiThreadingRequestClass.RECOMPUTE_MESHES) {
      this.add(request.list);
      request.list = [];
    } else if (request.class === MultiThreadingRequestClass.CREATE_MATERIAL) {
      const { materialDefinitions, uid, firstId } = request;
      const definitions = materialDefinitions.map((definition) =>
        MaterialManager.restoreColor(definition),
      );
      meshes.materials.addDefinitions(uid, definitions, firstId);
      request.materialDefinitions = [];
    }
  }

  /**
   * Adds an array of requests to the list. If a request with `TileRequestClass.FINISH` is added,
   * the `onFinishRequest` callback is invoked.
   *
   * @param requests - Array of requests to be added.
   */
  add(requests: Cloned<TileRequest>[]) {
    for (const request of requests) {
      if (!this.insert(request)) this.list.push(request);
      if (request.tileRequestClass === TileRequestClass.FINISH) {
        this.onFinish(request.seq, request.uid);
      }
    }
  }

  /**
   * Cleans the list by removing requests of the specified model with `TileRequestClass.FINISH`.
   *
   * @param uid - The uid of the model to filter requests by.
   */
  clean(uid: ModelUid) {
    const list = this.list.filter(
      (request) =>
        request.uid !== uid ||
        request.tileRequestClass !== TileRequestClass.FINISH,
    );
    (this.list as any) = list;
  }

  /**
   * Inserts a request into the list based on its `tileRequestClass`.
   *
   * @param request - The request to be inserted.
   * @returns `true` if the request was successfully inserted, otherwise `false`.
   */
  insert(request: Cloned<TileRequest>) {
    if (request.tileRequestClass === TileRequestClass.FINISH) return false;
    const { uid, tileId, tileRequestClass } = request;

    if (tileRequestClass === TileRequestClass.DELETE) {
      const list = this.list.filter(
        (request) =>
          !(
            (request.tileRequestClass === TileRequestClass.CREATE ||
              request.tileRequestClass === TileRequestClass.DELETE) &&
            request.uid === uid &&
            request.tileId === tileId
          ),
      );
      (this.list as any) = list;
    }

    if (tileRequestClass === TileRequestClass.CREATE) {
      const list = this.list.filter(
        (request) =>
          !(
            request.tileRequestClass === TileRequestClass.CREATE &&
            request.uid === uid &&
            request.tileId === tileId
          ),
      );
      (this.list as any) = list;
    }

    if (request.tileRequestClass === TileRequestClass.UPDATE) {
      const overriddenRequest = this.list.find(
        (listed) =>
          listed.tileRequestClass !== TileRequestClass.FINISH &&
          listed.uid === uid &&
          listed.tileId === tileId,
      );
      if (overriddenRequest) {
        if (
          overriddenRequest.tileRequestClass === TileRequestClass.CREATE ||
          overriddenRequest.tileRequestClass === TileRequestClass.UPDATE
        )
          overriddenRequest.tileData = request.tileData;
        return true;
      }
    }

    return false;
  }
}
