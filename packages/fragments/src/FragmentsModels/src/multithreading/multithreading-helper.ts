import * as THREE from "three";

import {
  MultiThreadingRequestClass,
  TileRequestClass,
} from "../model/model-types";

export type Thread = Worker;

export class MultithreadingHelper {
  static newThread(url: string, classic?: boolean) {
    return classic ? new Worker(url) : new Worker(url, { type: "module" });
  }

  static newUpdater(effect: any, rate: number) {
    return setInterval(effect, rate);
  }

  static getMeshComputeRequest(modelId: string, list: any[]) {
    const className = MultiThreadingRequestClass.RECOMPUTE_MESHES;
    return { class: className, modelId, list };
  }

  static planeSet(planes: THREE.Plane[]) {
    const planeSet: THREE.Plane[] = [];
    for (const plane of planes) {
      const newNormal = this.array(plane.normal);
      const newConstant = plane.constant;
      const newPlane = new THREE.Plane(newNormal, newConstant);
      planeSet.push(newPlane);
    }
    return planeSet;
  }

  static data(data: any) {
    const isTransform = data?.elements !== undefined;
    if (isTransform) {
      return MultithreadingHelper.transform(data);
    }

    const isBeam = data?.origin !== undefined && data?.direction !== undefined;
    if (isBeam) {
      return MultithreadingHelper.beam(data);
    }

    const isFrustum = data?.planes !== undefined;
    if (isFrustum) {
      return MultithreadingHelper.frustum(data);
    }

    const hasNormal = data?.normal !== undefined;
    const hasConstant = data?.constant !== undefined;
    const isPlane = hasNormal && hasConstant;
    if (isPlane) {
      return MultithreadingHelper.plane(data);
    }

    const hasNormalSet = data[0]?.normal !== undefined;
    const hasConstantSet = data[0]?.constant !== undefined;
    const isPlaneSet = hasNormalSet && hasConstantSet;
    if (isPlaneSet) {
      return MultithreadingHelper.planeSet(data);
    }

    const hasX = data?.x !== undefined;
    const hasY = data?.y !== undefined;
    const hasZ = data?.z !== undefined;
    const isArray = hasX && hasY && hasZ;
    if (isArray) {
      return MultithreadingHelper.array(data);
    }

    return data;
  }

  /**
   * Monotonic sequence counter for RPC fence tracking. Every EXECUTE
   * request gets a fresh seq; the worker tags emitted FINISH tile
   * requests with the highest seq it has processed since the previous
   * FINISH, and main uses that to resolve `forceUpdateFinish` waiters
   * without polling.
   *
   * Module-level rather than per-FragmentsModels because the seq
   * space only needs to be unique across messages a single main
   * thread is sending; multiple FragmentsModels in the same window
   * would race on a shared counter regardless. This is simpler and
   * avoids threading through the helper's API.
   */
  private static _seq = 0;

  /**
   * Last seq dispatched. Snapshot at `forceUpdateFinish` call time
   * to know which seq must settle before we can resolve.
   */
  static get lastDispatchedSeq() {
    return MultithreadingHelper._seq;
  }

  static nextSeq() {
    MultithreadingHelper._seq += 1;
    return MultithreadingHelper._seq;
  }

  static getExecuteRequest(modelId: string, method: string, args: any) {
    const parameters = Array.from(args);
    const className = MultiThreadingRequestClass.EXECUTE;
    // `seq` is attached at the FragmentsConnection.fetch level so every
    // main → worker request (EXECUTE, REFRESH_VIEW, GET_BOXES, …) gets
    // tagged consistently. Tagging here would only cover EXECUTE.
    return { class: className, modelId, function: method, parameters };
  }

  static plane(plane: THREE.Plane) {
    const newNormal = this.array(plane.normal);
    const newConstant = plane.constant;
    const newPlane = new THREE.Plane(newNormal, newConstant);
    return newPlane;
  }

