import { Event } from "./event";

export class DataMap<K, V> extends Map<K, V> {
  readonly onItemSet = new Event<{ key: K; value: V }>();

  readonly onItemUpdated = new Event<{ key: K; value: V }>();

  readonly onItemDeleted = new Event<K>();

  readonly onBeforeDelete = new Event<{ key: K; value: V }>();

  readonly onCleared = new Event();

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

  delete(key: K) {
    const value = this.get(key);
    if (!value) return false;
    this.onBeforeDelete.trigger({ key, value });
    const deleted = super.delete(key);
    if (deleted) this.onItemDeleted.trigger(key);
    return deleted;
  }

  dispose() {
    this.clear();
    this.onItemSet.reset();
    this.onItemDeleted.reset();
    this.onCleared.reset();
    this.onBeforeDelete.reset();
  }
}
