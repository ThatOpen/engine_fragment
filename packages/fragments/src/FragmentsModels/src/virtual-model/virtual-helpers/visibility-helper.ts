import { VirtualFragmentsModel } from "../virtual-fragments-model";

export class VisibilityHelper {
  resetVisible(model: VirtualFragmentsModel) {
    model.itemConfig.clearVisible();
    model.tiles.restart();
  }

  getVisible(model: VirtualFragmentsModel, items: number[]) {
    const itemIds = model.properties.getItemIdsFromLocalIds(items);
    const result: boolean[] = [];
    for (const id of itemIds) {
      const isVisible = model.itemConfig.visible(id);
      result.push(isVisible);
    }
    return result;
  }

  getItemsByVisibility(model: VirtualFragmentsModel, visible: boolean) {
    const visibleCondition = this.getVisibleCondition(model, visible);
    const result = model.getItemsByConfig(visibleCondition);
    const localIds = model.properties.getLocalIdsFromItemIds(result);
    return localIds;
  }

  toggleVisible(model: VirtualFragmentsModel, localIds: number[]) {
    const itemIds = model.properties.getItemIdsFromLocalIds(localIds);
    const toggleEvent = this.getToggleEvent(model);
    model.traverse(itemIds, toggleEvent);
    model.tiles.updateVirtualMeshes(itemIds);
  }

  setVisible(
    model: VirtualFragmentsModel,
    localIds: number[],
    visible: boolean,
  ): void {
    const itemIds = model.properties.getItemIdsFromLocalIds(localIds);
    const setEvent = this.getSetEvent(model, visible);
    model.traverse(itemIds, setEvent);
    model.tiles.updateVirtualMeshes(itemIds);
  }

  private getSetEvent(model: VirtualFragmentsModel, visible: boolean) {
    return (itemId: number) => {
      model.itemConfig.setVisible(itemId, visible);
    };
  }

  private getVisibleCondition(model: VirtualFragmentsModel, visible: boolean) {
    return (itemId: number) => {
      const currentVisible = model.itemConfig.visible(itemId);
      return currentVisible === visible;
    };
  }

  private getToggleEvent(model: VirtualFragmentsModel) {
    return (itemId: number) => {
      const isVisible = model.itemConfig.visible(itemId);
      model.itemConfig.setVisible(itemId, !isVisible);
    };
  }
}
