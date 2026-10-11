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
  ): Promise<ItemData[]> {
    return model._invoke("getItemsData", [ids, config]);
  }

  async getItemsChildren(model: FragmentsModel, ids: Identifier[]) {
    return model._invoke("getItemsChildren", [ids]);
  }
}
