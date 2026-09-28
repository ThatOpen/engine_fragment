import type { IfcEntityResolver } from "../../../../Utils/ifc-resolver";

// ---------------------------------------------------------------------------
// Projections: the part of an IFC file that some elements' geometry reads
// ---------------------------------------------------------------------------
// web-ifc's geometry pass reads an element's statement, everything it refers
// to, and four kinds of statement that refer to it instead (web-ifc's
// IfcCache): the openings that void it, the styles on its representation
// items, and its material and the material's styled representation. A file
// holding exactly those statements produces the same meshes for those
// elements as the whole file does — so a large file can be converted as many
// small ones, each opened in a web-ifc of its own, in parallel, and within a
// memory budget.
//
// Everything here works on statement bytes through the file's index: nothing
// is decoded, and no entity is built.
// ---------------------------------------------------------------------------

const HASH = 35; // #
const QUOTE = 39; // '
const OPEN = 40; // (
const CLOSE = 41; // )
const COMMA = 44; // ,
const ZERO = 48;
const NINE = 57;

/** Elements of one category, in the order they are streamed. */
export interface ProjectedGroup {
  category: number;
  ids: number[];
}

export interface Projection {
  /** A standalone IFC file. */
  bytes: Uint8Array;
  /** The elements to stream, grouped by category in processing order. */
  groups: ProjectedGroup[];
  /** Number of elements across `groups`. */
  elementCount: number;
}

/**
 * A multimap from one express id to others, held as two sorted columns so
 * that millions of relations cost 8 bytes each rather than a JS array apiece.
 */
class IdMultimap {
  private _keys = new Uint32Array(1024);
  private _values = new Uint32Array(1024);
  private _count = 0;
  private _sorted = true;

  add(key: number, value: number) {
    if (this._count === this._keys.length) {
      const keys = new Uint32Array(this._keys.length * 2);
      const values = new Uint32Array(this._keys.length * 2);
      keys.set(this._keys);
      values.set(this._values);
      this._keys = keys;
      this._values = values;
    }
    if (this._count > 0 && key < this._keys[this._count - 1]) {
      this._sorted = false;
    }
    this._keys[this._count] = key;
    this._values[this._count++] = value;
  }

  seal() {
    const n = this._count;
    if (!this._sorted) {
      const order = Array.from({ length: n }, (_, i) => i);
      order.sort((a, b) => this._keys[a] - this._keys[b] || a - b);
      const keys = new Uint32Array(n);
      const values = new Uint32Array(n);
      for (let i = 0; i < n; i++) {
        keys[i] = this._keys[order[i]];
        values[i] = this._values[order[i]];
      }
      this._keys = keys;
      this._values = values;
      this._sorted = true;
    } else {
      this._keys = this._keys.slice(0, n);
      this._values = this._values.slice(0, n);
    }
  }

  /** Calls `fn` with every value stored under `key`, in insertion order. */
  forEach(key: number, fn: (value: number) => void) {
    let low = 0;
    let high = this._count;
    while (low < high) {
      // eslint-disable-next-line no-bitwise
      const mid = (low + high) >>> 1;
      if (this._keys[mid] < key) low = mid + 1;
      else high = mid;
    }
    for (let i = low; i < this._count && this._keys[i] === key; i++) {
      fn(this._values[i]);
    }
  }

  has(key: number) {
    let found = false;
    this.forEach(key, () => {
      found = true;
    });
    return found;
  }
}

/**
 * Every `#N` in a statement's arguments, or only in its top-level argument
 * `argument` when one is given.
 */
function refs(bytes: Uint8Array, out: number[], argument = -1) {
  let depth = 0;
  let arg = 0;
  let inString = false;
  let i = bytes.indexOf(OPEN);
  if (i === -1) return out;
  for (; i < bytes.length; i++) {
    const c = bytes[i];
    if (inString) {
      if (c === QUOTE) inString = false; // '' toggles twice
      continue;
    }
    if (c === QUOTE) inString = true;
    else if (c === OPEN) depth++;
    else if (c === CLOSE) {
      if (--depth === 0) break;
    } else if (c === COMMA && depth === 1) arg++;
    else if (c === HASH && (argument === -1 || arg === argument)) {
      let id = 0;
      let j = i + 1;
      for (; j < bytes.length && bytes[j] >= ZERO && bytes[j] <= NINE; j++) {
        id = id * 10 + (bytes[j] - ZERO);
      }
      if (j > i + 1) out.push(id);
      i = j - 1;
    }
  }
  return out;
}

