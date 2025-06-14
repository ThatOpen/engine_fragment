import * as THREE from "three";
import { VirtualBoxController } from "../../bounding-boxes";
import { Meshes, Model, SpatialStructure } from "../../../../Schema";

import { Identifier } from "../../model";
import {
  ItemData,
  ItemsDataConfig,
  SpatialTreeItem,
  VirtualPropertiesConfig,
} from "../../model/model-types";

export class VirtualPropertiesController {
  private readonly _model: Model;
  private readonly _boxes: VirtualBoxController;
  private readonly _localIdsToGeometryIds = new Map<number, number[]>();

  private _itemDataCache: Map<Identifier, ItemData> = new Map();
  private _itemDataConfig: ItemsDataConfig = {
    attributesDefault: true,
    relationsDefault: { attributes: false, relations: false },
  };

  private _spatialStructure: SpatialTreeItem | null = null;

  constructor(
    model: Model,
    boxes: VirtualBoxController,
    config?: VirtualPropertiesConfig,
  ) {
    this._model = model;
    this._boxes = boxes;
    this.preindexGeometryIds();
    if (config && config.extraRelations) {
      for (const extra of config.extraRelations) {
        const { category, relation, inverseName } = extra;
        this.addInverseRelation(category, relation, inverseName);
      }
    }
  }

  private _relations = new Map<number, Record<string, number[]>>();

  addInverseRelation(category: string, relation: string, inverseName: string) {
    const psetLocalIds = this.getItemsOfCategory(category);
    for (const psetId of psetLocalIds) {
      const relations = this.getItemRelations(psetId);
      if (!(relations && relations[relation])) continue;
      const localIds = relations[relation];
      for (const itemId of localIds) {
        let relationsObject = this._relations.get(itemId);
        if (!relationsObject) {
          relationsObject = {};
          this._relations.set(itemId, relationsObject);
        }
        let inverse = relationsObject[inverseName];
        if (!inverse) {
          inverse = [];
          relationsObject[inverseName] = inverse;
        }
        inverse.push(psetId);
      }
    }
  }

  getItemsCount() {
    return this._model.localIdsLength();
  }

  getMaxLocalId() {
    return this._model.maxLocalId();
  }

  getMetadata() {
    const metadata = this._model.metadata();
    if (!metadata) {
      return null;
    }
    return JSON.parse(metadata);
  }

  getItemIdsFromLocalIds(localIds?: Iterable<number>): number[] {
    if (!localIds) {
      return Array.from(this._model.meshes()!.meshesItemsArray()!);
    }
    const itemIds: number[] = [];
    for (const localId of localIds) {
      const found = this._localIdsToGeometryIds.get(localId);
      if (!found) continue;
      for (const itemId of found) {
        itemIds.push(itemId);
      }
    }
    return itemIds;
  }

  getLocalIdsFromItemIds(itemIds: Iterable<number>) {
    const result: number[] = [];
    const entries = this._localIdsToGeometryIds.entries();
    for (const [localId, geometryIds] of entries) {
      for (const itemId of itemIds) {
        if (!geometryIds.includes(itemId)) continue;
        result.push(localId);
      }
    }
    return result;
  }

  getBox(items: number[], result: THREE.Box3) {
    for (const itemId of items) {
      const currentBoxesIds = this._boxes.sampleOf(itemId);
      if (currentBoxesIds) {
        for (const currentBoxId of currentBoxesIds) {
          const currentBox = this._boxes.get(currentBoxId);
          result.union(currentBox);
        }
      }
    }
  }

  getSpatialStructure() {
    if (this._spatialStructure) {
      return this._spatialStructure;
    }
    const structure = this._model.spatialStructure();
    if (!structure) {
      return {} as SpatialTreeItem;
    }
    this._spatialStructure = this.getTreeItem(structure);
    return this._spatialStructure;
  }

  getItemsChildren(ids: Identifier[]) {
    const result = new Set<number>();
    for (const id of ids) {
      const localId = this.convertToLocalId(id);
      if (localId === null) continue;
      this.traverseSpatialStructure(localId, result);
    }
    return [...result];
  }

  getItemCategory(id: Identifier) {
    const isLocalId = typeof id === "number";
    const localId = isLocalId ? id : this.getLocalIdsByGuids([id])[0];
    if (localId === null) {
      return null;
    }
    const itemIndex = this._model.localIdsArray()?.indexOf(localId);
    if (itemIndex === undefined || itemIndex === -1) {
      return null;
    }
    const category = this._model.categories(itemIndex);
    return category;
  }

