import { VirtualFragmentsModel } from "../virtual-fragments-model";

export class VisibilityHelper {
  private _hiddenForEdit = new Set<number>();

  resetVisible(model: VirtualFragmentsModel) {
    model.itemConfig.clearVisible();
    model.tiles.restart();
  }

  getVisible(model: VirtualFragmentsModel, items: number[]) {
    const itemIds = model.properties.getItemIdsFromLocalIds(items);
    const result: boolean[] = [];
    for (const id of itemIds) {
      if (this._hiddenForEdit.has(id)) {
        continue;
      }
      const isVisible = model.itemConfig.visible(id);
      result.push(isVisible);
    }
    return result;
  }

  getItemsByVisibility(model: VirtualFragmentsModel, visible: boolean) {
    const visibleCondition = this.getVisibleCondition(model, visible);
    const result = model.getItemsByConfig(visibleCondition);
    const localIds = model.properties.getLocalIdsFromItemIds(result);
    const filtered = this.filterHiddenForEdit(localIds);
    return filtered;
  }

  toggleVisible(model: VirtualFragmentsModel, localIds: number[]) {
    const itemIds = model.properties.getItemIdsFromLocalIds(localIds);
    const filtered = this.filterHiddenForEdit(itemIds);
    const toggleEvent = this.getToggleEvent(model);
    model.traverse(filtered, toggleEvent);
    model.tiles.updateVirtualMeshes(filtered);
  }

  setVisible(
    model: VirtualFragmentsModel,
    localIds: number[],
    visible: boolean,
  ): void {
    const itemIds = model.properties.getItemIdsFromLocalIds(localIds);
    const filtered = this.filterHiddenForEdit(itemIds);
    const setEvent = this.getSetEvent(model, visible);
    model.traverse(filtered, setEvent);
    model.tiles.updateVirtualMeshes(filtered);
  }

  // Edited items are hidden and ignore all future visibility requests
  // Because their visibility is handled from the delta model
  hideForEdit(model: VirtualFragmentsModel, localIds: number[]) {
    this.setVisible(model, localIds, false);
    for (const id of localIds) {
      this._hiddenForEdit.add(id);
    }
  }

  private filterHiddenForEdit(localIds: number[]) {
    if (!this._hiddenForEdit.size) {
      return localIds;
    }
    const result: number[] = [];
    for (const id of localIds) {
      if (this._hiddenForEdit.has(id)) {
        continue;
      }
      result.push(id);
    }
    return result;
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