/** Byte range of top-level argument `argument`, or null if it has none. */
function argumentSpan(bytes: Uint8Array, argument: number) {
  let depth = 0;
  let arg = 0;
  let inString = false;
  let start = -1;
  for (let i = bytes.indexOf(OPEN); i !== -1 && i < bytes.length; i++) {
    const c = bytes[i];
    if (inString) {
      if (c === QUOTE) inString = false;
      continue;
    }
    if (c === QUOTE) inString = true;
    else if (c === OPEN) {
      depth++;
      if (depth === 1) {
        if (argument === 0) start = i + 1;
        continue;
      }
    } else if (c === CLOSE) {
      depth--;
      if (depth === 0) return start === -1 ? null : [start, i];
    } else if (c === COMMA && depth === 1) {
      if (arg === argument) return [start, i];
      arg++;
      if (arg === argument) start = i + 1;
    }
  }
  return null;
}

const encoder = new TextEncoder();

// Rough cost of meshing, in milliseconds, from what an element's closure
// holds. Only relative costs matter — measured batch times calibrate the
// scale. Boolean operations (CSG) cost far more than plain elements, larger
// explicit geometry costs more to tessellate, and web-ifc meshes a mapped
// representation again for every instance of it.
const COST_PER_ELEMENT = 0.3;
const COST_PER_BYTE = 2e-5;
const COST_PER_BOOLEAN = 4;
const COST_PER_VOID = 3;

/**
 * Plans and writes {@link Projection}s of one file.
 *
 * The reverse relations it needs are gathered in one pass over the index when
 * it is created; each projection then costs a walk over the statements its
 * elements reach.
 */
export class IfcProjector {
  private readonly _voids = new IdMultimap(); // element -> IfcRelVoidsElement
  private readonly _aggregatedIn = new IdMultimap(); // child -> IfcRelAggregates
  private readonly _aggregates = new IdMultimap(); // parent -> IfcRelAggregates
  private readonly _nests = new IdMultimap(); // parent -> IfcRelNests
  private readonly _styled = new IdMultimap(); // item -> IfcStyledItem
  private readonly _materials = new IdMultimap(); // object -> IfcRelAssociatesMaterial
  private readonly _materialDefs = new IdMultimap(); // material -> IfcMaterialDefinitionRepresentation
  private readonly _relating = new Map<number, number>(); // IfcRelAggregates -> parent
  // IfcRelAssociatesMaterial -> RelatingMaterial. Such a relation can list
  // tens of thousands of objects, so it is read once here rather than
  // rescanned for each of them.
  private readonly _materialOf = new Map<number, number>();
  private readonly _roots: number[] = [];
  private readonly _alignments: number[] = [];

  // Per-projection walk state. `_stamp[i] === _walk` marks index position i
  // as already in the projection being built, so nothing is cleared between
  // projections.
  private readonly _stamp: Uint32Array;
  private _walk = 0;
  private _positions: number[] = [];
  private _bytes = 0;
  // Relations listing many objects are cut down to the ones in the projection
  private _rewrites = new Map<number, { argument: number; keep: Set<number> }>();
  private readonly _scratch: number[] = [];
  // How far `closeStyles` has swept `_positions`
  private _closedUpTo = 0;

  // Estimated meshing cost of what was added since `takeCost`
  private _cost = 0;
  private readonly _booleanCodes = new Set<number>();
  private readonly _voidsCode: number;
  private readonly _mappedItemCode: number;
  // IfcRepresentationMap -> the cost of meshing one instance of it
  private readonly _mapCosts = new Map<number, number>();

