import { Model, ModelIndex } from "../../../../Schema";

/**
 * The four shapes a {@link ModelIndex} can take. Detected once per index
 * from the populated vectors and cached.
 *
 * - `keysOnly`: only keys are stored. The index acts as a sorted set.
 * - `oneToOne`: each key maps to exactly one value (`values[i]` for `keys[i]`).
 * - `oneToNLinear`: each key maps to a contiguous slice of values, sliced
 *   by `end`. The slice for `keys[i]` is `values[end[i-1] ?? 0 .. end[i]]`.
 * - `oneToNNonLinear`: each key maps to an arbitrary slice of values,
 *   sliced by `start[i] .. end[i]`. Used when slices need to overlap or
 *   reorder, e.g. flattened descendant trees.
 */
export type IndexMode =
  | "keysOnly"
  | "oneToOne"
  | "oneToNLinear"
  | "oneToNNonLinear";

export type IndexKeyType = "string" | "number";
export type IndexValueType = "string" | "number" | "none";

/**
 * Snapshot of an index's shape, returned alongside reads so callers can
 * branch on storage mode without re-inspecting the underlying buffer.
 */
export interface IndexInfo {
  name: string;
  mode: IndexMode;
  keyType: IndexKeyType;
  valueType: IndexValueType;
  size: number;
}

/**
 * Forward-lookup result for a single key. Shape depends on the index mode:
 *
 * - `keysOnly`: always `null` (no value to return). Use {@link VirtualIndexesController.has}
 *   to test membership.
 * - `oneToOne`: a single string or number.
 * - `oneToN*`: a `Uint32Array` view (number values) or `string[]` (string values),
 *   covering the slice that belongs to the key.
 *
 * The `Uint32Array` is a zero-copy view over the FlatBuffer; do not mutate it.
 */
export type IndexEntry = string | number | Uint32Array | string[] | null;

/**
 * Inverse-lookup result. For an index whose forward direction is `key -> value`,
 * the inverse maps `value -> set of keys`. Keys are returned as a `Uint32Array`
 * when the index uses number keys, or `string[]` when it uses string keys.
 *
 * Inverse maps are built lazily on first call and cached for the lifetime of
 * the controller. Edits that mutate an index invalidate the cache for that
 * index only.
 */
export type InverseIndexEntry = Uint32Array | string[] | null;

interface IndexCacheEntry {
  fb: ModelIndex;
  info: IndexInfo;
  /** Lazily built `Map<key, position-in-keys-vector>` for O(1) forward lookups. */
  keyPositions: Map<string | number, number> | null;
  /** Lazily built inverse map. Key type matches whatever the values are. */
  inverse: Map<string | number, number[] | string[]> | null;
}

/**
 * Read-side controller for user-defined indexes stored in a {@link Model}.
 *
 * Indexes are an open primitive: the model carries a vector of named
 * {@link ModelIndex} tables, and this controller exposes them through a
 * uniform key/value API regardless of the underlying storage mode.
 *
 * All operations are O(1) after a one-time O(N) build of the per-index
 * lookup map. Reads return zero-copy views where possible.
 */
export class VirtualIndexesController {
  private readonly _model: Model;
  private readonly _byName = new Map<string, IndexCacheEntry>();
  private _names: string[] | null = null;

  constructor(model: Model) {
    this._model = model;
  }

  /**
   * Return the names of every index stored in the model, in declaration order.
   * The result is cached.
   */
  getNames(): string[] {
    if (this._names) return this._names;
    const names: string[] = [];
    const length = this._model.indexesLength();
    for (let i = 0; i < length; i++) {
      const idx = this._model.indexes(i);
      if (!idx) continue;
      const name = idx.name();
      if (!name) continue;
      names.push(name);
    }
    this._names = names;
    return names;
  }

  /**
   * Describe the shape of a named index without performing any lookups.
   * Returns `null` if no index with that name exists.
   */
  getInfo(name: string): IndexInfo | null {
    const entry = this.resolve(name);
    return entry ? entry.info : null;
  }

