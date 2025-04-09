import { AttrsChange, AttributeData } from "./model-types";

/**
 * Represents a collection of attributes for an item in a Fragments model.
 * This class extends the Map class to provide additional functionality for managing attributes.
 */
export class ItemAttributes extends Map<string, AttributeData> {
  /**
   * A map of local IDs to their corresponding attribute changes.
   * This is used to track changes to the attributes over time.
   */
  tracker: Map<number, AttrsChange> | null = null;

  /**
   * The local ID of the item.
   */
  localId: number;

  /**
   * Gets the attributes as a plain javascript object.
   */
  get object() {
    const attr: Record<string, any> = {};
    for (const [key, data] of this.entries()) {
      attr[key] = data.value;
    }
    return attr;
  }

  /**
   * Creates a new ItemAttributes instance.
   * @param localId - The local ID of the item.
   * @param iterable - An optional iterable of key-value pairs to initialize the map with.
   */
  constructor(
    localId: number,
    iterable?: Iterable<readonly [string, AttributeData]> | null | undefined,
  ) {
    super(iterable);
    this.localId = localId;
  }

  /**
   * A function that acts as a guard for adding items to the set.
   * It determines whether a given value should be allowed to be added to the set.
   *
   * @param key - The key of the entry to be checked against the guard.
   * @param value - The value of the entry to be checked against the guard.
   * @returns A boolean indicating whether the value should be allowed to be added to the set.
   *          By default, this function always returns true, allowing all values to be added.
   *          You can override this behavior by providing a custom implementation.
   */
  guard: (key: string, value: AttributeData) => boolean = () => true;

  /**
   * Sets an attribute in the map.
   * @param key - The key of the attribute to set.
   * @param attr - The attribute data to set.
   * @returns The updated map.
   */
  set(key: string, attr: AttributeData) {
    const guard = this.guard ?? (() => true);
    const isValid = guard(key, attr);
    if (!isValid) return this;

    const value =
      attr.type !== undefined
        ? attr
        : { value: attr.value, type: this.getType(key) };

    if (!this.tracker) return super.set(key, value);

    if (this.localId === null) {
      console.warn(
        "Item attributes are missing a valid localId. Changes can't be tracked.",
      );
      return super.set(key, value);
    }

    let itemChanges = this.tracker.get(this.localId);
    if (!itemChanges) {
      itemChanges = { type: "modified", added: {}, deleted: [], modified: {} };
      this.tracker.set(this.localId, itemChanges);
    }

    if (itemChanges.type === "added") {
      itemChanges.data[key] = value;
    } else if (itemChanges.type === "modified") {
      if (this.has(key)) {
        itemChanges.modified[key] = value;
      } else if (itemChanges.deleted.includes(key)) {
        itemChanges.deleted = itemChanges.deleted.filter((k) => k !== key);
        itemChanges.modified[key] = value;
      } else {
        itemChanges.added[key] = value;
      }
    }

    return super.set(key, value);
  }

  /**
   * Sets the value of an attribute in the map.
   * @param key - The key of the attribute to set.
   * @param value - The value of the attribute to set.
   * @returns The updated map.
   */
  setValue(key: string, value: any) {
    return this.set(key, { value, type: this.getType(key) });
  }

  /**
   * Sets the type of an attribute in the map.
   * @param key - The key of the attribute to set.
   * @param type - The type of the attribute to set.
   * @returns The updated map.
   */
  setType(key: string, type: number) {
    const value = this.getValue(key);
    if (!value) return this;
    return this.set(key, { value, type });
  }

  /**
   * Deletes an attribute from the map.
   * @param key - The key of the attribute to delete.
   * @returns The updated map.
   */
  delete(key: string) {
    if (!this.tracker) return super.delete(key);

    const localId = this.get("localId");
    if (localId === undefined || typeof localId !== "number") {
      console.warn(
        "Item attributes are missing a valid localId. Changes can't be tracked.",
      );
      if (key === "localId") return false;
      return super.delete(key);
    }

    if (key === "localId") return false;
    if (!this.has(key)) return false;

    let itemChanges = this.tracker.get(localId);
    if (!itemChanges) {
      itemChanges = { type: "modified", added: {}, deleted: [], modified: {} };
      this.tracker.set(localId, itemChanges);
    }

    if (itemChanges.type === "added") {
      delete itemChanges.data[key];
    } else if (itemChanges.type === "modified") {
      if (key in itemChanges.added) {
        delete itemChanges.added[key];
      } else if (key in itemChanges.modified) {
        delete itemChanges.modified[key];
        itemChanges.deleted.push(key);
      } else {
        itemChanges.deleted.push(key);
      }
    }

    return super.delete(key);
  }

  /**
   * Gets the value of an attribute from the map.
   * @param key - The key of the attribute to get.
   */
  getValue(key: string) {
    const data = this.get(key);
    if (!data) return null;
    return data.value;
  }

  /**
   * Gets the type of an attribute from the map.
   * @param key - The key of the attribute to get.
   */
  getType(key: string) {
    return this.get(key)?.type;
  }

  // async getRelationAttribute(relation: string, attribute: string) {
  //   return (await this.relations.getItems(relation))?.map((item) =>
  //     item.getValue(attribute),
  //   );
  // }
}
