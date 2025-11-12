import * as THREE from "three";
import { VirtualBoxController } from "../../bounding-boxes";
import { Meshes, Model, SpatialStructure } from "../../../../Schema";

import { Identifier } from "../../model";
import {
  AttributesUniqueValuesParams,
  GetItemsByAttributeParams,
  GetItemsByRelationParams,
  ItemData,
  ItemsDataConfig,
  ItemsQueryConfig,
  ItemsQueryParams,
  SpatialTreeItem,
  VirtualPropertiesConfig,
} from "../../model/model-types";
import { VirtualFragmentsModel } from "..";
import { EditRequestType, RawRelationData } from "../../../../Utils";

// TODO: Create private _items on demand and not always from the start
export class VirtualPropertiesController {
  private readonly _model: Model;
  private readonly _boxes: VirtualBoxController;
  private readonly _localIdsToGeometryIds = new Map<number, number[]>();

  private _guidToLocalIdMap = new Map<string, number>();
  private _items = new Map<
    number,
    {
      category: string | null;
      guid: string | null;
      geometryIds: number[] | null;
      attrs: any;
    }
  >();

  private _itemDataCache: Map<Identifier, ItemData> = new Map();
  private _itemDataConfig: ItemsDataConfig = {
    attributesDefault: true,
    relationsDefault: { attributes: false, relations: false },
  };

  private _spatialStructure: SpatialTreeItem | null = null;

  private _virtualModel: VirtualFragmentsModel;

  constructor(
    virtualModel: VirtualFragmentsModel,
    boxes: VirtualBoxController,
    config?: VirtualPropertiesConfig,
  ) {
    this._virtualModel = virtualModel;
    this._model = virtualModel.data;
    this._boxes = boxes;
    this.preindexGeometryIds();
    if (config && config.extraRelations) {
      for (const extra of config.extraRelations) {
        const { category, relation, inverseName } = extra;
        this.addInverseRelation(category, relation, inverseName);
      }
    }

    const localIds = this._model.localIdsArray();
    if (localIds) {
      for (let i = 0; i < this._model.localIdsLength(); i++) {
        const category = this._model.categories(i);
        // const attrs: any = {};
        // const bufferAttributes = this._model.attributes(i);
        // if (bufferAttributes) {
        //   for (let j = 0; j < bufferAttributes.dataLength(); j++) {
        //     const data = bufferAttributes.data(j);
        //     const [name, value, type] = JSON.parse(data);
        //     attrs[name] = { value, type };
        //   }
        // }
        const localId = localIds[i];
        let itemInfo = this._items.get(localId);
        if (!itemInfo) {
          itemInfo = {
            category: null,
            guid: null,
            geometryIds: null,
            attrs: null,
          };
          this._items.set(localId, itemInfo);
        }
        itemInfo.category = category;
        // itemInfo.attrs = attrs;
      }
      for (let i = 0; i < this._model.guidsItemsLength(); i++) {
        const localId = this._model.guidsItems(i);
        if (localId === null) continue;
        const guid = this._model.guids(i);
        this._guidToLocalIdMap.set(guid, localId);
        let itemInfo = this._items.get(localId);
        if (!itemInfo) {
          itemInfo = {
            category: null,
            guid: null,
            geometryIds: null,
            attrs: null,
          };
          this._items.set(localId, itemInfo);
        }
        itemInfo.guid = guid;
      }
    }
  }

  private _relations = new Map<number, Record<string, number[]>>();

  private getAllLocalIds() {
    return this._model.localIdsArray() ?? [];
  }

