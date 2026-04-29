import { ModelIndex } from "../../../../Schema";
import {
  IndexEntry,
  IndexInfo,
  IndexKeyType,
  IndexMode,
  IndexValueType,
  InverseIndexEntry,
} from "../../model/model-types";
import { EditRequestType, RawIndexData } from "../../../../Utils";
import type { VirtualFragmentsModel } from "../virtual-fragments-model";

/**
 * Tombstone for indexes deleted by a pending DELETE_INDEX request. A name
 * mapped to this in the overlay means "the index is removed; don't fall
 * through to the stored vector".
 */
const DELETED = Symbol("deleted index");

/**
 * Where the data for an index lives.
 *
 * - `fb`: read directly from the FlatBuffer-backed `ModelIndex`. Values
 *   come back as zero-copy `Uint32Array` views.
 * - `raw`: an in-memory `RawIndexData` from a pending edit request. Numbers
 *   are returned as fresh `Uint32Array` instances built from the raw arrays.
 */
type IndexSource =
  | { kind: "fb"; fb: ModelIndex }
  | { kind: "raw"; data: RawIndexData; numberKeysArray: Uint32Array | null; numberValuesArray: Uint32Array | null };

interface IndexCacheEntry {
  source: IndexSource;
  info: IndexInfo;
  /** Lazily built `Map<key, position-in-keys-vector>` for O(1) forward lookups. */
  keyPositions: Map<string | number, number> | null;
  /** Lazily built inverse map. Key type matches whatever the values are. */
  inverse: Map<string | number, number[] | string[]> | null;
}

/**
 * Read-side controller for user-defined indexes on a {@link VirtualFragmentsModel}.
 *
 * Indexes are an open primitive: the model carries a vector of named
 * `ModelIndex` tables in the FlatBuffer, and pending CREATE/UPDATE/DELETE_INDEX
 * edit requests can shadow or hide them. This controller resolves both
 * sources through a uniform key/value API regardless of where the data
 * actually lives.
 *
 * Forward lookups are O(1) after a one-time O(N) build of a per-index key
 * map. Inverse lookups are O(N) on first call (one full pass over keys and
 * values) and O(1) afterwards.
 *
 * Stored indexes are cached for the model's lifetime. Pending indexes are
 * cached per "request batch" (invalidated when `requests.length` changes,
 * which covers push, undo, redo, and `selectRequest`).
 */
export class VirtualIndexesController {
  private readonly _vm: VirtualFragmentsModel;
  private readonly _storedByName = new Map<string, IndexCacheEntry>();
  private _storedNames: string[] | null = null;

  /** Overlay built from pending CREATE/UPDATE/DELETE_INDEX requests. */
  private _overlay: Map<string, IndexCacheEntry | typeof DELETED> | null = null;
  /** Length of the request list when the overlay was built; rebuild on mismatch. */
  private _overlayRequestsLen = -1;

  constructor(vm: VirtualFragmentsModel) {
    this._vm = vm;
  }

  /**
   * Names of every index visible to the model right now: stored names
   * minus those deleted by pending requests, plus names introduced by
   * pending CREATE_INDEX requests.
   */
  getNames(): string[] {
    const overlay = this.overlay();
    const stored = this.storedNames();
    const out: string[] = [];
    const seen = new Set<string>();
    for (const name of stored) {
      const o = overlay.get(name);
      if (o === DELETED) continue;
      out.push(name);
      seen.add(name);
    }
    for (const [name, entry] of overlay) {
      if (entry === DELETED) continue;
      if (seen.has(name)) continue;
      out.push(name);
    }
    return out;
  }

  /**
   * Describe the shape of a named index without performing any lookups.
   * Returns `null` if no index with that name exists or it has been deleted.
   */
  getInfo(name: string): IndexInfo | null {
    const entry = this.resolve(name);
    return entry ? entry.info : null;
  }

  /**
   * Return the keys of an index. Useful for keys-only indexes (membership
   * tests, iteration) but valid for any mode. Number keys come back as a
   * `Uint32Array`, string keys as a fresh `string[]`.
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
   * Forward lookup for a single key. The return shape depends on the index
   * mode (see {@link IndexEntry}). Returns `null` if the index or key is
   * missing, or the key type doesn't match.
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
   * Inverse lookup. For a value, return every key that maps to it. Builds
   * and caches the inverse map on first call.
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
   * Discard cached resolved data. Stored entries are dropped; the pending
   * overlay is rebuilt on the next read. Useful if model data is mutated
   * out-of-band (which the public API doesn't do today).
   */
  invalidate(name?: string): void {
    if (name === undefined) {
      this._storedByName.clear();
      this._storedNames = null;
      this._overlay = null;
      this._overlayRequestsLen = -1;
      return;
    }
    this._storedByName.delete(name);
    if (this._storedNames) {
      const i = this._storedNames.indexOf(name);
      if (i !== -1) this._storedNames.splice(i, 1);
    }
    if (this._overlay) this._overlay.delete(name);
  }

