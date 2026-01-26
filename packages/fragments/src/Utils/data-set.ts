import { Event } from "./event";

// TODO: Implement bulk operations (set, update, delete) with the corresponding events

export class DataSet<T> extends Set<T> {
  readonly onUpdated = new Event<undefined>();

  readonly onItemAdded = new Event<T>();

  readonly onBeforeDelete = new Event<T>();

  readonly onItemDeleted = new Event();

  readonly onCleared = new Event();

  set eventsEnabled(value: boolean) {
    this.onUpdated.enabled = value;
    this.onItemAdded.enabled = value;
    this.onItemDeleted.enabled = value;
    this.onBeforeDelete.enabled = value;
    this.onCleared.enabled = value;
  }

  constructor(iterable?: Iterable<T> | null) {
    super(iterable);
  }

  clear() {
    for (const item of this) {
      this.onBeforeDelete.trigger(item);
    }
    super.clear();
    this.onCleared.trigger();
    this.onUpdated.trigger();
  }

  add(...value: T[]) {
    for (const item of value) {
      const existing = this.has(item);
      if (existing) continue;
      const guard = this.guard ?? (() => true);
      const isValid = guard(item);
      if (!isValid) continue;
      super.add(item);
      if (!this.onItemAdded) (this.onItemAdded as any) = new Event<T>();
      this.onItemAdded.trigger(item);
    }
    if (!this.onUpdated) (this.onUpdated as any) = new Event<undefined>();
    this.onUpdated.trigger();
    return this;
  }

  guard: (value: T) => boolean = () => true;
  deleteGuard: (value: T) => boolean = () => true;

  delete(value: T) {
    const exist = this.has(value);
    if (!exist) return false;
    if (!this.deleteGuard(value)) return false;
    this.onBeforeDelete.trigger(value);
    const deleted = super.delete(value);
    if (deleted) {
      this.onItemDeleted.trigger();
      this.onUpdated.trigger();
    }
    return deleted;
  }

  deleteIf(predicate: (value: T) => boolean) {
    for (const v of this) {
      if (predicate(v)) {
        this.delete(v);
      }
    }
  }

  getIndex(item: T) {
    let index = 0;
    for (const value of this) {
      if (value === item) return index;
      index++;
    }
    return -1;
  }

  dispose() {
    this.clear();
    this.onItemAdded.reset();
    this.onItemDeleted.reset();
    this.onCleared.reset();
    this.onBeforeDelete.reset();
    this.onUpdated.reset();
  }
}
