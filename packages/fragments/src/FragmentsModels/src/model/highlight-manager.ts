import { MaterialDefinition } from "./model-types";
import { FragmentsModel } from "./fragments-model";
import { MaterialManager } from "./material-manager";

export class HighlightManager {
  async getHighlight(model: FragmentsModel, localIds?: number[]) {
    const materials = (await model.threads.invoke(
      model.modelId,
      "getHighlight",
      [localIds],
    )) as MaterialDefinition[];
    MaterialManager.resetColors(materials);
    return materials;
  }

  async highlight(
    model: FragmentsModel,
    localIds: number[] | undefined,
    highlightMaterial: MaterialDefinition,
  ) {
    await model.threads.invoke(model.modelId, "highlight", [
      localIds,
      highlightMaterial,
    ]);
  }

  async setColor(
    model: FragmentsModel,
    localIds: number[] | undefined,
    color: MaterialDefinition["color"],
  ) {
    await model.threads.invoke(model.modelId, "setColor", [localIds, color]);
  }

  async resetColor(model: FragmentsModel, localIds: number[] | undefined) {
    await model.threads.invoke(model.modelId, "resetColor", [localIds]);
  }

  async setOpacity(
    model: FragmentsModel,
    localIds: number[] | undefined,
    opacity: number,
  ) {
    await model.threads.invoke(model.modelId, "setOpacity", [localIds, opacity]);
  }

  async resetOpacity(model: FragmentsModel, localIds: number[] | undefined) {
    await model.threads.invoke(model.modelId, "resetOpacity", [localIds]);
  }

  async getHighlightItemIds(model: FragmentsModel) {
    return model.threads.invoke(
      model.modelId,
      "getHighlightItemIds",
    ) as Promise<number[]>;
  }

  async resetHighlight(model: FragmentsModel, localIds?: number[]) {
    await model.threads.invoke(model.modelId, "resetHighlight", [localIds]);
  }
}
