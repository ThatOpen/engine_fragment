import { VirtualFragmentsModel } from "../virtual-fragments-model";

export class ItemsHelper {
  traverse(
    model: VirtualFragmentsModel,
    itemIds: number[],
    onItem: (itemId: number, index: number) => void,
  ) {
    if (itemIds) {
      this.traverseItems(itemIds, onItem);
      return;
    }
    this.traverseAllItems(model, onItem);
  }

  getItemsByConfig(
    model: VirtualFragmentsModel,
    condition: (item: number) => boolean,
  ) {
    const found: number[] = [];
    const count = model.data.localIdsLength();
    for (let itemId = 0; itemId < count; itemId++) {
      const conditionPass = condition(itemId);
      if (!conditionPass) continue;
      found.push(itemId);
    }
    return found;
  }

  private traverseItems(
    itemIds: number[],
    onItem: (itemId: number, index: number) => void,
  ) {
    const itemsCount = itemIds.length;
    for (let id = 0; id < itemsCount; id++) {
      onItem(itemIds[id], id);
    }
  }

  private traverseAllItems(
    model: VirtualFragmentsModel,
    onItem: (itemId: number, index: number) => void,
  ) {
    const itemsCount = model.itemConfig.size;
    for (let id = 0; id < itemsCount; id++) {
      onItem(id, id);
    }
  }
}
