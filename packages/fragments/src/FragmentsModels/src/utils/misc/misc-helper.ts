type ForEachCallback<T> = (item: T, index: number) => void;

export class MiscHelper {
  static fixNumber(value: number) {
    if (Number.isNaN(value)) {
      return 0;
    }
    if (!Number.isFinite(value)) {
      return 0;
    }
    return value;
  }

  static forEach<T>(items: T[] | T, callback: ForEachCallback<T>) {
    if (Array.isArray(items)) {
      let counter = 0;
      for (const item of items) {
        callback(item, counter++);
      }
      return;
    }
    callback(items, 0);
  }
}
