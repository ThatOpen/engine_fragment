import * as THREE from "three";
import { MultiThreadingRequestClass, VirtualModelConfig } from "./model-types";
import { FragmentsModel } from "./fragments-model";

export class SetupManager {
  async setup(
    model: FragmentsModel,
    bbox: THREE.Box3,
    modelData: ArrayBuffer | Uint8Array,
    raw?: boolean,
    config?: VirtualModelConfig,
  ) {
    const message = this.getCreateModelMessage(model, modelData, raw, config);
    const data = this.formatModelData(modelData);
    const result = await model.threads.fetch(message, data);
    this.updateBox(bbox, result);
  }

  private formatModelData(modelData: ArrayBuffer | Uint8Array) {
    if (modelData instanceof ArrayBuffer) {
      return [modelData];
    }
    return undefined;
  }

  private updateBox(bbox: THREE.Box3, result: any) {
    bbox.min.copy(result.boundingBox.min);
    bbox.max.copy(result.boundingBox.max);
  }

  private getCreateModelMessage(
    model: FragmentsModel,
    modelData: ArrayBuffer | Uint8Array,
    raw: boolean | undefined,
    config: VirtualModelConfig | undefined,
  ) {
    return {
      class: MultiThreadingRequestClass.CREATE_MODEL,
      modelId: model.modelId,
      modelData,
      raw,
      config,
    } as any;
  }
}
