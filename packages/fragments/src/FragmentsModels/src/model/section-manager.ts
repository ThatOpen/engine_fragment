import * as THREE from "three";
import { FragmentsModel } from "./fragments-model";
import { ModelSection } from "./model-types";

export class SectionManager {
  async getSection(
    model: FragmentsModel,
    plane: THREE.Plane,
    localIds?: number[],
  ) {
    const args = [plane, localIds];
    const result = (await model.threads.invoke(
      model.modelId,
      "getSection",
      args,
    )) as ModelSection;
    return result;
  }
}
