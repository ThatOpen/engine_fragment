import { ItemData, ItemsDataConfig, Identifier } from "./model-types";
import { FragmentsModel } from "./fragments-model";
import { Item } from "./item";

export class ItemsManager {
  getItem(model: FragmentsModel, id: Identifier) {
    return new Item(model, id);
  }

  async getItemsData(
    model: FragmentsModel,
    ids: Identifier[],
    config?: Partial<ItemsDataConfig>,
  ) {
    return model.threads.invoke(model.modelId, "getItemsData", [
      ids,
      config,
    ]) as Promise<ItemData[]>;
  }

  async getItemsChildren(model: FragmentsModel, ids: Identifier[]) {
    return model.threads.invoke(model.modelId, "getItemsChildren", [
      ids,
    ]) as Promise<number[]>;
  }
}
