import { MaterialDefinition } from "./model-types";
import { FragmentsModel } from "./fragments-model";
import { MaterialManager } from "./material-manager";

export class HighlightManager {
  async getHighlight(model: FragmentsModel, localIds?: number[]) {
    const materials = await model._invoke("getHighlight", [localIds]);
    return materials.map((material) => MaterialManager.restoreColor(material));
  }

  async highlight(
    model: FragmentsModel,
    localIds: number[] | undefined,
    highlightMaterial: MaterialDefinition,
  ) {
    await model._invoke("highlight", [localIds, highlightMaterial]);
  }

  async setColor(
    model: FragmentsModel,
    localIds: number[] | undefined,
    color: MaterialDefinition["color"],
  ) {
    await model._invoke("setColor", [localIds, color]);
  }

  async resetColor(model: FragmentsModel, localIds: number[] | undefined) {
    await model._invoke("resetColor", [localIds]);
  }

  async setOpacity(
    model: FragmentsModel,
    localIds: number[] | undefined,
    opacity: number,
  ) {
    await model._invoke("setOpacity", [localIds, opacity]);
  }

  async resetOpacity(model: FragmentsModel, localIds: number[] | undefined) {
    await model._invoke("resetOpacity", [localIds]);
  }

  async getHighlightItemIds(model: FragmentsModel) {
    return model._invoke("getHighlightItemIds") as Promise<number[]>;
  }

  async resetHighlight(model: FragmentsModel, localIds?: number[]) {
    await model._invoke("resetHighlight", [localIds]);
  }
}
