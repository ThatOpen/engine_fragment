import { MathUtils } from "three";
import { Event } from "./event";

// TODO: Implement bulk operations (set, update, delete) with the corresponding events

export class DataMap<K, V> extends Map<K, V> {
  readonly onBeforeSet = new Event<{ key: K; value: V }>();
  readonly onItemSet = new Event<{ key: K; value: V }>();

  readonly onItemUpdated = new Event<{ key: K; value: V }>();

  readonly onBeforeDelete = new Event<{ key: K; value: V }>();
  readonly onItemDeleted = new Event<K>();

  readonly onCleared = new Event();

  set eventsEnabled(value: boolean) {
    this.onItemSet.enabled = value;
    this.onItemUpdated.enabled = value;
    this.onItemDeleted.enabled = value;
    this.onBeforeDelete.enabled = value;
    this.onCleared.enabled = value;
  }

  constructor(iterable?: Iterable<readonly [K, V]> | null | undefined) {
    super(iterable);
  }

  clear() {
    for (const [key, value] of this) {
      this.onBeforeDelete.trigger({ key, value });
    }
    super.clear();
    this.onCleared.trigger();
  }

  set(key: K, value: V) {
    const triggerUpdate = this.has(key);
    const guard = this.guard ?? (() => true);
    const isValid = guard(key, value);
    if (!isValid) return this;
    if (!triggerUpdate) {
      // First time the item is in the Map
      this.onBeforeSet.trigger({ key, value });
    }
    const result = super.set(key, value);
    if (triggerUpdate) {
      if (!this.onItemUpdated) {
        (this.onItemUpdated as any) = new Event<{ key: K; value: V }>();
      }
      this.onItemUpdated.trigger({ key, value });
    } else {
      if (!this.onItemSet) {
        (this.onItemSet as any) = new Event<{ key: K; value: V }>();
      }
      this.onItemSet.trigger({ key, value });
    }
    return result;
  }

  guard: (key: K, value: V) => boolean = () => true;
  deleteGuard: (key: K, value: V) => boolean = () => true;
  updateGuard: (key: K, value: V) => boolean = () => true;

  delete(key: K) {
    const value = this.get(key);
    if (!value) return false;
    if (!this.deleteGuard(key, value)) return false;
    this.onBeforeDelete.trigger({ key, value });
    const deleted = super.delete(key);
    if (deleted) this.onItemDeleted.trigger(key);
    return deleted;
  }

  getKey(item: V) {
    for (const [key, value] of this) {
      if (value === item) return key;
    }
    return undefined;
  }

  /**
   * Sets the value in the map with a randomly generated uuidv4 key.
   * Only use this if your keys are strings
   *
   * @param value - The value of the item to set.
   * @returns The key used.
   */
  add(value: V) {
    const key = MathUtils.generateUUID().toLowerCase() as K;
    this.set(key, value);
    return key;
  }

  /**
   * Updates an item in the data map, triggering the corresponding event.
   *
   * @param item - The item to update.
   */
  update(item: V) {
    const key = this.getKey(item);
    if (key && this.updateGuard(key, item)) {
      this.set(key, item)
    };
  }

  /**
   * Deletes elements from the DataMap based on a provided predicate function.
   *
   * @param predicate A function that takes a value and its key as arguments and returns a boolean.
   *                  If the function returns true, the element is deleted.
   */
  deleteIf(predicate: (value: V, key: K) => boolean) {
    for (const [key, value] of this) {
      if (predicate(value, key)) {
        this.delete(key);
      }
    }
  }

  /**
   * Replaces a key in the DataMap with a new key, transferring the associated value.
   *
   * @param oldKey - The key to be replaced.
   * @param newKey - The new key that will replace the old key.
   * @param fullReplace - If true, allows replacing an existing key with the new key. If false, the replacement will not occur if the new key already exists in the map. Defaults to false.
   * @returns True if the key was successfully replaced, false otherwise.
   */
  replaceKey(oldKey: K, newKey: K, fullReplace = false) {
    const oldKeyItem = this.get(oldKey);
    if (!oldKeyItem) return false;
    const newKeyItem = this.get(newKey);
    if (newKeyItem && !fullReplace) return false;
    this.eventsEnabled = false;
    this.delete(oldKey);
    this.eventsEnabled = true;
    this.set(newKey, oldKeyItem);
    return true;
  }

  dispose() {
    this.clear();
    this.onItemSet.reset();
    this.onItemDeleted.reset();
    this.onItemUpdated.reset();
    this.onCleared.reset();
    this.onBeforeDelete.reset();
  }
}
