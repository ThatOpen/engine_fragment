import * as THREE from "three";
import { ModelUid, MultiThreadingRequestClass } from "./model-types";
import { FragmentsModel } from "./fragments-model";
import { Cloned } from "../multithreading/cloned";

export class BoxManager {
  async getBoxes(model: FragmentsModel, localIds?: number[]) {
    const ids = this.getIndividualBoxesIds(localIds);
    const request = this.getBoxRequest(model, ids);
    const response = await model.threads.fetch(request);
    return this.getAllBoxes(response, model);
  }

  async getMergedBox(model: FragmentsModel, localIds: number[]) {
    const request = this.getBoxRequest(model, [localIds]);
    const { boxes } = await model.threads.fetch(request);
    const [box] = boxes!;
    return this.getAbsoluteBox(box, model);
  }

  private getAbsoluteBox(box: any, model: FragmentsModel) {
    const merged = new THREE.Box3();
    merged.copy(box);
    merged.applyMatrix4(model.object.matrixWorld);
    return merged;
  }

  private getIndividualBoxesIds(localIds: number[] | undefined) {
    if (!localIds) return undefined;
    const ids: number[][] = [];
    for (const id of localIds) {
      ids.push([id]);
    }
    return ids;
  }

  private getAllBoxes(response: any, model: FragmentsModel) {
    const rawBoxes = response.boxes;
    const result: THREE.Box3[] = [];
    for (const box of rawBoxes) {
      const newBox = new THREE.Box3();
      newBox.copy(box);
      newBox.applyMatrix4(model.object.matrixWorld);
      result.push(newBox);
    }
    return result;
  }

  private getBoxRequest(
    model: FragmentsModel,
    localIds: number[][] | undefined,
  ): {
    class: MultiThreadingRequestClass.FETCH_BOXES;
    uid: ModelUid;
    localIds: number[][] | undefined;
    /** Set by the worker: one box per entry of `localIds`. */
    boxes?: Cloned<THREE.Box3>[];
  } {
    return {
      class: MultiThreadingRequestClass.FETCH_BOXES,
      uid: model._uid,
      localIds,
    };
  }
}