  constructor(private readonly _resolver: IfcEntityResolver) {
    const { index } = _resolver;
    this._stamp = new Uint32Array(index.count);

    const code = (type: string) => index.codeOf(type) || -1;
    const voids = code("IFCRELVOIDSELEMENT");
    const aggregates = code("IFCRELAGGREGATES");
    const nests = code("IFCRELNESTS");
    const styled = code("IFCSTYLEDITEM");
    const materials = code("IFCRELASSOCIATESMATERIAL");
    const materialDefs = code("IFCMATERIALDEFINITIONREPRESENTATION");
    const project = code("IFCPROJECT");
    const alignment = code("IFCALIGNMENT");
    for (const type of ["IFCBOOLEANRESULT", "IFCBOOLEANCLIPPINGRESULT"]) {
      if (index.codeOf(type)) this._booleanCodes.add(index.codeOf(type));
    }
    this._voidsCode = voids;
    this._mappedItemCode = code("IFCMAPPEDITEM");

    const found: number[] = [];
    for (let at = 0; at < index.count; at++) {
      const type = index.typeCodeAt(at);
      const id = index.idAt(at);
      if (type === project) this._roots.push(id);
      else if (type === alignment) this._alignments.push(id);
      else if (type === voids) {
        // (GlobalId, OwnerHistory, Name, Description, RelatingBuildingElement,
        //  RelatedOpeningElement)
        found.length = 0;
        for (const element of this.refsAt(at, found, 4)) {
          this._voids.add(element, id);
        }
      } else if (type === aggregates || type === nests) {
        found.length = 0;
        const [parent] = this.refsAt(at, found, 4);
        if (parent === undefined) continue;
        if (type === aggregates) {
          this._relating.set(id, parent);
          this._aggregates.add(parent, id);
          found.length = 0;
          for (const child of this.refsAt(at, found, 5)) {
            this._aggregatedIn.add(child, id);
          }
        } else {
          this._nests.add(parent, id);
        }
      } else if (type === styled) {
        // (Item, Styles, Name); web-ifc only reads it when Item is set
        found.length = 0;
        const [item] = this.refsAt(at, found, 0);
        if (item !== undefined) this._styled.add(item, id);
      } else if (type === materials) {
        // (..., RelatedObjects, RelatingMaterial)
        found.length = 0;
        const [material] = this.refsAt(at, found, 5);
        if (material !== undefined) this._materialOf.set(id, material);
        found.length = 0;
        for (const object of this.refsAt(at, found, 4)) {
          this._materials.add(object, id);
        }
      } else if (type === materialDefs) {
        // (Name, Description, Representations, RepresentedMaterial)
        found.length = 0;
        const [material] = this.refsAt(at, found, 3);
        if (material !== undefined) this._materialDefs.add(material, id);
      }
    }
    for (const map of [
      this._voids,
      this._aggregatedIn,
      this._aggregates,
      this._nests,
      this._styled,
      this._materials,
      this._materialDefs,
    ]) {
      map.seal();
    }
  }

  /** Whether the file has alignments, which need a projection of their own. */
  get hasAlignments() {
    return this._alignments.length > 0;
  }

  /** Starts a new projection. */
  begin() {
    this._walk++;
    this._positions = [];
    this._bytes = 0;
    this._rewrites = new Map();
    this._closedUpTo = 0;
    // What web-ifc reads before any element: the project, for its units
    for (const root of this._roots) this.addDown(root);
  }

  /** Bytes of IFC the current projection holds so far. */
  get size() {
    return this._bytes;
  }

  /**
   * Estimated cost of meshing what was added since the last call, in rough
   * milliseconds; see the weights above.
   */
  takeCost() {
    const cost = this._cost;
    this._cost = 0;
    return cost;
  }

  /** Adds an element and everything its geometry reads. */
  addElement(id: number) {
    this._cost += COST_PER_ELEMENT;
    this.addWithReverse(id);
    this.addInheritedVoids(id);
    this.closeStyles();
  }

  /** Adds every alignment, with what `GetAllAlignments` reads. */
  addAlignments() {
    const pending = [...this._alignments];
    while (pending.length) {
      const id = pending.pop()!;
      if (!this.addDown(id)) continue;
      const children = (map: IdMultimap) =>
        map.forEach(id, (rel) => {
          this.addDown(rel);
          const found: number[] = [];
          for (const child of this.refsOf(rel, found, 5)) pending.push(child);
        });
      children(this._nests);
      children(this._aggregates);
    }
    this.closeStyles();
  }