  // ---------------------------------------------------------------------------
  // Resolution
  // ---------------------------------------------------------------------------

  private resolve(name: string): IndexCacheEntry | null {
    const overlay = this.overlay();
    const pending = overlay.get(name);
    if (pending === DELETED) return null;
    if (pending !== undefined) return pending;
    return this.resolveStored(name);
  }

  private resolveStored(name: string): IndexCacheEntry | null {
    const cached = this._storedByName.get(name);
    if (cached) return cached;

    const length = this._vm.data.indexesLength();
    for (let i = 0; i < length; i++) {
      const fb = this._vm.data.indexes(i);
      if (!fb) continue;
      if (fb.name() !== name) continue;
      const entry = this.entryFromFb(fb, name);
      this._storedByName.set(name, entry);
      return entry;
    }
    return null;
  }

  private storedNames(): string[] {
    if (this._storedNames) return this._storedNames;
    const names: string[] = [];
    const length = this._vm.data.indexesLength();
    for (let i = 0; i < length; i++) {
      const idx = this._vm.data.indexes(i);
      if (!idx) continue;
      const name = idx.name();
      if (!name) continue;
      names.push(name);
    }
    this._storedNames = names;
    return names;
  }

  private overlay(): Map<string, IndexCacheEntry | typeof DELETED> {
    const requests = this._vm.requests;
    if (
      this._overlay !== null &&
      this._overlayRequestsLen === requests.length
    ) {
      return this._overlay;
    }
    const map = new Map<string, IndexCacheEntry | typeof DELETED>();
    for (const r of requests) {
      if (
        r.type === EditRequestType.CREATE_INDEX ||
        r.type === EditRequestType.UPDATE_INDEX
      ) {
        map.set(r.data.name, this.entryFromRaw(r.data));
      } else if (r.type === EditRequestType.DELETE_INDEX) {
        map.set(r.name, DELETED);
      }
    }
    this._overlay = map;
    this._overlayRequestsLen = requests.length;
    return map;
  }

  // ---------------------------------------------------------------------------
  // Entry construction
  // ---------------------------------------------------------------------------

  private entryFromFb(fb: ModelIndex, name: string): IndexCacheEntry {
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

    return {
      source: { kind: "fb", fb },
      info: { name, mode, keyType, valueType, size },
      keyPositions: null,
      inverse: null,
    };
  }

  private entryFromRaw(data: RawIndexData): IndexCacheEntry {
    const keyType: IndexKeyType =
      typeof data.keys[0] === "string" ? "string" : "number";
    const size = data.keys.length;

    let valueType: IndexValueType = "none";
    if (data.values && data.values.length > 0) {
      valueType = typeof data.values[0] === "string" ? "string" : "number";
    }

    let mode: IndexMode = "keysOnly";
    if (valueType !== "none") {
      const endLen = data.end?.length ?? 0;
      const startLen = data.start?.length ?? 0;
      if (endLen === 0) mode = "oneToOne";
      else mode = startLen > 0 ? "oneToNNonLinear" : "oneToNLinear";
    }

    const numberKeysArray =
      keyType === "number"
        ? Uint32Array.from(data.keys as number[])
        : null;
    const numberValuesArray =
      valueType === "number" && data.values
        ? Uint32Array.from(data.values as number[])
        : null;

    return {
      source: {
        kind: "raw",
        data,
        numberKeysArray,
        numberValuesArray,
      },
      info: { name: data.name, mode, keyType, valueType, size },
      keyPositions: null,
      inverse: null,
    };
  }

  // ---------------------------------------------------------------------------
  // Source-polymorphic readers
  // ---------------------------------------------------------------------------

  private readNumberKey(src: IndexSource, i: number): number | null {
    return src.kind === "fb"
      ? src.fb.numberKeys(i)
      : (src.data.keys as number[])[i] ?? null;
  }

  private readStringKey(src: IndexSource, i: number): string | null {
    return src.kind === "fb"
      ? src.fb.stringKeys(i)
      : (src.data.keys as string[])[i] ?? null;
  }

  private readNumberValueAt(src: IndexSource, i: number): number | null {
    return src.kind === "fb"
      ? src.fb.numberValues(i)
      : (src.data.values as number[])[i] ?? null;
  }