  /**
   * Return the keys of an index. Used for keys-only indexes (membership
   * tests, iteration) but valid for any mode. Numbers come back as a
   * zero-copy `Uint32Array`, strings as a fresh `string[]`.
   */
  getKeys(name: string): Uint32Array | string[] | null {
    const entry = this.resolve(name);
    if (!entry) return null;
    return entry.info.keyType === "number"
      ? this.materializeNumberKeys(entry)
      : this.materializeStringKeys(entry);
  }

  /**
   * Test whether a key exists in the named index without resolving its value.
   */
  has(name: string, key: string | number): boolean {
    const entry = this.resolve(name);
    if (!entry) return false;
    if (typeof key !== entry.info.keyType) return false;
    return this.keyMap(entry).has(key);
  }

  /**
   * Forward lookup for a single key.
   *
   * The return type depends on the index mode (see {@link IndexEntry}):
   * `null` for keys-only, the scalar value for 1:1, or a slice for 1:N.
   * Returns `null` if the index or key is missing, or the key type doesn't
   * match the index's declared key type.
   */
  getEntry(name: string, key: string | number): IndexEntry {
    const entry = this.resolve(name);
    if (!entry) return null;
    if (typeof key !== entry.info.keyType) return null;
    const position = this.keyMap(entry).get(key);
    if (position === undefined) return null;

    const { mode, valueType } = entry.info;
    if (mode === "keysOnly" || valueType === "none") return null;

    if (mode === "oneToOne") {
      return this.readScalarValue(entry, position);
    }

    const [start, end] = this.sliceBounds(entry, position);
    if (end <= start) {
      return valueType === "number" ? new Uint32Array(0) : [];
    }
    return valueType === "number"
      ? this.readNumberSlice(entry, start, end)
      : this.readStringSlice(entry, start, end);
  }

  /**
   * Inverse lookup. For a value, return every key that maps to it.
   *
   * Builds and caches the inverse map on first call. Subsequent calls are
   * O(1). Returns `null` if the index doesn't exist, has no values
   * (keys-only mode), or the value type doesn't match.
   */
  getInverseEntry(name: string, value: string | number): InverseIndexEntry {
    const entry = this.resolve(name);
    if (!entry) return null;
    if (entry.info.valueType === "none") return null;
    if (typeof value !== entry.info.valueType) return null;
    const inverse = this.inverseMap(entry);
    const keys = inverse.get(value);
    if (!keys) return null;
    return entry.info.keyType === "number"
      ? Uint32Array.from(keys as number[])
      : (keys as string[]).slice();
  }

