import { FragmentsModel } from "./fragments-model";

export class VisibilityManager {
  async resetVisible(model: FragmentsModel) {
    await model._invoke("resetVisible");
  }

  async getItemsByVisibility(model: FragmentsModel, visible: boolean) {
    return model._invoke("getItemsByVisibility", [visible]) as Promise<
      number[]
    >;
  }

  async getVisible(model: FragmentsModel, localIds: number[]) {
    return model._invoke("getVisible", [localIds]) as Promise<boolean[]>;
  }
}
