import * as THREE from "three";
import { FragmentsModel } from "./fragments-model";

export class SectionManager {
  async getSection(model: FragmentsModel, plane: THREE.Plane) {
    const args = [plane];
    const result = (await model.threads.invoke(
      model.modelId,
      "getSection",
      args,
    )) as any;
    return result;
  }
}
