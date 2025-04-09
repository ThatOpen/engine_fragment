import { Event } from "./event";

export class DataSet<T> extends Set<T> {
  readonly onItemAdded = new Event<T>();

  readonly onBeforeDelete = new Event<T>();

  readonly onItemDeleted = new Event();

  readonly onCleared = new Event();

  constructor(iterable?: Iterable<T> | null) {
    super(iterable);
  }

  clear() {
    for (const item of this) {
      this.onBeforeDelete.trigger(item);
    }
    super.clear();
    this.onCleared.trigger();
  }

  add(...value: T[]) {
    for (const item of value) {
      const existing = this.has(item);
      if (existing) continue;
      const isValid = this.guard(item);
      if (!isValid) continue;
      super.add(item);
      if (!this.onItemAdded) (this.onItemAdded as any) = new Event<T>();
      this.onItemAdded.trigger(item);
    }
    return this;
  }

  guard: (value: T) => boolean = () => true;

  delete(value: T) {
    const exist = this.has(value);
    if (!exist) return false;
    this.onBeforeDelete.trigger(value);
    const deleted = super.delete(value);
    if (deleted) this.onItemDeleted.trigger();
    return deleted;
  }

  dispose() {
    this.clear();
    this.onItemAdded.reset();
    this.onItemDeleted.reset();
    this.onCleared.reset();
    this.onBeforeDelete.reset();
  }
}
