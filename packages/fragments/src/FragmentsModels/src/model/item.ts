import { ItemAttributes } from "./item-attributes";
import { ItemRelations } from "./item-relations";
import { ItemGeometry } from "./item-geometry";
import { FragmentsModel } from "./fragments-model";
import { Identifier } from "./model-types";

/**
 * Represents a single item in a Fragments model.
 * This class provides methods to access and retrieve information about the item,
 * including its attributes, relations, geometry, and data.
 */
export class Item {
  /**
   * The FragmentsModel instance that this item belongs to.
   */
  readonly model: FragmentsModel;

  /**
   * Creates a new Item instance.
   * @param model - The FragmentsModel instance that this item belongs to.
   * @param id - The identifier for the item, which can be either a number or a string.
   */
  constructor(model: FragmentsModel, id: Identifier) {
    this.model = model;
    if (typeof id === "number") this._localId = id;
    if (typeof id === "string") this._guid = id;
  }

  private _localId: number | null = null;

  /**
   * Gets the local ID of the item.
   */
  async getLocalId() {
    if (!this._localId) {
      if (this._guid) {
        [this._localId] = (await this.model.threads.invoke(
          this.model.modelId,
          "getLocalIdsByGuids",
          // @ts-ignore
          [[this._guid]],
        )) as (number | null)[];
      } else {
        throw new Error("Fragments: Item localId couldn't be get.");
      }
    }
    return this._localId;
  }

  private _attributes: ItemAttributes | null = null;

  /**
   * Gets all the attributes of the item.
   */
  async getAttributes() {
    if (this._attributes) return this._attributes;
    const localId = await this.getLocalId();
    if (localId === null) return null;

    const data = (await this.model.threads.invoke(
      this.model.modelId,
      "getItemAttributes",
      // @ts-ignore
      [localId],
    )) as { [name: string]: { value: any; type?: number } } | null;

    this._attributes = new ItemAttributes(localId);

    if (!data) {
      const changes = this.model.attrsChanges.get(localId);
      if (!(changes && changes.type === "added")) return null;
      this._attributes.localId = localId;
      for (const [key, value] of Object.entries(changes.data))
        this._attributes.set(key, value);
      return this._attributes;
    }

    const changes = this.model.attrsChanges.get(localId);
    if (changes && changes.type === "modified") {
      for (const [key, value] of Object.entries(changes.added))
        this._attributes.set(key, value);
    }

    for (const name in data) {
      const { value, type } = data[name];
      if (changes?.type === "modified" && changes.deleted.includes(name))
        continue;
      if (changes?.type === "modified" && name in changes.modified) {
        this._attributes.set(name, changes.modified[name]);
      } else {
        this._attributes.set(name, { value, type });
      }
    }

    this._attributes.tracker = this.model.attrsChanges;
    return this._attributes;
  }

  private _relations: ItemRelations | null = null;

  /**
   * Gets all the relations of the item to other items.
   */
  async getRelations() {
    if (this._relations) return this._relations;
    const localId = await this.getLocalId();
    if (localId === null) return null;

    const data = (await this.model.threads.invoke(
      this.model.modelId,
      "getItemRelations",
      // @ts-ignore
      [localId],
    )) as { [name: string]: number[] } | null;
    if (!data) return null;

    this._relations = new ItemRelations(localId);
    this._relations.onItemsRequested = async (ids) => {
      const items: Item[] = [];
      for (const id of ids) {
        const item = this.model.getItem(id);
        if (!item) continue;
        items.push(item);
      }
      return items;
    };

    const changes = this.model.relsChanges.get(localId);
    if (changes && changes.type === "modified") {
      for (const [key, value] of Object.entries(changes.added))
        this._relations.set(key, value);
    }

    for (const [relation, localIds] of Object.entries(data)) {
      if (changes?.type === "modified" && changes.deleted.has(relation))
        continue;
      if (changes?.type === "modified" && relation in changes.modified) {
        const data = new Set([...changes.modified[relation], ...localIds]);
        this._relations.set(relation, new Set(data));
      } else {
        this._relations.set(relation, new Set(localIds));
      }
    }

    this._relations.tracker = this.model.relsChanges;
    return this._relations;
  }

  private _guid: string | null = null;
  /**
   * Gets the GUID of the item.
   */
  async getGuid() {
    if (!this._guid) {
      const localId = await this.getLocalId();
      if (localId === null) return null;
      [this._guid] = await this.model.threads.invoke(
        this.model.modelId,
        "getGuidsByLocalIds",
        // @ts-ignore
        [[localId]],
      );
    }
    return this._guid;
  }

  private _category: string | null = null;
  /**
   * Gets the category of the item.
   */
  async getCategory() {
    if (!this._category) {
      const localId = await this.getLocalId();
      if (localId === null) return null;
      this._category = await this.model.threads.invoke(
        this.model.modelId,
        "getItemCategory",
        // @ts-ignore
        [localId],
      );
    }
    return this._category;
  }

  private _geometry: ItemGeometry | null = null;
  async getGeometry() {
    if (this._geometry) return this._geometry;
    const localId = await this.getLocalId();
    if (localId === null) return null;
    const geometry = new ItemGeometry(this.model, localId);
    return geometry;
  }

  /**
   * Gets all the data of the item.
   */
  async getData(collector: number[] = []) {
    const localId = await this.getLocalId();
    if (localId == null) return {};
    collector.push(localId);
    const attrs = (await this.getAttributes())?.object;
    const rels = await this.getRelations();
    const relAttrs: Record<string, any> = {};
    if (rels) {
      for (const key of rels.keys()) {
        const keyItems: any = [];
        relAttrs[key] = keyItems;
        const relItems = await rels.getItems(key);
        if (!relItems) continue;
        for (const item of relItems) {
          const itemId = await item.getLocalId();
          if (!itemId) continue;
          if (collector.find((id) => id === itemId) !== undefined) {
            continue;
          }
          collector.push(itemId);
          // const itemAttrs = (await item.getAttributes())?.object;
          const itemAttrs = await item.getData(collector);
          if (!itemAttrs) continue;
          keyItems.push(itemAttrs);
        }
        // if (key === "HasProperties") console.log(keyItems);
      }
    }
    const data = { ...attrs, ...relAttrs };
    return data;
  }
}
