import {
  MultiThreadingRequestClass,
  MaterialDefinition,
} from "../../model/model-types";
import { Material, Meshes, Model } from "../../../../Schema";
import { ParserHelper } from "../../utils/geometry/parser-helper";
import { MaterialUtils } from "../../utils/geometry/material-utils";

type VirtualMaterialTransfer = (data: any, trans?: any[]) => void;

export class VirtualMaterialController {
  private readonly _modelId: string;
  private readonly _list: MaterialDefinition[] = [];
  private readonly _idsByDefinition = new Map<string, number>();
  private readonly _onTransfer: VirtualMaterialTransfer;

  constructor(modelId: string, onTransfer: VirtualMaterialTransfer) {
    this._modelId = modelId;
    this._onTransfer = onTransfer;
  }

  update(model: Model): number[] {
    const meshes = model.meshes() as Meshes;
    const matList = [] as MaterialDefinition[];
    return this.getAll(meshes, matList);
  }

  fetch(materialId: number) {
    return this._list[materialId];
  }

  transfer(materials: MaterialDefinition[]): number[] {
    const result = this.deduplicateMaterials(materials);
    const { materialDefinitions, ids } = result;
    this.transferMaterialData(materialDefinitions);
    return ids;
  }

  getItemsMaterialDefinition(
    model: Model,
    indices: number[],
    localIds: number[],
  ) {
    const result: { localIds: number[]; definition: MaterialDefinition }[] = [];
    const meshes = model.meshes();
    if (!meshes) return [];
    const map = new Map<number, Set<number>>();
    for (const [index, itemIndex] of indices.entries()) {
      const sample = meshes.samples(itemIndex);
      if (!sample) continue;
      const materialIndex = sample.material();
      let materialItems = map.get(materialIndex);
      if (!materialItems) {
        materialItems = new Set();
        map.set(materialIndex, materialItems);
      }
      materialItems.add(localIds[index]);
    }
    for (const [materialIndex, localIds] of map.entries()) {
      const material = meshes.materials(materialIndex);
      if (!material) continue;
      const definition = ParserHelper.parseMaterial(material);
      result.push({ localIds: [...localIds], definition });
    }
    return result;
  }

  private deduplicateMaterials(materialDefinition: MaterialDefinition[]) {
    const ids = [] as number[];
    const materialDefinitions = [] as MaterialDefinition[];
    for (const material of materialDefinition) {
      const key = MaterialUtils.getKey(material);
      let id = this._idsByDefinition.get(key);
      if (id === undefined) {
        id = this._list.length;
        this._list.push(material);
        this._idsByDefinition.set(key, id);
        materialDefinitions.push(material);
      }
      ids.push(id);
    }
    return { materialDefinitions, ids };
  }

  private getAll(meshes: Meshes, materialDefinitions: MaterialDefinition[]) {
    const count = meshes.materialsLength();
    for (let i = 0; i < count; i++) {
      const matData = meshes.materials(i) as Material;
      const definition = ParserHelper.parseMaterial(matData);
      definition.localId = meshes.materialIds(i)!;
      materialDefinitions.push(definition);
    }
    return this.transfer(materialDefinitions);
  }

  private transferMaterialData(materialDefinitions: MaterialDefinition[]) {
    this._onTransfer({
      class: MultiThreadingRequestClass.CREATE_MATERIAL,
      modelId: this._modelId,
      materialDefinitions,
    });
  }
}
