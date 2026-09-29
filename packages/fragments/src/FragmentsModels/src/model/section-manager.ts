import * as THREE from "three";
import { FragmentsModel } from "./fragments-model";
import { ModelSection } from "./model-types";

export class SectionManager {
  async getSection(
    model: FragmentsModel,
    plane: THREE.Plane,
    localIds?: number[],
  ) {
    const result = (await model._invoke("getSection", [
      plane,
      localIds,
    ])) as ModelSection;
    return result;
  }
}