  getLocalIdsByGuids(guids: string[]) {
    const localIds: (number | null)[] = new Array(guids.length).fill(null);

    const guidToIndexMap = new Map();
    guids.forEach((guid, index) => {
      guidToIndexMap.set(guid, index);
    });

    let found = 0;
    const guidCount = this._model.guidsLength();
    for (let i = 0; i < guidCount; i++) {
      const guid = this._model.guids(i);
      const guidIndex = guidToIndexMap.get(guid);
      if (guidIndex === undefined) {
        continue;
      }
      localIds[guidIndex] = this._model.guidsItems(i);
      found++;
      if (guids.length === found) {
        break;
      }
    }
    return localIds;
  }

  getGuidsByLocalIds(localIds: number[]) {
    const guids: (string | null)[] = localIds.map(() => null);
    const bufferGuidItems = this._model.guidsItemsArray();
    if (!bufferGuidItems) return guids;
    let found = 0;
    for (const [i, localId] of bufferGuidItems.entries()) {
      const localIdIndex = localIds.indexOf(localId);
      if (localIdIndex === -1) {
        continue;
      }
      guids[localIdIndex] = this._model.guids(i) ?? null;
      found++;
      if (localIds.length === found) {
        break;
      }
    }
    return guids;
  }

  getItemAttributes(id: Identifier) {
    const isLocalId = typeof id === "number";
    const localId = isLocalId ? id : this.getLocalIdsByGuids([id])[0];
    if (localId === null) {
      return null;
    }
    const index = this._model.localIdsArray()?.indexOf(localId);
    if (index === undefined || index === -1) {
      return null;
    }
    const buffer = this._model.attributes(index);
    if (!buffer) {
      return null;
    }
    const data: Record<string, { value: any; type?: string }> = {};
    for (let j = 0; j < buffer.dataLength(); j++) {
      const attr = buffer.data(j);
      if (!attr) {
        continue;
      }
      const [name, value, type] = JSON.parse(attr) as [string, any, string?];
      data[name] = { value, type };
    }
    return data;
  }

  getItemData(
    id: Identifier,
    config: { parentName?: string; rel?: string } = {},
  ) {
    const allAttributes = this._itemDataConfig.attributesDefault;
    const attributesConfig = this._itemDataConfig.attributes;
    const relationsConfig = this._itemDataConfig.relations ?? {};
    let { attributes, relations } = this._itemDataConfig.relationsDefault;

    const { parentName, rel } = config;
    if (!parentName && !rel) {
      attributes = true;
      relations = true;
    } else {
      const hasRelConfig = rel && rel in relationsConfig;
      const hasParentConfig = parentName && parentName in relationsConfig;
      if (hasRelConfig) {
        const toProcess = relationsConfig[rel];
        if (toProcess) {
          attributes = toProcess.attributes;
          relations = toProcess.relations;
        }
      } else if (hasParentConfig) {
        const toProcess = relationsConfig[parentName];
        if (toProcess) {
          attributes = toProcess.attributes;
          relations = toProcess.relations;
        }
      }
    }

    if (!attributes && !relations) {
      return {};
    }

    if (this._itemDataCache.has(id)) {
      return this._itemDataCache.get(id)!;
    }

    const data: ItemData = {
      _category: { value: this.getItemCategory(id) },
      _localId: {
        value: typeof id === "number" ? id : this.getLocalIdsByGuids([id])[0],
      },
      _guid: {
        value: typeof id === "string" ? id : this.getGuidsByLocalIds([id])[0],
      },
    };

    this._itemDataCache.set(id, data);

    if (attributes) {
      const itemAttrs = this.getItemAttributes(id);
      for (const [key, value] of Object.entries(itemAttrs ?? {})) {
        if (allAttributes) {
          if (!attributesConfig?.includes(key)) {
            data[key] = value;
          }
        } else if (attributesConfig?.includes(key)) {
          data[key] = value;
        }
      }
    }

    if (relations) {
      const itemRels = this.getItemRelations(id);
      for (const [key, localIds] of Object.entries(itemRels ?? {})) {
        for (const localId of localIds) {
          const itemData = this.getItemData(localId, {
            parentName: rel,
            rel: key,
          });
          if (Object.keys(itemData).length === 0) {
            continue;
          }
          const info = data[key];
          if (Array.isArray(info)) {
            info.push(itemData);
          } else {
            data[key] = [itemData];
          }
        }
      }
    }

    return data;
  }

  getItemsData(ids: Identifier[], config: Partial<ItemsDataConfig> = {}) {
    this._itemDataCache.clear();
    const result: ItemData[] = [];
    const _ids = ids.length !== 0 ? ids : this._model.localIdsArray();
    if (!_ids) return result;
    this._itemDataConfig = {
      ...this._itemDataConfig,
      ...config,
    };
    for (const id of _ids) {
      result.push(this.getItemData(id));
    }
    this._itemDataCache.clear();
    this._itemDataConfig = {
      relationsDefault: { attributes: false, relations: false },
      attributesDefault: true,
    };
    return result;
  }