  private readStringValueAt(src: IndexSource, i: number): string | null {
    return src.kind === "fb"
      ? src.fb.stringValues(i)
      : (src.data.values as string[])[i] ?? null;
  }

  private numberValuesArray(src: IndexSource): Uint32Array | null {
    return src.kind === "fb" ? src.fb.numberValuesArray() : src.numberValuesArray;
  }

  private endAt(src: IndexSource, i: number): number {
    return src.kind === "fb"
      ? src.fb.end(i) ?? 0
      : (src.data.end as number[])[i] ?? 0;
  }

  private startAt(src: IndexSource, i: number): number {
    return src.kind === "fb"
      ? src.fb.start(i) ?? 0
      : (src.data.start as number[])[i] ?? 0;
  }

  // ---------------------------------------------------------------------------
  // Lookup helpers
  // ---------------------------------------------------------------------------

  /** Lazily build the `key -> position in keys vector` map for forward lookup. */
  private keyMap(entry: IndexCacheEntry): Map<string | number, number> {
    if (entry.keyPositions) return entry.keyPositions;
    const map = new Map<string | number, number>();
    const { source, info } = entry;
    if (info.keyType === "number") {
      for (let i = 0; i < info.size; i++) {
        const k = this.readNumberKey(source, i);
        if (k === null) continue;
        map.set(k, i);
      }
    } else {
      for (let i = 0; i < info.size; i++) {
        const k = this.readStringKey(source, i);
        if (k === null) continue;
        map.set(k, i);
      }
    }
    entry.keyPositions = map;
    return map;
  }

  private sliceBounds(entry: IndexCacheEntry, position: number): [number, number] {
    const { source, info } = entry;
    if (info.mode === "oneToNNonLinear") {
      const start = this.startAt(source, position);
      const end = this.endAt(source, position);
      return [start, end];
    }
    // oneToNLinear: end[i] is exclusive end; start is end[i-1] or 0.
    const end = this.endAt(source, position);
    const start = position > 0 ? this.endAt(source, position - 1) : 0;
    return [start, end];
  }

  private readScalarValue(
    entry: IndexCacheEntry,
    position: number,
  ): string | number | null {
    const { source, info } = entry;
    if (info.valueType === "number") {
      return this.readNumberValueAt(source, position);
    }
    return this.readStringValueAt(source, position);
  }

  private readNumberSlice(
    entry: IndexCacheEntry,
    start: number,
    end: number,
  ): Uint32Array {
    const all = this.numberValuesArray(entry.source);
    if (!all) return new Uint32Array(0);
    return all.subarray(start, end);
  }

  private readStringSlice(
    entry: IndexCacheEntry,
    start: number,
    end: number,
  ): string[] {
    const out: string[] = new Array(end - start);
    for (let i = start; i < end; i++) {
      out[i - start] = this.readStringValueAt(entry.source, i) ?? "";
    }
    return out;
  }

  private materializeNumberKeys(entry: IndexCacheEntry): Uint32Array {
    if (entry.source.kind === "fb") {
      return entry.source.fb.numberKeysArray() ?? new Uint32Array(0);
    }
    return entry.source.numberKeysArray ?? new Uint32Array(0);
  }

  private materializeStringKeys(entry: IndexCacheEntry): string[] {
    const out: string[] = new Array(entry.info.size);
    for (let i = 0; i < entry.info.size; i++) {
      out[i] = this.readStringKey(entry.source, i) ?? "";
    }
    return out;
  }

  /** Lazily build the inverse map. */
  private inverseMap(
    entry: IndexCacheEntry,
  ): Map<string | number, number[] | string[]> {
    if (entry.inverse) return entry.inverse;
    const map = new Map<string | number, number[] | string[]>();
    const { source, info } = entry;

    const pushKey = (
      value: string | number,
      key: string | number,
    ): void => {
      const existing = map.get(value);
      if (existing) {
        (existing as Array<string | number>).push(key);
        return;
      }
      map.set(
        value,
        info.keyType === "number"
          ? ([key] as number[])
          : ([key] as string[]),
      );
    };

    for (let i = 0; i < info.size; i++) {
      const key =
        info.keyType === "number"
          ? this.readNumberKey(source, i)
          : this.readStringKey(source, i);
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
              ? this.readNumberValueAt(source, j)
              : this.readStringValueAt(source, j);
          if (v !== null && v !== undefined) pushKey(v, key);
        }
      }
    }

    entry.inverse = map;
    return map;
  }
}