  static getRequestContent(input: any): any[] {
    const content: any[] = [];
    for (const request of input.list) {
      MultithreadingHelper.setupCreateRequest(request, content);
      MultithreadingHelper.setupUpdateRequest(request, content);
    }
    return content;
  }

  static array(vector: THREE.Vector3) {
    const array = new THREE.Vector3();
    array.set(vector.x, vector.y, vector.z);
    return array;
  }

  static cleanRequests(list: any[]) {
    const tasks: any[] = [];
    const helper = MultithreadingHelper;
    for (const request of list) {
      const isFinish = helper.isFinishRequest(request);
      if (!isFinish) {
        tasks.push(request);
      }
    }
    return tasks;
  }

  static frustum(frustum: THREE.Frustum) {
    const newPlane = this.planeSet(frustum.planes);
    const [a, b, c, d, e, f] = newPlane;
    return new THREE.Frustum(a, b, c, d, e, f);
  }

  static beam(ray: THREE.Ray) {
    const newOrigin = this.array(ray.origin);
    const newDirection = this.array(ray.direction);
    return new THREE.Ray(newOrigin, newDirection);
  }

  static transform(matrix: THREE.Matrix4) {
    const newMatrix = new THREE.Matrix4();
    newMatrix.copy(matrix);
    return newMatrix;
  }

  static deleteUpdater(updater: any) {
    clearInterval(updater);
  }

  static areCoresAvailable(currentThreads: number) {
    const capacity = MultithreadingHelper.getCpuCapacity();
    const availableThreads = Math.max(capacity, 2);
    return currentThreads < availableThreads;
  }

  /**
   * Effective max worker cap. Defaults to navigator.hardwareConcurrency - 3,
   * floored at 2 (matching the legacy areCoresAvailable behavior). Callers
   * may pass an explicit override (e.g. CI environments or apps that know
   * their workload). Floors at 2 even when overridden.
   */
  static getMaxWorkers(override?: number) {
    if (override !== undefined) {
      if (!Number.isFinite(override) || override < 2) {
        throw new Error(
          `Fragments: maxWorkers must be a finite number >= 2 (got ${override}).`,
        );
      }
      return Math.floor(override);
    }
    const capacity = MultithreadingHelper.getCpuCapacity();
    return Math.max(capacity, 2);
  }

  static isFinishRequest(request: any) {
    return request.tileRequestClass === TileRequestClass.FINISH;
  }

  private static setupUpdateRequest(request: any, content: any[]) {
    if (request.tileRequestClass === TileRequestClass.UPDATE) {
      this.addAllTileData(request, content);
    }
  }

  private static getCpuCapacity() {
    const freeCores = 3;
    if (globalThis.navigator?.hardwareConcurrency) {
      return navigator.hardwareConcurrency - freeCores;
    }
    return 0;
  }

  private static addAllTileData(request: any, content: any[]) {
    this.addRequestTileData(request, content, "visibilityData");
    const extras = ["highlightIds"];
    this.addRequestTileData(request, content, "highlightData", extras);
  }

  private static addRequestContent(id: string, request: any, content: any[]) {
    if (!request[id]) return;
    const buffer = request[id].buffer;
    content.push(buffer);
  }

  private static addRequestTileData(
    request: any,
    content: any[],
    name: string,
    extras: string[] = [],
  ) {
    const data = request.tileData[name];
    if (data) {
      content.push(data.position.buffer);
      content.push(data.size.buffer);
      for (const extra of extras) {
        content.push(request.tileData[extra].buffer);
      }
    }
  }

  private static setupCreateRequest(request: any, content: any[]) {
    if (request.tileRequestClass !== TileRequestClass.CREATE) {
      return;
    }
    const ids = this.getCreateRequestIds();
    for (const id of ids) {
      this.addRequestContent(id, request, content);
    }
    this.addAllTileData(request, content);
  }

  private static getCreateRequestIds() {
    return ["positions", "indices", "normals", "itemIds"];
  }
}
