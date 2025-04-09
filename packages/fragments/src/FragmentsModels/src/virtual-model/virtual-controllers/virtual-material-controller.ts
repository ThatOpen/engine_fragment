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

  private checkMaterialExists(material: MaterialDefinition, ids: number[]) {
    const count = this._list.length;
    for (let i = 0; i < count; i++) {
      const current = this._list[i];
      const isSame = MaterialUtils.isSame(material, current);
      if (isSame) {
        ids.push(i);
        return true;
      }
    }
    return false;
  }

  private deduplicateMaterials(materialDefinition: MaterialDefinition[]) {
    const ids = [] as number[];
    const materialDefinitions = [] as MaterialDefinition[];
    for (const material of materialDefinition) {
      const exists = this.checkMaterialExists(material, ids);
      if (!exists) {
        this._list.push(material);
        materialDefinitions.push(material);
        const currentId = this._list.length - 1;
        ids.push(currentId);
      }
    }
    return { materialDefinitions, ids };
  }

  private getAll(meshes: Meshes, materialDefinitions: MaterialDefinition[]) {
    const count = meshes.materialsLength();
    for (let i = 0; i < count; i++) {
      const matData = meshes.materials(i) as Material;
      const definition = ParserHelper.parseMaterial(matData);
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
