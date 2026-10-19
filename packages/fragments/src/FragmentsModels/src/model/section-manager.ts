import * as THREE from "three";
import { FragmentsModel } from "./fragments-model";
import { ModelSection } from "./model-types";

export class SectionManager {
  async getSection(
    model: FragmentsModel,
    plane: THREE.Plane,
    localIds?: number[],
  ): Promise<ModelSection> {
    return model._invoke("getSection", [plane, localIds]);
  }
}
