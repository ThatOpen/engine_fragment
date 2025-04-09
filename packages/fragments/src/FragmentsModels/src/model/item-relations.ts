import { Item } from "./item";
import { RelsChange } from "./model-types";

/**
 * A class that extends Map to store and manage relations between items in a Fragments model.
 * Each relation is stored as a key-value pair where the key is a string identifier and
 * the value is a Set of item IDs that are related through that relation.
 */
export class ItemRelations extends Map<string, Set<number>> {
  /**
   * A map that tracks the changes to the relations of the item.
   */
  tracker: Map<number, RelsChange> | null = null;
  /**
   * The local ID of the item.
   */
  localId: number;

  private get itemChanges() {
    if (!this.tracker) return null;

    if (!this.localId) {
      console.warn("Item relations can't be tracked.");
      return null;
    }

    let itemChanges = this.tracker.get(this.localId);
    if (!itemChanges) {
      itemChanges = {
        type: "modified",
        added: {},
        deleted: new Set(),
        removed: {},
        modified: {},
      };
      this.tracker.set(this.localId, itemChanges);
    }

    return itemChanges;
  }

  /**
   * Creates a new ItemRelations instance.
   * @param localId - The local ID of the item.
   * @param iterable - An optional iterable of key-value pairs to initialize the map with.
   */
  constructor(
    localId: number,
    iterable?: Iterable<readonly [string, Set<number>]> | null | undefined,
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
  guard: (key: string, value: Set<number>) => boolean = () => true;

  /**
   * Sets a new relation in the map.
   * @param key - The key of the relation.
   * @param value - The value of the relation.
   * @returns The ItemRelations instance.
   */
  set(key: string, value: Set<number>) {
    const keyExisted = this.has(key);

    const guard = this.guard ?? (() => true);
    const isValid = guard(key, value);
    if (!isValid) return this;

    const itemChanges = this.itemChanges;
    if (!itemChanges) return super.set(key, value);

    if (keyExisted) {
      itemChanges.modified[key] = value;
    } else {
      itemChanges.added[key] = value;
    }

    return super.set(key, value);
  }

  /**
   * Adds a new item to a target relation.
   * @param key - The key of the relation.
   * @param item - The item to add to the relation.
   */
  add(key: string, item: number) {
    const keyExisted = this.has(key);

    let items = this.get(key);
    if (!items) {
      items = new Set([item]);
      this.set(key, items);
      return true;
    }

    if (!items || items.has(item)) return false;

    const itemChanges = this.itemChanges;
    if (!itemChanges) {
      items.add(item);
      return true;
    }

    if (keyExisted) {
      if (itemChanges.removed[key]?.has(item)) {
        itemChanges.removed[key].delete(item);
        if (itemChanges.removed[key].size === 0)
          delete itemChanges.removed[key];
      } else {
        let modificationChanges = itemChanges.modified[key];
        if (!modificationChanges) {
          modificationChanges = new Set();
          itemChanges.modified[key] = modificationChanges;
        }
        modificationChanges.add(item);
      }
    } else {
      let addedChanges = itemChanges.added[key];
      if (!addedChanges) {
        addedChanges = new Set();
        itemChanges.added[key] = addedChanges;
      }
      addedChanges.add(item);
    }

    items.add(item);
    return true;
  }

  /**
   * Removes an item from a target relation.
   * @param key - The key of the relation.
   * @param item - The item to remove from the relation.
   * @returns A boolean indicating whether the item was removed from the relation.
   */
  remove(key: string, item: number) {
    const items = this.get(key);
    if (!items) return false;

    if (!items.has(item)) return false;

    const itemChanges = this.itemChanges;
    if (!itemChanges) return items.delete(item);

    if (itemChanges.modified[key]?.has(item)) {
      itemChanges.modified[key].delete(item);
      if (itemChanges.modified[key].size === 0)
        delete itemChanges.modified[key];
    } else {
      let removeChanges = itemChanges.removed[key];
      if (!removeChanges) {
        removeChanges = new Set();
        itemChanges.removed[key] = removeChanges;
      }
      removeChanges.add(item);
    }

    return items.delete(item);
  }

  /**
   * Deletes a relation from the map.
   * @param key - The key of the relation to delete.
   */
  delete(key: string) {
    if (!this.has(key)) return false;
    const itemChanges = this.itemChanges;
    if (!itemChanges) return super.delete(key);
    itemChanges.deleted.add(key);
    return super.delete(key);
  }

  /**
   * An event handler that is called when items are requested.
   */
  onItemsRequested:
    | ((ids: number[], includeRelations?: boolean) => Promise<Item[]>)
    | null = null;

  /**
   * Gets the items of a relation.
   * @param key - The key of the relation.
   */
  async getItems(key: string) {
    if (!this.onItemsRequested) return null;
    const relations = this.get(key);
    if (!relations) return null;
    const items = await this.onItemsRequested([...relations]);
    return items;
  }
}
