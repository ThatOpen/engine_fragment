import * as THREE from "three";
import {
  InformationResultType,
  ItemInformationType,
  ItemSelectionType,
  ResultInputType,
  SelectionInputType,
} from "./model-types";
import { FragmentsModel } from "./fragments-model";
import { EditManager } from "./edit-manager";
import { MaterialManager } from "./material-manager";
import type { Cloned } from "../multithreading/cloned";

// Each kind of result as it is handed out, from the copy the worker sends.
const restore: {
  [T in ItemInformationType]: (
    copy: Cloned<InformationResultType<T>>,
  ) => InformationResultType<T>;
} = {
  attributes: (copy) => copy,
  category: (copy) => copy,
  children: (copy) => copy,
  data: (copy) => copy,
  geometry: (copy) => copy.map(EditManager.restoreTransforms),
  guid: (copy) => copy,
  highlight: (copy) => copy.map((m) => m && MaterialManager.restoreColor(m)),
  mergedBoxes: ({ min, max }) =>
    new THREE.Box3(
      new THREE.Vector3().copy(min),
      new THREE.Vector3().copy(max),
    ),
  relations: (copy) => copy,
  visibility: (copy) => copy,
};

export class SequenceManager {
  async getSequenced<
    T extends ItemInformationType,
    U extends ItemSelectionType,
  >(
    model: FragmentsModel,
    result: T,
    fromItems: U[],
    inputs?: {
      selector?: Partial<Record<U, SelectionInputType<U>>>;
      result?: ResultInputType<T>;
    },
  ) {
    const response = await model._invoke("getSequenced", [
      result,
      fromItems,
      inputs,
    ]);
    // The worker doesn't know `result`.
    if (response === null) return null;
    // It answers with the kind of result `result` asks for.
    return restore[result](response as Cloned<InformationResultType<T>>);
  }
}