  /** Writes the current projection as a standalone file. */
  finish(groups: ProjectedGroup[]): Projection {
    const { index } = this._resolver;
    const source = this._resolver;
    const head = encoder.encode(
      [
        "ISO-10303-21;",
        "HEADER;",
        ...["FILE_DESCRIPTION", "FILE_NAME", "FILE_SCHEMA"].map(
          (keyword) => `${source.header.get(keyword) ?? `${keyword}()`};`,
        ),
        "ENDSEC;",
        "DATA;",
        "",
      ].join("\n"),
    );
    const tail = encoder.encode("ENDSEC;\nEND-ISO-10303-21;\n");

    // file order, so web-ifc sees ids in the order the source had them
    const positions = this._positions.sort((a, b) => a - b);
    const rewritten = new Map<number, Uint8Array>();
    let size = head.length + tail.length;
    for (const at of positions) {
      const rewrite = this._rewrites.get(at);
      if (rewrite) {
        const bytes = this.rewrite(at, rewrite.argument, rewrite.keep);
        rewritten.set(at, bytes);
        size += bytes.length + 1;
      } else {
        size += index.lengthAt(at) + 1;
      }
    }

    const bytes = new Uint8Array(size);
    bytes.set(head, 0);
    let offset = head.length;
    for (const at of positions) {
      const statement =
        rewritten.get(at) ?? this.statement(at, index.lengthAt(at));
      bytes.set(statement, offset);
      offset += statement.length;
      bytes[offset++] = 10; // \n
    }
    bytes.set(tail, offset);

    let elementCount = 0;
    for (const group of groups) elementCount += group.ids.length;
    return { bytes, groups, elementCount };
  }

  // --- the walk -------------------------------------------------------------

  private statement(at: number, length: number) {
    return this._resolver.source.read(this._resolver.index.offsetAt(at), length);
  }

  private refsAt(at: number, out: number[], argument = -1) {
    return refs(
      this.statement(at, this._resolver.index.lengthAt(at)),
      out,
      argument,
    );
  }

  private refsOf(id: number, out: number[], argument = -1) {
    const at = this._resolver.index.indexOf(id);
    return at === -1 ? out : this.refsAt(at, out, argument);
  }

  /** Marks `id`; false when it is dangling or already in. */
  private mark(id: number) {
    const { index } = this._resolver;
    const at = index.indexOf(id);
    if (at === -1 || this._stamp[at] === this._walk) return -1;
    this._stamp[at] = this._walk;
    this._positions.push(at);
    const length = index.lengthAt(at);
    this._bytes += length + 1;
    this.addCost(at, length);
    return at;
  }

  private addCost(at: number, length: number) {
    const type = this._resolver.index.typeCodeAt(at);
    this._cost += length * COST_PER_BYTE;
    if (this._booleanCodes.has(type)) this._cost += COST_PER_BOOLEAN;
    else if (type === this._voidsCode) this._cost += COST_PER_VOID;
  }

  /**
   * A mapped item's representation map: web-ifc meshes it again for every
   * instance, so every instance costs it — whether or not the map is already
   * in. What one instance costs is measured the first time the map is walked,
   * as part of the batch's own walk, and remembered.
   */
  private addMap(map: number) {
    const { index } = this._resolver;
    const at = index.indexOf(map);
    if (at === -1) return;
    if (this._stamp[at] === this._walk) {
      this._cost += this._mapCosts.get(map) ?? 0;
      return;
    }
    const before = this._cost;
    this.addDown(map);
    if (!this._mapCosts.has(map)) this._mapCosts.set(map, this._cost - before);
  }

  /** Adds `id` and everything it refers to, transitively. */
  private addDown(id: number) {
    const first = this.mark(id);
    if (first === -1) return false;
    const { index } = this._resolver;
    // index positions, not ids: each statement is looked up once, when marked
    const stack = [first];
    while (stack.length) {
      const at = stack.pop()!;
      const found = this._scratch;
      found.length = 0;
      this.refsAt(at, found);
      if (index.typeCodeAt(at) === this._mappedItemCode) {
        // (MappingSource, MappingTarget): the source is walked on its own, to
        // measure it. That walk reuses the scratch array, so keep a copy.
        const [source, ...rest] = found;
        if (source !== undefined) this.addMap(source);
        for (const ref of rest) {
          const marked = this.mark(ref);
          if (marked !== -1) stack.push(marked);
        }
        continue;
      }
      for (const ref of found) {
        const marked = this.mark(ref);
        if (marked !== -1) stack.push(marked);
      }
    }
    return true;
  }