  addInverseRelation(category: string, relation: string, inverseName: string) {
    const categoriesIds = this.getItemsOfCategories([
      new RegExp(`^${category}$`),
    ]);
    const psetLocalIds = categoriesIds[category];
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

  getGuids() {
    const guids: string[] = [];
    for (let i = 0; i < this._model.guidsLength(); i++) {
      const guid = this._model.guids(i);
      guids.push(guid);
    }
    return guids;
  }

  getLocalIds() {
    const array = this._model.localIdsArray();
    if (!array) return [];
    return Array.from(array);
  }

  getItemsCategories(ids: Identifier[]) {
    const result: (string | null)[] = [];

    for (const id of ids) {
      const localId = this.convertToLocalId(id);
      if (localId === null) continue;
      const category = this._items.get(localId)?.category ?? null;
      result.push(category);
    }

    return result;
  }

  getLocalIdsByGuids(guids: string[]) {
    const result: (number | null)[] = [];

    for (const guid of guids) {
      const localId = this._guidToLocalIdMap.get(guid);
      result.push(localId !== undefined ? localId : null);
    }

    return result;
  }

  getGuidsByLocalIds(localIds: number[]) {
    const result: (string | null)[] = [];

    for (const id of localIds) {
      const guid = this._items.get(id)?.guid;
      result.push(guid !== undefined ? guid : null);
    }

    return result;
  }

  getAttributeNames() {
    const names = new Set<string>();
    for (let i = 0; i < this._model.uniqueAttributesLength(); i++) {
      const attribute = this._model.uniqueAttributes(i);
      if (!attribute) continue;
      const [name] = JSON.parse(attribute);
      names.add(name);
    }
    return [...names];
  }

  getAttributeValues() {
    const values = new Set<any>();
    for (let i = 0; i < this._model.uniqueAttributesLength(); i++) {
      const attribute = this._model.uniqueAttributes(i);
      if (!attribute) continue;
      const [, value] = JSON.parse(attribute);
      values.add(value);
    }
    return [...values];
  }

  getAttributesUniqueValues(params: AttributesUniqueValuesParams[]) {
    const map = new Map<string, Set<any>>();

    // All param entries must have the category
    // define to used them as a filter.
    // If not, would be checking for specific categories
    // in param entries that doesn't specify any
    const areCategoriesDefined = params.every(
      (value) => value.categories !== undefined,
    );

    const categoriesRegex = params
      .map((value) => value.categories)
      .filter((value) => value !== undefined)
      .flat();

    // It's safe to do the search looping through categories
    // instead of attributes because each set of attributes
    // always belong to a category, and the indices always match.
    for (let i = 0; i < this._model.categoriesLength(); i++) {
      let valid = true;
      if (areCategoriesDefined) {
        const category = this._model.categories(i);
        valid = categoriesRegex.some((regex) => regex?.test(category));
      }

      if (!valid) continue;

      const buffer = this._model.attributes(i);
      if (!buffer) continue;
      const attributeSet: Record<string, { value: any; type?: string }> = {};

      for (let j = 0; j < buffer.dataLength(); j++) {
        const attr = buffer.data(j);
        if (!attr) continue;
        const [name, value, type] = JSON.parse(attr) as [
          string,
          string | number | boolean,
          string?,
        ];
        attributeSet[name] = { value, type };
      }

      const keys = Object.keys(attributeSet);
      const category = this._model.categories(i);

      for (const { key: resultKey, attributes, get, categories } of params) {
        let categoryMatch = true;

        if (categories) {
          categoryMatch = categories.some((value) => value.test(category));
        }

        if (!categoryMatch) continue;

        let setPasses = true;

        if (attributes) {
          const { aggregation, queries } = attributes;

          const queryResults: boolean[] = [];
          for (const { name, value, type, negate } of queries) {
            const key = keys.find((key) => name.test(key));
            if (!(key && attributeSet[key]?.value !== undefined)) break;
            let pass = false;
            const { value: keyValue, type: keyType } = attributeSet[key];

            if (value instanceof RegExp) {
              pass = typeof keyValue === "string" && value.test(keyValue);
            } else {
              pass = keyValue === value;
            }

            if (type !== undefined) {
              pass = pass && typeof keyType === "string" && type.test(keyType);
            }

            if (negate) pass = !pass;

            queryResults.push(pass);
          }

          setPasses =
            aggregation === "exclusive"
              ? queryResults.every((result) => result)
              : queryResults.some((result) => result);
        }

        if (setPasses) {
          const key = keys.find((key) => get.test(key));
          if (!(key && attributeSet[key]?.value !== undefined)) continue;
          const mapKey = resultKey ?? key;
          let values = map.get(mapKey);
          if (!values) {
            values = new Set();
            map.set(mapKey, values);
          }
          values.add(attributeSet[key]?.value);
        }
      }
    }

    const result: { [name: string]: any[] } = {};
    for (const [name, values] of map) {
      result[name] = Array.from(values);
    }
    return result;
  }

  getAttributeTypes() {
    const types = new Set<string>();
    for (let i = 0; i < this._model.uniqueAttributesLength(); i++) {
      const attribute = this._model.uniqueAttributes(i);
      if (!attribute) continue;
      const [, , type] = JSON.parse(attribute);
      types.add(type);
    }
    return [...types];
  }

  getRelationNames() {
    const names = new Set<string>();
    for (let i = 0; i < this._model.relationNamesLength(); i++) {
      const name = this._model.relationNames(i);
      if (!name) continue;
      names.add(name);
    }
    return [...names];
  }

  // getItemsAttributes(ids: Identifier[]) {
  //   const result: (Record<string, { value: any; type?: string }> | null)[] =
  //     new Array(ids.length).fill(null);

  //   const localIdToIndexMap = new Map<number | string, number>();
  //   ids.forEach((id, index) => {
  //     localIdToIndexMap.set(id, index);
  //   });

  //   let found = 0;
  //   const count = this._model.localIdsLength();
  //   for (let i = 0; i < count; i++) {
  //     const localId = this._model.localIds(i);
  //     if (localId === null) continue;
  //     const index = localIdToIndexMap.get(localId);
  //     if (index === undefined) continue;
  //     const attributesBuffer = this._model.attributes(i);
  //     if (!attributesBuffer) {
  //       result[index] = null;
  //       continue;
  //     }
  //     const attributes: Record<string, { value: any; type?: string }> = {};
  //     for (let j = 0; j < attributesBuffer.dataLength(); j++) {
  //       const data = attributesBuffer.data(j);
  //       const [name, value, type] = data;
  //       attributes[name] = { value, type };
  //     }
  //     result[index] = attributes;
  //     found++;
  //     if (ids.length === found) {
  //       break;
  //     }
  //   }
  //   return result;
  // }

  getItemAttributes(id: Identifier) {
    const isLocalId = typeof id === "number";
    const localId = isLocalId ? id : this.getLocalIdsByGuids([id])[0];
    if (localId === null) {
      return null;
    }
    const index = this._model.localIdsArray()?.indexOf(localId);
    if (index === undefined || index === -1) {
      // If the item was created, return the created data
      const data: Record<string, { value: any; type?: string }> = {};
      for (let i = this._virtualModel.requests.length - 1; i >= 0; i--) {
        const request = this._virtualModel.requests[i];
        if (
          request.type === EditRequestType.CREATE_ITEM ||
          request.type === EditRequestType.UPDATE_ITEM
        ) {
          if (request.localId === localId) {
            for (const name in request.data.data) {
              const found = request.data.data[name];
              data[name] = { value: found.value, type: found.type };
            }
            return data;
          }
        }
      }

      // No previous id found and no new item, return null
      return null;
    }
    const buffer = this._model.attributes(index);
    if (!buffer) {
      return null;
    }
    const data: Record<string, { value: any; type?: string }> = {};

    // If edited, return edited data
    // We traverse it backwards to get the latest edited data
    for (let i = this._virtualModel.requests.length - 1; i >= 0; i--) {
      const request = this._virtualModel.requests[i];
      if (
        request.type === EditRequestType.UPDATE_ITEM ||
        request.type === EditRequestType.CREATE_ITEM
      ) {
        if (request.localId === localId) {
          for (const name in request.data.data) {
            const found = request.data.data[name];
            data[name] = { value: found.value, type: found.type };
          }
          return data;
        }
      }
    }

    for (let j = 0; j < buffer.dataLength(); j++) {
      const attr = buffer.data(j);
      if (!attr) {
        continue;
      }
      this.parseAttribute(attr, data);
    }
    return data;
  }

  private parseAttribute(
    attr: string,
    data: Record<string, { value: any; type?: string }>,
  ) {
    const [name, value, type] = JSON.parse(attr) as [string, any, string?];
    data[name] = { value, type };
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

    const localId =
      typeof id === "number" ? id : this._guidToLocalIdMap.get(id) ?? null;

    const deletedItems = new Set<number>();
    for (const request of this._virtualModel.requests) {
      if (request.type === EditRequestType.DELETE_ITEM) {
        deletedItems.add(request.localId as number);
      }
    }

    if (localId === null || deletedItems.has(localId)) {
      return {};
    }

    let category =
      localId !== null ? this._items.get(localId)?.category ?? null : null;

    let guid = typeof id === "string" ? id : this._items.get(id)?.guid ?? null;

    // If an item was created or updated, get its category and guid
    for (let i = 0; i < this._virtualModel.requests.length; i++) {
      const request = this._virtualModel.requests[i];
      if (
        request.type === EditRequestType.CREATE_ITEM ||
        request.type === EditRequestType.UPDATE_ITEM
      ) {
        if (request.localId === localId) {
          category = request.data.category;
          if (request.data.guid) {
            guid = request.data.guid;
          }
        }
      }
    }

    const data: ItemData = {
      _category: { value: category },
      _localId: { value: localId },
      _guid: { value: guid },
    };

    this._itemDataCache.set(id, data);

    if (attributes && localId !== null) {
      // const result = this._items.get(localId)?.attrs;
      // if (result) {
      //   for (const [key, value] of Object.entries(result)) {
      //     data[key] = value;
      //   }
      // }
      // const itemAttrs = this.getItemsAttributes([id])[0];
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
          if (deletedItems.has(localId)) {
            continue;
          }

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

  getRawRelations(ids?: number[]) {
    const source = new Set(ids ?? this.getLocalIds());
    const result: Map<number, RawRelationData> = new Map();
    for (const id of source) {
      const found = this.getItemRelations(id);
      if (found) {
        result.set(id, { data: found });
      }
    }
    return result;
  }

  getItemRelations(id: Identifier) {
    const isLocalId = typeof id === "number";
    const localId = isLocalId ? id : this.getLocalIdsByGuids([id])[0];

    // If a relation was created or updated and not saved yet, return the newest relation
    for (let i = this._virtualModel.requests.length - 1; i >= 0; i--) {
      const request = this._virtualModel.requests[i];
      if (
        request.type === EditRequestType.UPDATE_RELATION ||
        request.type === EditRequestType.CREATE_RELATION
      ) {
        if (request.localId === localId) {
          return request.data.data;
        }
      }
    }

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

    // Add created categories, if any
    for (let i = 0; i < this._virtualModel.requests.length; i++) {
      const request = this._virtualModel.requests[i];
      if (
        request.type === EditRequestType.CREATE_ITEM ||
        request.type === EditRequestType.UPDATE_ITEM
      ) {
        if (request.data.category) {
          categories.add(request.data.category);
        }
      }
    }

    return [...categories];
  }

  // Improve this with an indexation at runtime?
  // It already runs fast enough (?)
  getItemsOfCategories(categories: RegExp[]) {
    const result: { [category: string]: number[] } = {};

    const deletedItems = new Set<number>();
    for (const request of this._virtualModel.requests) {
      // Skip deleted items, if any
      if (request.type === EditRequestType.DELETE_ITEM) {
        deletedItems.add(request.localId as number);
      }
    }

    const addedItems = new Set<number>();

    for (let i = this._virtualModel.requests.length - 1; i >= 0; i--) {
      const request = this._virtualModel.requests[i];
      // Include created / updated items, if any
      if (
        request.type === EditRequestType.CREATE_ITEM ||
        request.type === EditRequestType.UPDATE_ITEM
      ) {
        if (deletedItems.has(request.localId as number)) {
          continue;
        }

        const localId = request.localId as number;
        if (addedItems.has(localId)) {
          continue;
        }

        for (const categoryRegex of categories) {
          if (categoryRegex.test(request.data.category)) {
            if (!result[request.data.category]) {
              result[request.data.category] = [];
            }

            addedItems.add(localId);
            result[request.data.category].push(request.localId as number);
          }
        }
      }
    }

    for (let index = 0; index < this._model.categoriesLength(); index++) {
      const currentCategory = this._model.categories(index);
      if (!currentCategory) continue;

      const localId = this._model.localIds(index) as number;
      if (deletedItems.has(localId)) {
        continue;
      }

      for (const categoryRegex of categories) {
        if (categoryRegex.test(currentCategory)) {
          if (!result[currentCategory]) {
            result[currentCategory] = [];
          }
          result[currentCategory].push(localId);
          break;
        }
      }
    }

    return result;
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

  getItemsWithGeometryCategories() {
    const localIds = this.getItemsWithGeometry();
    const categories = this.getItemsCategories(localIds);
    return categories;
  }

  getItemsByAttribute({
    name,
    value,
    type,
    negate,
    itemIds,
  }: GetItemsByAttributeParams) {
    const allAttributesLength = this._model.attributesLength();

    const res: number[] = [];

    for (let i = 0; i < allAttributesLength; i++) {
      const localId = this._model.localIds(i);
      if (localId === null) continue;
      if (itemIds?.length && !itemIds.includes(localId)) continue;
      const attribute = this._model.attributes(i);
      if (!attribute) continue;

      const dataLength = attribute?.dataLength();

      let itemPasses = false;

      for (let j = 0; j < dataLength; j++) {
        const data = attribute.data(j);
        if (!data) continue;

        const [attrName, val, typeValue] = JSON.parse(data) as [
          string,
          string | number | boolean,
          string?,
        ];

        if (name.test(attrName)) {
          // The check automatically passes if there is no value and type to check
          let pass = value === undefined && type === undefined;

          // If the initial pass value is false, it means there is a value or type to check
          if (!pass) {
            if (value !== undefined) {
              if (Array.isArray(value)) {
                pass = value.some(
                  (regex) => typeof val === "string" && regex.test(val),
                );
              } else if (value instanceof RegExp) {
                pass = typeof val === "string" && value.test(val);
              } else {
                pass = val === value;
              }
            }

            if (type !== undefined) {
              pass =
                pass && typeof typeValue === "string" && type.test(typeValue);
            }
          }

          if (pass) {
            itemPasses = true;
            break;
          }
        }
      }

      if (negate ? !itemPasses : itemPasses) {
        res.push(localId);
      }
    }

    return res;
  }

  private getItemsByRelation({
    name,
    targetItemIds,
    sourceItemIds,
  }: GetItemsByRelationParams) {
    const res: number[] = [];
    const sources = sourceItemIds ?? this.getAllLocalIds();

    for (const srcId of sources) {
      const rels = this.getItemRelations(srcId);
      const linked = rels?.[name];
      if (!linked) continue;
      if (targetItemIds) {
        // Any intersection → add and skip further checks for this src
        for (const trgId of linked) {
          if (targetItemIds.has(trgId)) {
            res.push(srcId);
            break;
          }
        }
      } else {
        // If there is no targetItemIds → only checks the relation exist in the source
        res.push(srcId);
      }
    }
    return res;
  }

  getItemsByQuery(params: ItemsQueryParams, config?: ItemsQueryConfig) {
    const { categories, attributes, relation } = params;

    //  Category pre‑filter (if any)
    let candidateIds = config?.localIds;
    if (!candidateIds) {
      candidateIds = categories?.filter(Boolean)?.length
        ? Object.values(this.getItemsOfCategories(categories)).flat()
        : undefined;
    }

    // If category was given and no item matches, the whole search fails
    if (candidateIds?.length === 0) return [];

    //  Attribute filter on the *main* items (if requested)
    if (attributes) {
      const aggregation = attributes.aggregation ?? "exclusive";
      // Store the result per attribute query
      const ids: number[][] = [];
      for (const attribute of attributes.queries) {
        if (attributes && Boolean(attribute.name)) {
          const localIds = this.getItemsByAttribute({
            ...attribute,
            itemIds: candidateIds,
          });
          ids.push(localIds);
        }
      }

      const set = new Set<number>();
      if (aggregation === "inclusive") {
        for (const collection of ids) {
          for (const id of collection) {
            set.add(id);
          }
        }
      } else {
        const map = new Map<number, number>();
        for (const collection of ids) {
          for (const id of collection) {
            const count = map.get(id);
            if (count === undefined) {
              map.set(id, 1);
            } else {
              map.set(id, count + 1);
            }
          }
        }
        for (const [id, count] of map) {
          if (count === ids.length) {
            set.add(id);
          }
        }
      }
      candidateIds = [...set];
    }

    // If attribute was given and no item matches, the whole search fails
    if (candidateIds?.length === 0) return [];

    //  Relation filter (if requested)
    if (relation && Boolean(relation.name)) {
      const { name, query } = relation;

      // Find *target* items that satisfy the attribute constraint
      const targetIds = query
        ? new Set<number>(this.getItemsByQuery(query))
        : undefined;

      //  Keep only candidates that reference ↑ targets via the chosen relation
      candidateIds = this.getItemsByRelation({
        name,
        targetItemIds: targetIds,
        sourceItemIds: candidateIds,
      });
    }

    // De-duplicate entries
    return Array.from(new Set(candidateIds));
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
    if (isLocalId) return id;
    const localId = this._guidToLocalIdMap.get(id);
    if (localId === undefined) return null;
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