  /**
   * Discard lazy caches. Call after edits that mutate index data so
   * subsequent reads see the new state. Currently a no-op placeholder
   * for the edit-request commit; included for API stability.
   */
  invalidate(name?: string): void {
    if (name === undefined) {
      this._byName.clear();
      this._names = null;
      return;
    }
    this._byName.delete(name);
    if (this._names) {
      const i = this._names.indexOf(name);
      if (i !== -1) this._names.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private resolve(name: string): IndexCacheEntry | null {
    const cached = this._byName.get(name);
    if (cached) return cached;

    const length = this._model.indexesLength();
    for (let i = 0; i < length; i++) {
      const fb = this._model.indexes(i);
      if (!fb) continue;
      if (fb.name() !== name) continue;
      const entry: IndexCacheEntry = {
        fb,
        info: this.classify(name, fb),
        keyPositions: null,
        inverse: null,
      };
      this._byName.set(name, entry);
      return entry;
    }
    return null;
  }

  private classify(name: string, fb: ModelIndex): IndexInfo {
    const stringKeys = fb.stringKeysLength();
    const numberKeys = fb.numberKeysLength();
    const stringValues = fb.stringValuesLength();
    const numberValues = fb.numberValuesLength();
    const endLen = fb.endLength();
    const startLen = fb.startLength();

    const keyType: IndexKeyType = stringKeys > 0 ? "string" : "number";
    const size = keyType === "string" ? stringKeys : numberKeys;

    let valueType: IndexValueType = "none";
    if (stringValues > 0) valueType = "string";
    else if (numberValues > 0) valueType = "number";

    let mode: IndexMode = "keysOnly";
    if (valueType !== "none") {
      if (endLen === 0) mode = "oneToOne";
      else mode = startLen > 0 ? "oneToNNonLinear" : "oneToNLinear";
    }

    return { name, mode, keyType, valueType, size };
  }

  /** Lazily build the `key -> position in keys vector` map for forward lookup. */
  private keyMap(entry: IndexCacheEntry): Map<string | number, number> {
    if (entry.keyPositions) return entry.keyPositions;
    const map = new Map<string | number, number>();
    const { fb, info } = entry;
    if (info.keyType === "number") {
      for (let i = 0; i < info.size; i++) {
        const k = fb.numberKeys(i);
        if (k === null) continue;
        map.set(k, i);
      }
    } else {
      for (let i = 0; i < info.size; i++) {
        const k = fb.stringKeys(i);
        if (k === null) continue;
        map.set(k, i);
      }
    }
    entry.keyPositions = map;
    return map;
  }

  private sliceBounds(entry: IndexCacheEntry, position: number): [number, number] {
    const { fb, info } = entry;
    if (info.mode === "oneToNNonLinear") {
      const start = fb.start(position) ?? 0;
      const end = fb.end(position) ?? start;
      return [start, end];
    }
    // oneToNLinear: end[i] is exclusive end; start is end[i-1] or 0.
    const end = fb.end(position) ?? 0;
    const start = position > 0 ? fb.end(position - 1) ?? 0 : 0;
    return [start, end];
  }

  private readScalarValue(
    entry: IndexCacheEntry,
    position: number,
  ): string | number | null {
    const { fb, info } = entry;
    if (info.valueType === "number") {
      const v = fb.numberValues(position);
      return v === null ? null : v;
    }
    return fb.stringValues(position) ?? null;
  }

  private readNumberSlice(
    entry: IndexCacheEntry,
    start: number,
    end: number,
  ): Uint32Array {
    const all = entry.fb.numberValuesArray();
    if (!all) return new Uint32Array(0);
    return all.subarray(start, end);
  }

  private readStringSlice(
    entry: IndexCacheEntry,
    start: number,
    end: number,
  ): string[] {
    const out: string[] = new Array(end - start);
    const fb = entry.fb;
    for (let i = start; i < end; i++) {
      out[i - start] = fb.stringValues(i) ?? "";
    }
    return out;
  }

  private materializeNumberKeys(entry: IndexCacheEntry): Uint32Array {
    const all = entry.fb.numberKeysArray();
    if (!all) return new Uint32Array(0);
    // Subarray gives a zero-copy view; copy to detach from the model buffer
    // only if you intend to outlive the model. We return the view.
    return all;
  }

  private materializeStringKeys(entry: IndexCacheEntry): string[] {
    const out: string[] = new Array(entry.info.size);
    for (let i = 0; i < entry.info.size; i++) {
      out[i] = entry.fb.stringKeys(i) ?? "";
    }
    return out;
  }

  /** Lazily build the inverse map. */
  private inverseMap(entry: IndexCacheEntry): Map<string | number, number[] | string[]> {
    if (entry.inverse) return entry.inverse;
    const map = new Map<string | number, number[] | string[]>();
    const { info } = entry;

    const pushKey = (
      value: string | number,
      key: string | number,
    ): void => {
      const existing = map.get(value);
      if (existing) {
        (existing as Array<string | number>).push(key);
        return;
      }
      map.set(value, info.keyType === "number" ? ([key] as number[]) : ([key] as string[]));
    };

    for (let i = 0; i < info.size; i++) {
      const key =
        info.keyType === "number" ? entry.fb.numberKeys(i) : entry.fb.stringKeys(i);
      if (key === null) continue;

      if (info.mode === "oneToOne") {
        const v = this.readScalarValue(entry, i);
        if (v !== null) pushKey(v, key);
        continue;
      }
      if (info.mode === "oneToNLinear" || info.mode === "oneToNNonLinear") {
        const [start, end] = this.sliceBounds(entry, i);
        for (let j = start; j < end; j++) {
          const v =
            info.valueType === "number"
              ? entry.fb.numberValues(j)
              : entry.fb.stringValues(j);
          if (v !== null && v !== undefined) pushKey(v, key);
        }
      }
    }

    entry.inverse = map;
    return map;
  }
}