  getItemRelations(id: Identifier) {
    const isLocalId = typeof id === "number";
    const localId = isLocalId ? id : this.getLocalIdsByGuids([id])[0];
    if (localId === null) {
      return null;
    }
    const relations = this._relations.get(localId) ?? {};
    const index = this._model.relationsItemsArray()?.indexOf(localId);
    if (index === undefined || index === -1) {
      return Object.keys(relations).length > 0 ? relations : null;
    }
    const buffer = this._model.relations(index);
    if (!buffer) {
      return Object.keys(relations).length > 0 ? relations : null;
    }
    for (let j = 0; j < buffer.dataLength(); j++) {
      const attr = buffer.data(j);
      if (!attr) {
        continue;
      }
      const [name, ...localIds] = JSON.parse(attr) as [string, ...number[]];
      relations[name] = localIds;
    }
    return relations;
  }

  getCategories() {
    const categories = new Set<string>();
    for (let index = 0; index < this._model.categoriesLength(); index++) {
      const category = this._model.categories(index);
      if (!category) continue;
      categories.add(category);
    }
    return [...categories];
  }

  // Improve this with an indexation at runtime?
  getItemsOfCategory(category: string) {
    let localIds: number[] = [];
    let firstIndex: number | null = null;
    let count = 0;
    const categoryCount = this._model.categoriesLength();
    for (let index = 0; index < categoryCount; index++) {
      const currentcategory = this._model.categories(index);
      if (currentcategory !== category) {
        continue;
      }
      if (firstIndex !== null && currentcategory !== category) {
        break;
      }
      if (firstIndex === null) {
        firstIndex = index;
      }
      count++;
    }
    if (firstIndex === null) {
      return localIds;
    }
    const allLocalIds = this._model.localIdsArray();
    if (!allLocalIds) {
      return localIds;
    }
    localIds = [...allLocalIds].slice(firstIndex, firstIndex + count);
    return localIds;
  }

  getItemsWithGeometry() {
    const meshes = this._model.meshes(new Meshes());
    const localIds: number[] = [];
    if (!meshes) {
      return localIds;
    }
    const indices = meshes.meshesItemsArray();
    if (!indices) {
      return localIds;
    }
    for (const index of indices) {
      const localId = this._model.localIds(index);
      if (localId === null) {
        continue;
      }
      localIds.push(localId);
    }
    return localIds;
  }

  private getTreeItem(item: SpatialStructure) {
    const tree: SpatialTreeItem = {
      category: item.category(),
      localId: item.localId(),
    };
    const children: SpatialTreeItem[] = [];
    for (let i = 0; i < item.childrenLength(); i++) {
      const child = item.children(i);
      if (!child) {
        continue;
      }
      children.push(this.getTreeItem(child));
    }
    if (children.length > 0) {
      tree.children = children;
    }
    return tree;
  }

  private preindexGeometryIds() {
    const geometries = this._model.meshes()!;
    const length = geometries.meshesItemsLength();
    for (let i = 0; i < length; i++) {
      const localIdIndex = geometries.meshesItems(i)!;
      const localId = this._model.localIds(localIdIndex);
      if (localId === null) continue;
      if (!this._localIdsToGeometryIds.has(localId)) {
        this._localIdsToGeometryIds.set(localId, []);
      }
      this._localIdsToGeometryIds.get(localId)!.push(i);
    }
  }

  private convertToLocalId(id: Identifier) {
    const isLocalId = typeof id === "number";
    const localId = isLocalId ? id : this.getLocalIdsByGuids([id])[0];
    return localId;
  }

  private getChildrenLocalIds(
    treeItem: SpatialTreeItem,
    collector: Set<number>,
  ) {
    if (treeItem.localId !== null) {
      collector.add(treeItem.localId);
    }

    if (treeItem.children) {
      for (const child of treeItem.children) {
        this.getChildrenLocalIds(child, collector);
      }
    }
  }

  private traverseSpatialStructure(
    localId: number,
    collector: Set<number>,
    treeItem = this.getSpatialStructure(),
  ) {
    if (!treeItem) return;

    if (treeItem.localId === localId && treeItem.children) {
      for (const child of treeItem.children) {
        this.getChildrenLocalIds(child, collector);
      }
      return;
    }

    if (treeItem.children) {
      for (const child of treeItem.children) {
        this.traverseSpatialStructure(localId, collector, child);
      }
    }
  }
}
