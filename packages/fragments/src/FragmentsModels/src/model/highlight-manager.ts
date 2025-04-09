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
