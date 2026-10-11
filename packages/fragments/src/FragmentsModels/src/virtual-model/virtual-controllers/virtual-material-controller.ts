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
  // Number of ids taken by the model's own materials. Every id at or above
  // it was allocated by a highlight and can be reclaimed once no item
  // references it any more.
  private _modelMaterialCount = 0;

  constructor(modelId: string, onTransfer: VirtualMaterialTransfer) {
    this._modelId = modelId;
    this._onTransfer = onTransfer;
  }

  update(model: Model): number[] {
    const meshes = model.meshes() as Meshes;
    const matList = [] as MaterialDefinition[];
    const ids = this.getAll(meshes, matList);
    this._modelMaterialCount = this._list.length;
    return ids;
  }

  /**
   * Drops every highlight definition, returning the id space to the model's
   * own materials. Only call it when no item holds a highlight id any more.
   * The main thread truncates its copy on the next transfer (`firstId`).
   */
  reclaimHighlights() {
    const count = this._modelMaterialCount;
    if (this._list.length <= count) return;
    this._list.length = count;
    for (const [key, id] of this._idsByDefinition) {
      if (id >= count) this._idsByDefinition.delete(key);
    }
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
    _localIds: number[],
  ) {
    // `indices` are meshes_items indices (from getItemIdsFromLocalIds), which
    // are what a sample's `item` points at. They are not sample indices, and
    // there can be more or fewer of them than localIds (an item with several
    // geometries, or none), so walk the samples and map each one back to its
    // own localId instead of pairing the two arrays by position.
    const result: { localIds: number[]; definition: MaterialDefinition }[] = [];
    const meshes = model.meshes();
    if (!meshes) return [];
    const wanted = new Set(indices);
    const map = new Map<number, Set<number>>();
    for (let i = 0; i < meshes.samplesLength(); i++) {
      const sample = meshes.samples(i);
      if (!sample) continue;
      const itemIndex = sample.item();
      if (!wanted.has(itemIndex)) continue;
      const localId = model.localIds(meshes.meshesItems(itemIndex)!);
      if (localId === null) continue;
      const materialIndex = sample.material();
      let materialItems = map.get(materialIndex);
      if (!materialItems) {
        materialItems = new Set();
        map.set(materialIndex, materialItems);
      }
      materialItems.add(localId);
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
    // The new definitions are always the tail of _list, so this is the id of
    // the first one. The main thread aligns its list to it, which drops any
    // definitions reclaimed here since the previous transfer.
    const firstId = this._list.length - materialDefinitions.length;
    this._onTransfer({
      class: MultiThreadingRequestClass.CREATE_MATERIAL,
      modelId: this._modelId,
      materialDefinitions,
      firstId,
    });
  }
}
