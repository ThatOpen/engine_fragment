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
  // Samples grouped by the item they belong to, built on the first call to
  // getItemsMaterialDefinition. `_sampleStarts[item]` to
  // `_sampleStarts[item + 1]` is the range of that item in `_sampleIds`
  // (ascending) and `_sampleMaterials` (the material of each of them).
  // A loaded model never changes its samples: edits are kept as requests and
  // built into a separate delta model, which has its own controller. The
  // index still remembers the buffer it was built from and is rebuilt if
  // another one is passed.
  private _indexedBuffer: unknown = null;
  private _sampleStarts = new Uint32Array(0);
  private _sampleIds = new Uint32Array(0);
  private _sampleMaterials = new Uint32Array(0);

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
    // geometries, or none), so take the samples of each item and map each one
    // back to its own localId instead of pairing the two arrays by position.
    const result: { localIds: number[]; definition: MaterialDefinition }[] = [];
    const meshes = model.meshes();
    if (!meshes) return [];
    this.indexSamples(model, meshes);
    const starts = this._sampleStarts;

    // Positions (in the index) of the samples of the wanted items. An index
    // that is not an item has no range (the read is undefined) and is skipped.
    let count = 0;
    for (const itemIndex of indices) {
      const start = starts[itemIndex];
      const end = starts[itemIndex + 1];
      if (start === undefined || end === undefined) continue;
      count += end - start;
    }
    const found = new Uint32Array(count);
    let next = 0;
    for (const itemIndex of indices) {
      const start = starts[itemIndex];
      const end = starts[itemIndex + 1];
      if (start === undefined || end === undefined) continue;
      for (let i = start; i < end; i++) found[next++] = i;
    }

    // Visit them in sample order, which is the order a pass over every
    // sample would give. Usually they already are.
    const sampleIds = this._sampleIds;
    let sorted = true;
    for (let i = 1; i < count; i++) {
      if (sampleIds[found[i - 1]] > sampleIds[found[i]]) {
        sorted = false;
        break;
      }
    }
    if (!sorted) found.sort((a, b) => sampleIds[a] - sampleIds[b]);

    const sampleMaterials = this._sampleMaterials;
    const map = new Map<number, Set<number>>();
    let lastItem = -1;
    let localId: number | null = null;
    for (let i = 0; i < count; i++) {
      const position = found[i];
      const itemIndex = meshes.samples(sampleIds[position])!.item();
      if (itemIndex !== lastItem) {
        lastItem = itemIndex;
        localId = model.localIds(meshes.meshesItems(itemIndex)!);
      }
      if (localId === null) continue;
      const materialIndex = sampleMaterials[position];
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

  private indexSamples(model: Model, meshes: Meshes) {
    if (this._indexedBuffer === model.bb) return;
    const itemCount = meshes.meshesItemsLength();
    const sampleCount = meshes.samplesLength();
    const starts = new Uint32Array(itemCount + 1);
    const items = new Uint32Array(sampleCount);
    const materials = new Uint32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      const sample = meshes.samples(i)!;
      const itemIndex = sample.item();
      items[i] = itemIndex;
      materials[i] = sample.material();
      // A sample of an item that does not exist can never be asked for.
      if (itemIndex < itemCount) starts[itemIndex + 1]++;
    }
    for (let i = 0; i < itemCount; i++) starts[i + 1] += starts[i];
    const total = starts[itemCount];
    const sampleIds = new Uint32Array(total);
    const sampleMaterials = new Uint32Array(total);
    const cursor = starts.slice(0, itemCount);
    for (let i = 0; i < sampleCount; i++) {
      const itemIndex = items[i];
      if (itemIndex >= itemCount) continue;
      const position = cursor[itemIndex]++;
      sampleIds[position] = i;
      sampleMaterials[position] = materials[i];
    }
    this._sampleStarts = starts;
    this._sampleIds = sampleIds;
    this._sampleMaterials = sampleMaterials;
    this._indexedBuffer = model.bb;
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
