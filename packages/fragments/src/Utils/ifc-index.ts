/* eslint-disable max-classes-per-file */
// ---------------------------------------------------------------------------
// Compact statement index: express id -> where the statement lives in the file
// ---------------------------------------------------------------------------
// Laid out compactly, in file order, with a parallel `ids` array — rather than
// as arrays indexed by express id — so cost tracks the number of statements
// instead of the largest id. Source IFCs are dense (a sample model measured
// 96.9%), but the splitter's own outputs preserve original ids over a subset
// and come out at 15-25%, and those get re-split and re-extracted. Indexing by
// id would size every array for the gaps.
//
// Real writers emit ids in ascending order, so `ids` is normally already
// sorted and `finalize` has nothing to do; a file that breaks that gets sorted
// once, which keeps lookup a binary search either way.
//
// Building and querying are separate types: an index is only ever handed out
// sorted, deduplicated and trimmed, so there is no half-built state to guard
// against at every lookup.
// ---------------------------------------------------------------------------

/** Grow geometrically from a small floor rather than reserving for a guess. */
const initialCapacity = 4 * 1024;

// `types` interns names into a Uint16 code, so this is the ceiling on distinct
// entity types. IFC4 defines roughly 800.
const maxTypes = 0xffff;

/** The parts of a scanned statement an index records. */
export interface IndexedStatement {
  id: number;
  type: string;
  offset: number;
  length: number;
}

/**
 * The columns an {@link IfcLineIndex} is built from, aligned by position and
 * sorted by id.
 *
 * @internal Produced by {@link IfcLineIndexBuilder.finalize}.
 */
export interface IfcLineIndexColumns {
  ids: Uint32Array;
  offsets: Float64Array;
  lengths: Uint32Array;
  types: Uint16Array;
  typeNames: readonly string[];
  typeCodes: ReadonlyMap<string, number>;
}

/**
 * Where every entity statement of an IFC file begins and ends, keyed by
 * express id.
 *
 * Records byte offsets rather than text, so a statement can be re-read from
 * the source on demand instead of being held in memory. Immutable: build one
 * with {@link IfcLineIndexBuilder}.
 */
export class IfcLineIndex {
  private readonly _ids: Uint32Array;
  private readonly _offsets: Float64Array;
  private readonly _lengths: Uint32Array;
  private readonly _types: Uint16Array;
  private readonly _typeNames: readonly string[];
  private readonly _typeCodes: ReadonlyMap<string, number>;

  /**
   * @internal Built by {@link IfcLineIndexBuilder.finalize}, which is what
   * establishes that `ids` is sorted and free of duplicates.
   */
  constructor({
    ids,
    offsets,
    lengths,
    types,
    typeNames,
    typeCodes,
  }: IfcLineIndexColumns) {
    this._ids = ids;
    this._offsets = offsets;
    this._lengths = lengths;
    this._types = types;
    this._typeNames = typeNames;
    this._typeCodes = typeCodes;
  }

  /** Number of indexed statements. */
  get count(): number {
    return this._ids.length;
  }

  /** Largest express id in the file, or 0 when the index is empty. */
  get maxId(): number {
    const n = this._ids.length;
    return n === 0 ? 0 : this._ids[n - 1];
  }

  /** Position of `id` in the index, or -1 when no statement defines it. */
  indexOf(id: number): number {
    let low = 0;
    let high = this._ids.length - 1;
    while (low <= high) {
      // eslint-disable-next-line no-bitwise
      const mid = (low + high) >>> 1;
      const value = this._ids[mid];
      if (value === id) return mid;
      if (value < id) low = mid + 1;
      else high = mid - 1;
    }
    return -1;
  }

  has(id: number): boolean {
    return this.indexOf(id) !== -1;
  }

  // --- by position, for sweeps in id order ---------------------------------

  idAt(i: number): number {
    return this._ids[i];
  }

  offsetAt(i: number): number {
    return this._offsets[i];
  }

  lengthAt(i: number): number {
    return this._lengths[i];
  }

  typeAt(i: number): string {
    return this._typeNames[this._types[i]];
  }

  /**
   * Interned code for the type at `i`. Comparing codes avoids the string hash
   * a name comparison costs, which matters in the full-index sweeps.
   */
  typeCodeAt(i: number): number {
    return this._types[i];
  }

  /** Interned code for `type`, or 0 when the file contains no such type. */
  codeOf(type: string): number {
    return this._typeCodes.get(type) ?? 0;
  }

  // --- by id ----------------------------------------------------------------

  getType(id: number): string | undefined {
    const i = this.indexOf(id);
    return i === -1 ? undefined : this._typeNames[this._types[i]];
  }

  getOffset(id: number): number | undefined {
    const i = this.indexOf(id);
    return i === -1 ? undefined : this._offsets[i];
  }

  getLength(id: number): number | undefined {
    const i = this.indexOf(id);
    return i === -1 ? undefined : this._lengths[i];
  }

  /**
   * The bytes of `id`'s statement, taken from a source already held in memory.
   * Returns a view, not a copy.
   */
  slice(source: Uint8Array, id: number): Uint8Array | undefined {
    const i = this.indexOf(id);
    if (i === -1) return undefined;
    const offset = this._offsets[i];
    return source.subarray(offset, offset + this._lengths[i]);
  }

