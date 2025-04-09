import { FragmentsModel } from "./fragments-model";

export class VisibilityManager {
  async resetVisible(model: FragmentsModel) {
    await model.threads.invoke(model.modelId, "resetVisible");
  }

  async getItemsByVisibility(model: FragmentsModel, visible: boolean) {
    return model.threads.invoke(model.modelId, "getItemsByVisibility", [
      visible,
    ]) as Promise<number[]>;
  }

  async getVisible(model: FragmentsModel, localIds: number[]) {
    return model.threads.invoke(model.modelId, "getVisible", [
      localIds,
    ]) as Promise<boolean[]>;
  }
}
