// ---------------------------------------------------------------------------
// Relations as an edge list
// ---------------------------------------------------------------------------
// A model's relations were an object per entity holding an array per
// relation name, which for millions of entities is most of the property
// pass's heap. They are collected here as three typed columns instead —
// (entity, name, target), 10 bytes an edge — and grouped once, when read.
// ---------------------------------------------------------------------------

/** Stands in for a name added with no targets, which is kept all the same. */
const NONE = 0xffffffff;

const grow = <T extends Uint32Array | Uint16Array>(column: T, size: number) => {
  const grown = new (column.constructor as new (n: number) => T)(size);
  grown.set(column);
  return grown;
};

export class RelationEdges {
  private _entity = new Uint32Array(1 << 16);
  private _name = new Uint16Array(1 << 16);
  private _target = new Uint32Array(1 << 16);
  private _count = 0;
  private readonly _names: string[] = [];
  private readonly _nameCodes = new Map<string, number>();

  // Built by `seal`: edge positions ordered by entity, insertion order kept
  // within one, and where each entity's run starts.
  private _order: Uint32Array | null = null;
  private _entities: Uint32Array | null = null;
  private _starts: Uint32Array | null = null;

  /** Relates `entity` to each of `targets` under `name`, in order. */
  add(entity: number, name: string, targets: number[]) {
    if (this._order) throw new Error("Fragments: relations already sealed");
    let code = this._nameCodes.get(name);
    if (code === undefined) {
      code = this._names.push(name) - 1;
      this._nameCodes.set(name, code);
    }
    if (targets.length === 0) {
      this.push(entity, code, NONE);
      return;
    }
    for (const target of targets) this.push(entity, code, target);
  }

  private push(entity: number, name: number, target: number) {
    if (this._count === this._entity.length) {
      const size = Math.ceil(this._count * 1.5);
      this._entity = grow(this._entity, size);
      this._name = grow(this._name, size);
      this._target = grow(this._target, size);
    }
    this._entity[this._count] = entity;
    this._name[this._count] = name;
    this._target[this._count++] = target;
  }

  /**
   * Orders the edges by entity. A stable LSD radix sort, a byte at a time,
   * so each entity's edges keep the order they were added in.
   */
  seal() {
    if (this._order) return;
    const n = this._count;
    let order = new Uint32Array(n);
    for (let i = 0; i < n; i++) order[i] = i;
    let scratch = new Uint32Array(n);
    const counts = new Uint32Array(257);
    for (let shift = 0; shift < 32; shift += 8) {
      counts.fill(0);
      for (let i = 0; i < n; i++) {
        // eslint-disable-next-line no-bitwise
        counts[((this._entity[order[i]] >>> shift) & 0xff) + 1]++;
      }
      for (let b = 0; b < 256; b++) counts[b + 1] += counts[b];
      for (let i = 0; i < n; i++) {
        // eslint-disable-next-line no-bitwise
        const bucket = (this._entity[order[i]] >>> shift) & 0xff;
        scratch[counts[bucket]++] = order[i];
      }
      [order, scratch] = [scratch, order];
    }
    const entities: number[] = [];
    const starts: number[] = [];
    for (let i = 0; i < n; i++) {
      const entity = this._entity[order[i]];
      if (i === 0 || entity !== entities[entities.length - 1]) {
        entities.push(entity);
        starts.push(i);
      }
    }
    starts.push(n);
    this._order = order;
    this._entities = Uint32Array.from(entities);
    this._starts = Uint32Array.from(starts);
  }

  /** Number of entities with at least one relation. */
  get entityCount() {
    this.seal();
    return this._entities!.length;
  }

  /**
   * Every entity with relations, ascending, with its relations grouped by
   * name in the order each name was first added for it.
   */
  forEach(fn: (entity: number, relations: [string, number[]][]) => void) {
    this.seal();
    for (let e = 0; e < this._entities!.length; e++) {
      fn(this._entities![e], this.groupAt(e));
    }
  }

  /** The targets `entity` relates to under `name`, if any were added. */
  get(entity: number, name: string): number[] | undefined {
    this.seal();
    const code = this._nameCodes.get(name);
    if (code === undefined) return undefined;
    const e = this.find(entity);
    if (e === -1) return undefined;
    let found: number[] | undefined;
    for (let i = this._starts![e]; i < this._starts![e + 1]; i++) {
      const edge = this._order![i];
      if (this._name[edge] !== code) continue;
      found ??= [];
      if (this._target[edge] !== NONE) found.push(this._target[edge]);
    }
    return found;
  }

  private groupAt(e: number): [string, number[]][] {
    const groups = new Map<number, number[]>();
    for (let i = this._starts![e]; i < this._starts![e + 1]; i++) {
      const edge = this._order![i];
      let targets = groups.get(this._name[edge]);
      if (!targets) groups.set(this._name[edge], (targets = []));
      if (this._target[edge] !== NONE) targets.push(this._target[edge]);
    }
    return [...groups].map(([code, targets]) => [this._names[code], targets]);
  }

  private find(entity: number) {
    const entities = this._entities!;
    let low = 0;
    let high = entities.length - 1;
    while (low <= high) {
      // eslint-disable-next-line no-bitwise
      const mid = (low + high) >>> 1;
      if (entities[mid] === entity) return mid;
      if (entities[mid] < entity) low = mid + 1;
      else high = mid - 1;
    }
    return -1;
  }
}