  /** Every id whose statement has one of `types`, ascending. */
  getAll(types: Set<string>): Set<number> {
    const codes = new Set<number>();
    for (const type of types) {
      const code = this._typeCodes.get(type);
      if (code !== undefined) codes.add(code);
    }
    const out = new Set<number>();
    if (codes.size === 0) return out;
    for (let i = 0; i < this._ids.length; i++) {
      if (codes.has(this._types[i])) out.add(this._ids[i]);
    }
    return out;
  }
}

/**
 * Accumulates statement positions as they are scanned, then hands over a
 * queryable {@link IfcLineIndex}.
 *
 * A {@link StatementRef} satisfies {@link IndexedStatement}, so scanner output
 * can be added directly.
 *
 * @example
 * ```ts
 * const builder = new IfcLineIndexBuilder();
 * for await (const statement of streamAsyncIterator(
 *   blob.stream().pipeThrough(new IfcStatementScanner()),
 * )) {
 *   if (statement.id) builder.add(statement);
 * }
 * const index = builder.finalize();
 * ```
 */
export class IfcLineIndexBuilder {
  private _ids = new Uint32Array(initialCapacity);
  private _offsets = new Float64Array(initialCapacity);
  private _lengths = new Uint32Array(initialCapacity);
  private _types = new Uint16Array(initialCapacity);

  // code 0 is the empty type, so a zeroed slot reads as "no type"
  private _typeNames: string[] = [""];
  private _typeCodes = new Map<string, number>([["", 0]]);

  private _count = 0;
  private _ascending = true;
  private _index: IfcLineIndex | null = null;

  /** Number of statements added so far. */
  get count(): number {
    return this._count;
  }

  /**
   * Record a statement. Ids need not arrive in order, but arrive-in-order is
   * the fast path: out-of-order input costs one sort in {@link finalize}.
   *
   * @throws once {@link finalize} has been called.
   */
  add({ id, type, offset, length }: IndexedStatement): void {
    if (this._index) {
      throw new Error("Cannot add to a finalized IfcLineIndexBuilder");
    }
    if (this._count === this._ids.length) this._grow();

    let code = this._typeCodes.get(type);
    if (code === undefined) {
      code = this._typeNames.length;
      if (code > maxTypes) {
        throw new Error(`Ifc file declares more than ${maxTypes} entity types`);
      }
      this._typeNames.push(type);
      this._typeCodes.set(type, code);
    }

    const i = this._count;
    if (i > 0 && id <= this._ids[i - 1]) this._ascending = false;
    this._ids[i] = id;
    this._offsets[i] = offset;
    this._lengths[i] = length;
    this._types[i] = code;
    this._count = i + 1;
  }

  private _grow(): void {
    const size = this._ids.length * 2;
    const ids = new Uint32Array(size);
    const offsets = new Float64Array(size);
    const lengths = new Uint32Array(size);
    const types = new Uint16Array(size);
    ids.set(this._ids);
    offsets.set(this._offsets);
    lengths.set(this._lengths);
    types.set(this._types);
    this._ids = ids;
    this._offsets = offsets;
    this._lengths = lengths;
    this._types = types;
  }

  /**
   * Trim to size, sorting by id if the file did not already supply them in
   * order, and hand over the finished index. The builder is spent afterwards —
   * calling this again returns the same index.
   *
   * @throws if the same express id is defined twice.
   */
  finalize(): IfcLineIndex {
    if (this._index) return this._index;
    const n = this._count;

    let ids: Uint32Array;
    let offsets: Float64Array;
    let lengths: Uint32Array;
    let types: Uint16Array;

    if (this._ascending) {
      ids = this._ids.slice(0, n);
      offsets = this._offsets.slice(0, n);
      lengths = this._lengths.slice(0, n);
      types = this._types.slice(0, n);
    } else {
      // Sort a permutation and gather, so the four columns stay aligned.
      const source = this._ids;
      const order = new Array<number>(n);
      for (let i = 0; i < n; i++) order[i] = i;
      order.sort((a, b) => source[a] - source[b]);

      ids = new Uint32Array(n);
      offsets = new Float64Array(n);
      lengths = new Uint32Array(n);
      types = new Uint16Array(n);
      for (let i = 0; i < n; i++) {
        const from = order[i];
        ids[i] = this._ids[from];
        offsets[i] = this._offsets[from];
        lengths[i] = this._lengths[from];
        types[i] = this._types[from];
      }
    }

    for (let i = 1; i < n; i++) {
      if (ids[i] === ids[i - 1]) {
        throw new Error(`Duplicate Ifc entity id #${ids[i]}`);
      }
    }

    this._index = new IfcLineIndex({
      ids,
      offsets,
      lengths,
      types,
      typeNames: this._typeNames,
      typeCodes: this._typeCodes,
    });

    // The oversized build buffers are dead now that the index has its own
    // trimmed copies; drop them rather than holding twice the memory.
    this._ids = new Uint32Array(0);
    this._offsets = new Float64Array(0);
    this._lengths = new Uint32Array(0);
    this._types = new Uint16Array(0);

    return this._index;
  }
}
