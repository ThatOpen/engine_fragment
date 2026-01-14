import { MaterialDefinition } from "../../model/model-types";
import { VirtualFragmentsModel } from "../virtual-fragments-model";

export class HighlightHelper {
  private readonly _highlightProps = [
    "color",
    "opacity",
    "transparent",
    "renderedFaces",
  ];

  resetHighlight(model: VirtualFragmentsModel, items: number[]): void {
    const itemIds = model.properties.getItemIdsFromLocalIds(items);
    this.resetHighlightForItems(itemIds, model);
    model.tiles.restart();
  }

  getHighlight(model: VirtualFragmentsModel, localIds: number[]) {
    const found: MaterialDefinition[] = [];
    const itemIds = model.properties.getItemIdsFromLocalIds(localIds);
    const fetchEvent = this.getFetchEvent(model, found);
    model.traverse(itemIds, fetchEvent);
    return found;
  }

  getHighlightItems(model: VirtualFragmentsModel) {
    const found: number[] = [];
    const count = model.itemConfig.size;
    for (let itemId = 0; itemId < count; itemId++) {
      const hasHighlight = model.itemConfig.getHighlight(itemId);
      if (!hasHighlight) continue;
      const [localId] = model.properties.getLocalIdsFromItemIds([itemId]);
      found.push(localId);
    }
    return found;
  }

  highlight(
    model: VirtualFragmentsModel,
    items: number[],
    material: MaterialDefinition,
  ) {
    const itemIds = model.properties.getItemIdsFromLocalIds(items);
    const materials: MaterialDefinition[] = [];
    const highlightEvent = this.getCheckEvent(model, material, materials);
    model.traverse(itemIds, highlightEvent);
    const ids = model.materials.transfer(materials);
    const createEvent = this.getCreateEvent(model, ids);
    model.traverse(itemIds, createEvent);
    model.tiles.updateVirtualMeshes(itemIds);
  }

  setColor(
    model: VirtualFragmentsModel,
    items: number[],
    color: MaterialDefinition["color"],
  ) {
    const material = {
      color,
      preserveOriginalMaterial: true,
    } as MaterialDefinition;
    this.highlight(model, items, material);
  }

  private getFetchEvent(
    model: VirtualFragmentsModel,
    found: MaterialDefinition[],
  ) {
    return (itemId: number) => {
      const id = model.itemConfig.getHighlight(itemId);
      if (id) {
        const result = model.materials.fetch(id);
        found.push(result);
        return;
      }
      found.push(undefined as any);
    };
  }

  private setHighlightProperty(
    newHigh: MaterialDefinition,
    pastHigh: MaterialDefinition,
    key: keyof MaterialDefinition,
  ) {
    if (newHigh[key] === undefined && pastHigh[key] !== undefined) {
      (newHigh[key] as any) = pastHigh[key];
    }
  }

  private getNewHighFromPast(
    model: VirtualFragmentsModel,
    past: number,
    highlightMaterial: MaterialDefinition,
  ) {
    const pastHigh = model.materials.fetch(past);
    const newHigh = { ...highlightMaterial } as MaterialDefinition;
    for (const prop of this._highlightProps) {
      this.setHighlightProperty(newHigh, pastHigh, prop as any);
    }
    return newHigh;
  }

  private getCheckEvent(
    model: VirtualFragmentsModel,
    highlightMaterial: MaterialDefinition,
    materials: MaterialDefinition[],
  ) {
    return (itemId: number) => {
      const past = model.itemConfig.getHighlight(itemId);
      if (past !== undefined) {
        const newHigh = this.getNewHighFromPast(model, past, highlightMaterial);
        materials.push(newHigh);
        return;
      }
      materials.push(highlightMaterial);
    };
  }

  private getCreateEvent(model: VirtualFragmentsModel, ids: number[]) {
    return (itemId: number, position: number) => {
      model.itemConfig.setHighlight(itemId, ids[position]);
    };
  }

  private resetHighlightForItems(
    itemIds: number[],
    model: VirtualFragmentsModel,
  ) {
    if (!itemIds) {
      model.itemConfig.clearHighlight();
      return;
    }
    for (const itemId of itemIds) {
      model.itemConfig.setHighlight(itemId, 0);
    }
  }
}