  /**
   * Adds a relation listing many objects, cut down to `member` (plus whichever
   * members earlier calls kept), and what its argument `down` refers to.
   */
  private addRelation(rel: number, listArgument: number, member: number) {
    const at = this._resolver.index.indexOf(rel);
    if (at === -1) return;
    let rewrite = this._rewrites.get(at);
    if (!rewrite) {
      rewrite = { argument: listArgument, keep: new Set() };
      this._rewrites.set(at, rewrite);
    }
    rewrite.keep.add(member);
    if (this._stamp[at] === this._walk) return;
    this._stamp[at] = this._walk;
    this._positions.push(at);
    // the rewritten statement is at most as long as the original
    this._bytes += this._resolver.index.lengthAt(at) + 1;
  }

  /** An element or opening, with the relations web-ifc reads about it. */
  private addWithReverse(id: number) {
    this.addDown(id);
    // openings that void it, which are elements in turn
    this._voids.forEach(id, (rel) => {
      if (this.mark(rel) === -1) return;
      const found: number[] = [];
      for (const opening of this.refsOf(rel, found, 5)) {
        this.addWithReverse(opening);
      }
      this.addDownOf(rel);
    });
    // its material; the relation is cut down to the elements projected
    this._materials.forEach(id, (rel) => {
      this.addRelation(rel, 4, id);
      const material = this._materialOf.get(rel);
      if (material !== undefined) this.addDown(material);
    });
  }

  /** What a statement refers to, when the statement itself is already in. */
  private addDownOf(id: number) {
    const found: number[] = [];
    for (const ref of this.refsOf(id, found)) this.addDown(ref);
  }

  /**
   * web-ifc gives an aggregated element the openings of every voided
   * ancestor, through the aggregation relations that lead to it.
   */
  private addInheritedVoids(id: number) {
    this._aggregatedIn.forEach(id, (rel) => {
      const parent = this._relating.get(rel);
      if (parent === undefined || !this.hasVoidsAbove(parent)) return;
      this.addRelation(rel, 5, id);
      this._voids.forEach(parent, (voidRel) => {
        if (this.mark(voidRel) === -1) return;
        this.addDownOf(voidRel);
      });
      this.addInheritedVoids(parent);
    });
  }

  private hasVoidsAbove(id: number, depth = 0): boolean {
    if (this._voids.has(id)) return true;
    if (depth > 64) return false; // a cycle, in a malformed file
    let found = false;
    this._aggregatedIn.forEach(id, (rel) => {
      const parent = this._relating.get(rel);
      if (!found && parent !== undefined) {
        found = this.hasVoidsAbove(parent, depth + 1);
      }
    });
    return found;
  }

  /**
   * Styles are looked up for every node web-ifc builds a mesh from, and a
   * material's styled representation for every material: both refer to
   * statements already in, so they are found by sweeping what is in until
   * nothing more is added.
   */
  private closeStyles() {
    const { index } = this._resolver;
    for (let i = this._closedUpTo; i < this._positions.length; i++) {
      const id = index.idAt(this._positions[i]);
      this._styled.forEach(id, (styled) => this.addDown(styled));
      this._materialDefs.forEach(id, (def) => this.addDown(def));
    }
    this._closedUpTo = this._positions.length;
  }

  private rewrite(at: number, argument: number, keep: Set<number>) {
    const { index } = this._resolver;
    const original = this.statement(at, index.lengthAt(at));
    const span = argumentSpan(original, argument);
    if (!span) return original.slice();
    const list = encoder.encode(
      `(${[...keep].map((id) => `#${id}`).join(",")})`,
    );
    const out = new Uint8Array(
      span[0] + list.length + original.length - span[1],
    );
    out.set(original.subarray(0, span[0]), 0);
    out.set(list, span[0]);
    out.set(original.subarray(span[1]), span[0] + list.length);
    return out;
  }
}
