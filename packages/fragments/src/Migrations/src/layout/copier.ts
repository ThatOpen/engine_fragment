/* eslint-disable no-use-before-define */
import { Builder, ByteBuffer } from "flatbuffers";
import {
  ElementType,
  FieldType,
  ScalarName,
  SchemaDescriptor,
  TableFieldDescriptor,
  canCarry,
  resolveType,
  sameStructLayout,
} from "./descriptor";
import {
  Reader,
  ScalarArray,
  StructView,
  TableView,
  VectorView,
  readNumber,
  scalarArrayOf,
} from "./reader";
import { MigrationObligationError } from "../errors";

/** What the handler of a removed field returns: the field is gone on purpose. */
export const drop: unique symbol = Symbol("fragments.migration.drop");
export type Drop = typeof drop;

/**
 * Gives the value of one field of the new layout, or acknowledges a field
 * that was removed. It receives the node of the old file that owns the field.
 */
export type LayoutHandler<Ctx = any> = (node: any, ctx: Ctx) => unknown;
export type LayoutHandlers = Record<string, LayoutHandler | undefined>;

type Scalar = Extract<ElementType, { kind: "scalar" }>;

/** A field of a table of the new layout. */
interface Target {
  key: string;
  name: string;
  slot: number;
  type: FieldType;
  /** Default of a scalar, which is not stored. `null`: always stored. */
  fallback: number | bigint | null;
  required: boolean;
  /** Size and alignment when the field is a struct. */
  size: number;
  align: number;
}

/** Where a field of the new layout is carried from in the old file. */
interface Source {
  vtableOffset: number;
  type: FieldType;
  /** Value of a scalar that is not stored. `undefined`: it has none. */
  fallback: number | bigint | undefined;
  table?: TablePlan;
  struct?: StructPlan;
}

interface Removed {
  key: string;
  handler: LayoutHandler;
}

interface TablePlan {
  from: string;
  slots: number;
  targets: Target[];
  sources: (Source | undefined)[];
  handlers: (LayoutHandler | undefined)[];
  removed: Removed[];
  needsNode: boolean;
}

interface StructTarget {
  key: string;
  name: string;
  offset: number;
  type: ElementType;
  size: number;
}

interface StructSource {
  offset: number;
  struct?: StructPlan;
}

interface StructPlan {
  from: string;
  size: number;
  align: number;
  /** The old bytes are the new bytes, so the struct is copied as it is. */
  same: boolean;
  targets: StructTarget[];
  sources: (StructSource | undefined)[];
  handlers: (LayoutHandler | undefined)[];
  removed: Removed[];
  needsNode: boolean;
}

interface Bytes {
  bytes: Uint8Array;
  view: DataView;
}

/** The two fields of a Builder that writing bytes in bulk needs. */
interface BuilderInternals {
  bb: ByteBuffer;
  space: number;
}

function allocate(size: number): Bytes {
  const bytes = new Uint8Array(size);
  return { bytes, view: new DataView(bytes.buffer) };
}

function fallbackOf(scalar: ScalarName, value: number | string | undefined) {
  if (scalar === "long" || scalar === "ulong") {
    return BigInt(value ?? 0);
  }
  return Number(value ?? 0);
}

function toNumber(scalar: ScalarName, value: unknown): number | bigint {
  if (scalar === "long" || scalar === "ulong") {
    return BigInt(value as number | bigint);
  }
  return Number(value);
}

function writeNumber(
  view: DataView,
  position: number,
  scalar: ScalarName,
  value: unknown,
) {
  switch (scalar) {
    case "bool":
    case "ubyte":
      view.setUint8(position, Number(value));
      break;
    case "byte":
      view.setInt8(position, Number(value));
      break;
    case "short":
      view.setInt16(position, Number(value), true);
      break;
    case "ushort":
      view.setUint16(position, Number(value), true);
      break;
    case "int":
      view.setInt32(position, Number(value), true);
      break;
    case "uint":
      view.setUint32(position, Number(value), true);
      break;
    case "long":
      view.setBigInt64(position, BigInt(value as bigint), true);
      break;
    case "ulong":
      view.setBigUint64(position, BigInt(value as bigint), true);
      break;
    case "float":
      view.setFloat32(position, Number(value), true);
      break;
    default:
      view.setFloat64(position, Number(value), true);
  }
}

/**
 * Rewrites a fragments file from the layout it was written with to another
 * one. Fields are matched by name, so a field that only moved to another slot
 * needs nothing. Vectors of scalars and of unchanged structs are copied as
 * bytes. A field the copier cannot carry on its own (removed, new and
 * required, or of a different type) needs a handler, and so can any other.
 */
export class Copier {
  private readonly _reader: Reader;
  private readonly _from: SchemaDescriptor;
  private readonly _to: SchemaDescriptor;
  private readonly _handlers: LayoutHandlers;
  private readonly _ctx: unknown;
  private readonly _builder: Builder;
  private readonly _tablePlans = new Map<string, TablePlan>();
  private readonly _structPlans = new Map<string, StructPlan>();
  private readonly _objectTargets = new Map<string, Target[]>();
  // The importer shares equal strings. Keyed by where a string is in the old
  // file, so that a shared string is written once in the new one too.
  private readonly _strings = new Map<number, number>();
  private readonly _root: TablePlan;

  constructor({
    bytes,
    from,
    to,
    handlers = {},
    ctx,
  }: {
    /** The raw (inflated) file. */
    bytes: Uint8Array;
    from: SchemaDescriptor;
    to: SchemaDescriptor;
    handlers?: LayoutHandlers;
    ctx?: unknown;
  }) {
    this._reader = new Reader(bytes, from);
    this._from = from;
    this._to = to;
    this._handlers = handlers;
    this._ctx = ctx;
    // Room for the file to grow a little without the builder doubling its
    // buffer, which would copy everything written so far. A multiple of 8:
    // the builder aligns from the end of its buffer, so only then does the
    // file start on an aligned byte, which reading its vectors as typed
    // arrays needs.
    const capacity = Math.ceil((bytes.length * 1.125 + 1024) / 8) * 8;
    this._builder = new Builder(capacity);
    this.checkHandlerKeys();
    // Plans everything reachable from the root, so a missing handler throws
    // here and not halfway through the file.
    this._root = this.tablePlan(from.root, to.root);
  }

  /**
   * Writes a file of a layout from plain objects, one per table or struct,
   * with the fields named as the schema names them. It is how a file of a
   * layout this package no longer writes can still be made, for a test.
   */
  static write(schema: SchemaDescriptor, root: Record<string, unknown>) {
    const empty = new Uint8Array(8);
    const copier = new Copier({ bytes: empty, from: schema, to: schema });
    const builder = copier._builder;
    builder.finish(copier.newTable(schema.root, root));
    return copier.result();
  }

  /** The file in the new layout, raw. */
  run(): Uint8Array {
    const builder = this._builder;
    const root = this.table(this._root, this._reader.rootPosition);
    builder.finish(root);
    return this.result();
  }

  /**
   * What the builder wrote: a view into its buffer when the file fills most
   * of it, like the files `edit()` returns, and a copy when it would keep a
   * much bigger buffer alive.
   */
  private result() {
    const written = this._builder.asUint8Array();
    const mostly = written.byteLength >= written.buffer.byteLength * 0.75;
    return mostly ? written : written.slice();
  }

  // Planning

  private checkHandlerKeys() {
    for (const key in this._handlers) {
      const dot = key.indexOf(".");
      const type = key.slice(0, dot);
      const field = key.slice(dot + 1);
      const known = [this._from, this._to].some(
        (schema) =>
          schema.tables[type]?.fields[field] !== undefined ||
          schema.structs[type]?.fields[field] !== undefined,
      );
      if (!known) {
        throw new Error(
          `Fragments: the migration has a handler for "${key}", which is a field of neither layout.`,
        );
      }
    }
  }

  private target(table: string, name: string, field: TableFieldDescriptor) {
    const type = resolveType(this._to, field.type);
    const target: Target = {
      key: `${table}.${name}`,
      name,
      slot: field.slot,
      type,
      fallback: null,
      required: field.required === true,
      size: 0,
      align: 0,
    };
    if (type.kind === "scalar" && !field.optional) {
      target.fallback = fallbackOf(type.scalar, field.default);
    }
    if (type.kind === "struct") {
      const struct = this._to.structs[type.name];
      target.size = struct.size;
      target.align = struct.align;
    }
    return target;
  }

  private tablePlan(from: string, to: string): TablePlan {
    const key = `${from}>${to}`;
    const found = this._tablePlans.get(key);
    if (found) {
      return found;
    }
    const source = this._from.tables[from];
    const target = this._to.tables[to];
    const plan: TablePlan = {
      from,
      slots: target.slots,
      targets: [],
      sources: [],
      handlers: [],
      removed: [],
      needsNode: false,
    };
    // Registered before its fields are planned: a table can contain itself.
    this._tablePlans.set(key, plan);
    for (const name in target.fields) {
      const field = this.target(to, name, target.fields[name]);
      const handler = this._handlers[field.key];
      const old = source.fields[name];
      let carried: Source | undefined;
      if (!handler && old) {
        carried = this.source(field, old);
      } else if (!handler && field.required) {
        throw new MigrationObligationError(field.key, "is new and required");
      }
      plan.targets.push(field);
      plan.sources.push(carried);
      plan.handlers.push(handler);
    }
    for (const name in source.fields) {
      if (name in target.fields) continue;
      plan.removed.push(this.removed(`${from}.${name}`));
    }
    plan.needsNode =
      plan.removed.length > 0 || plan.handlers.some((handler) => handler);
    return plan;
  }

  private removed(key: string): Removed {
    const handler = this._handlers[key];
    if (!handler) {
      throw new MigrationObligationError(key, "was removed");
    }
    return { key, handler };
  }

  private source(target: Target, old: TableFieldDescriptor): Source {
    const type = resolveType(this._from, old.type);
    if (!canCarry(this._from, this._to, type, target.type)) {
      throw new MigrationObligationError(
        target.key,
        `changed type from ${old.type}`,
      );
    }
    const source: Source = {
      vtableOffset: 4 + 2 * old.slot,
      type,
      fallback: undefined,
    };
    if (type.kind === "scalar" && !old.optional) {
      source.fallback = fallbackOf(type.scalar, old.default);
    }
    const from = type.kind === "vector" ? type.of : type;
    const to = target.type.kind === "vector" ? target.type.of : target.type;
    if (from.kind === "table" && to.kind === "table") {
      source.table = this.tablePlan(from.name, to.name);
    }
    if (from.kind === "struct" && to.kind === "struct") {
      source.struct = this.structPlan(from.name, to.name);
    }
    return source;
  }

  private structPlan(from: string, to: string): StructPlan {
    const key = `${from}>${to}`;
    const found = this._structPlans.get(key);
    if (found) {
      return found;
    }
    const source = this._from.structs[from];
    const target = this._to.structs[to];
    const plan: StructPlan = {
      from,
      size: target.size,
      align: target.align,
      same: sameStructLayout(this._from, this._to, from, to),
      targets: [],
      sources: [],
      handlers: [],
      removed: [],
      needsNode: false,
    };
    this._structPlans.set(key, plan);
    for (const name in target.fields) {
      const field = target.fields[name];
      const type = resolveType(this._to, field.type) as ElementType;
      const fieldKey = `${to}.${name}`;
      const handler = this._handlers[fieldKey];
      const old = source.fields[name];
      let carried: StructSource | undefined;
      if (!handler) {
        if (!old) {
          // A struct has no absent fields, so a new one needs a value.
          throw new MigrationObligationError(fieldKey, "is new");
        }
        const oldType = resolveType(this._from, old.type);
        if (!canCarry(this._from, this._to, oldType, type)) {
          throw new MigrationObligationError(
            fieldKey,
            `changed type from ${old.type}`,
          );
        }
        carried = { offset: old.offset };
        if (oldType.kind === "struct" && type.kind === "struct") {
          carried.struct = this.structPlan(oldType.name, type.name);
        }
      }
      plan.targets.push({
        key: fieldKey,
        name,
        offset: field.offset,
        type,
        size:
          type.kind === "struct"
            ? this._to.structs[type.name].size
            : (type as Scalar).size,
      });
      plan.sources.push(carried);
      plan.handlers.push(handler);
    }
    for (const name in source.fields) {
      if (name in target.fields) continue;
      plan.removed.push(this.removed(`${from}.${name}`));
    }
    const handled = plan.handlers.some((handler) => handler);
    plan.needsNode = handled || plan.removed.length > 0;
    plan.same = plan.same && !plan.needsNode;
    return plan;
  }

  /** The fields of a table of the new layout, to write one from an object. */
  private objectTargets(table: string) {
    let targets = this._objectTargets.get(table);
    if (!targets) {
      const { fields } = this._to.tables[table];
      targets = Object.keys(fields).map((name) =>
        this.target(table, name, fields[name]),
      );
      this._objectTargets.set(table, targets);
    }
    return targets;
  }

  // Carrying a node of the old file over

  private table(plan: TablePlan, position: number): number {
    const reader = this._reader;
    const { targets, sources, handlers } = plan;
    const node = plan.needsNode ? reader.table(plan.from, position) : undefined;
    this.acknowledge(plan.removed, node);
    const values: unknown[] = new Array(targets.length);
    for (let i = 0; i < targets.length; i++) {
      const handler = handlers[i];
      if (handler) {
        values[i] = this.prepare(targets[i], handler(node, this._ctx));
        continue;
      }
      const source = sources[i];
      if (!source) continue;
      const at = reader.fieldPosition(position, source.vtableOffset);
      values[i] = at === 0 ? source.fallback : this.carry(source, at);
    }
    return this.emit(plan.slots, targets, values);
  }

  private acknowledge(removed: Removed[], node: unknown) {
    for (const { key, handler } of removed) {
      if (handler(node, this._ctx) !== drop) {
        throw new Error(
          `Fragments: the handler of "${key}" must return drop, the field was removed.`,
        );
      }
    }
  }

  /** The value of a field that the old file has, ready for {@link emit}. */
  private carry(source: Source, position: number): unknown {
    const reader = this._reader;
    const { type } = source;
    switch (type.kind) {
      case "scalar":
        return readNumber(reader.view, position, type.scalar);
      case "string":
        return this.string(reader.indirect(position));
      case "struct":
        return this.structBytes(source.struct!, position);
      case "table":
        return this.table(source.table!, reader.indirect(position));
      default:
        return this.vector(type.of, source, reader.indirect(position));
    }
  }

  private string(position: number) {
    let offset = this._strings.get(position);
    if (offset === undefined) {
      offset = this._builder.createString(this._reader.stringBytes(position));
      this._strings.set(position, offset);
    }
    return offset;
  }

  private structBytes(plan: StructPlan, position: number) {
    if (plan.same) {
      return this._reader.bytes.subarray(position, position + plan.size);
    }
    const out = allocate(plan.size);
    this.convertStruct(plan, position, out, 0);
    return out.bytes;
  }

  private vector(element: ElementType, plans: Source, vector: number) {
    const reader = this._reader;
    const length = reader.view.getUint32(vector, true);
    const data = vector + 4;
    switch (element.kind) {
      case "scalar": {
        const { size } = element;
        const bytes = reader.bytes.subarray(data, data + length * size);
        return this.rawVector(bytes, size, length, size);
      }
      case "struct": {
        const plan = plans.struct!;
        const size = this._from.structs[plan.from].size;
        if (plan.same) {
          const bytes = reader.bytes.subarray(data, data + length * size);
          return this.rawVector(bytes, size, length, plan.align);
        }
        const out = allocate(length * plan.size);
        for (let i = 0; i < length; i++) {
          this.convertStruct(plan, data + i * size, out, i * plan.size);
        }
        return this.rawVector(out.bytes, plan.size, length, plan.align);
      }
      case "string": {
        const offsets = new Uint32Array(length);
        for (let i = 0; i < length; i++) {
          offsets[i] = this.string(reader.indirect(data + i * 4));
        }
        return this.offsetsVector(offsets);
      }
      default: {
        const plan = plans.table!;
        const offsets = new Uint32Array(length);
        for (let i = 0; i < length; i++) {
          offsets[i] = this.table(plan, reader.indirect(data + i * 4));
        }
        return this.offsetsVector(offsets);
      }
    }
  }

  private convertStruct(
    plan: StructPlan,
    position: number,
    out: Bytes,
    at: number,
  ) {
    const reader = this._reader;
    const node = plan.needsNode
      ? reader.struct(plan.from, position)
      : undefined;
    this.acknowledge(plan.removed, node);
    const { targets, sources, handlers } = plan;
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const handler = handlers[i];
      if (handler) {
        const value = handler(node, this._ctx);
        this.encode(target.type, value, out, at + target.offset);
        continue;
      }
      const source = sources[i]!;
      const start = position + source.offset;
      if (source.struct && !source.struct.same) {
        this.convertStruct(source.struct, start, out, at + target.offset);
      } else {
        const bytes = reader.bytes.subarray(start, start + target.size);
        out.bytes.set(bytes, at + target.offset);
      }
    }
  }

  // Writing a value a handler returned

  /** Turns what a handler returned for a field into what {@link emit} takes. */
  private prepare(target: Target, value: unknown): unknown {
    if (value === drop) {
      throw new Error(
        `Fragments: "${target.key}" is not a removed field, it cannot be dropped.`,
      );
    }
    if (value === null || value === undefined) {
      if (target.required) {
        throw new Error(`Fragments: "${target.key}" is required.`);
      }
      return undefined;
    }
    const { type } = target;
    switch (type.kind) {
      case "scalar":
        return toNumber(type.scalar, value);
      case "string":
        return this.newString(value);
      case "struct": {
        const out = allocate(target.size);
        this.encode(type, value, out, 0);
        return out.bytes;
      }
      case "table":
        return this.newTable(type.name, value);
      default:
        return this.newVector(type.of, value, target.key);
    }
  }

  private newString(value: unknown) {
    return this._builder.createString(value as string | Uint8Array);
  }

  private newTable(name: string, value: unknown): number {
    if (value instanceof TableView) {
      // A node of the old file, moved here.
      return this.table(this.tablePlan(value._type, name), value._position);
    }
    const targets = this.objectTargets(name);
    const object = value as Record<string, unknown>;
    const values = targets.map((target) =>
      this.prepare(target, object[target.name]),
    );
    return this.emit(this._to.tables[name].slots, targets, values);
  }

  private newVector(element: ElementType, value: unknown, key: string) {
    if (value instanceof VectorView) {
      return this.movedVector(element, value, key);
    }
    switch (element.kind) {
      case "scalar": {
        const TypedArray = scalarArrayOf(element.scalar);
        const array: ScalarArray =
          value instanceof TypedArray
            ? value
            : (TypedArray as any).from(value, (item: unknown) =>
                toNumber(element.scalar, item),
              );
        const bytes = new Uint8Array(
          array.buffer,
          array.byteOffset,
          array.byteLength,
        );
        const { size } = element;
        return this.rawVector(bytes, size, array.length, size);
      }
      case "struct": {
        const items = Array.from(value as Iterable<unknown>);
        const { size, align } = this._to.structs[element.name];
        const out = allocate(items.length * size);
        for (let i = 0; i < items.length; i++) {
          this.encode(element, items[i], out, i * size);
        }
        return this.rawVector(out.bytes, size, items.length, align);
      }
      case "string": {
        const items = Array.from(value as Iterable<unknown>);
        return this.offsetsVector(items.map((item) => this.newString(item)));
      }
      default: {
        const items = Array.from(value as Iterable<unknown>);
        return this.offsetsVector(
          items.map((item) => this.newTable(element.name, item)),
        );
      }
    }
  }

  /** A vector of the old file that a handler returned, to be put elsewhere. */
  private movedVector(
    element: ElementType,
    value: VectorView<unknown>,
    key: string,
  ) {
    const old = value._element;
    if (!canCarry(this._from, this._to, old, element)) {
      throw new Error(
        `Fragments: the handler of "${key}" returned a vector that does not fit the field.`,
      );
    }
    const plans: Source = { vtableOffset: 0, type: old, fallback: undefined };
    if (old.kind === "table" && element.kind === "table") {
      plans.table = this.tablePlan(old.name, element.name);
    }
    if (old.kind === "struct" && element.kind === "struct") {
      plans.struct = this.structPlan(old.name, element.name);
    }
    return this.vector(element, plans, value._position);
  }

  /** Writes a scalar or a struct a handler returned into a struct or a vector. */
  private encode(type: ElementType, value: unknown, out: Bytes, at: number) {
    if (type.kind === "scalar") {
      writeNumber(out.view, at, type.scalar, value);
      return;
    }
    if (type.kind !== "struct") {
      throw new Error("Fragments: a struct holds only scalars and structs.");
    }
    if (value instanceof StructView) {
      const plan = this.structPlan(value._type, type.name);
      if (plan.same) {
        const start = value._position;
        const bytes = this._reader.bytes.subarray(start, start + plan.size);
        out.bytes.set(bytes, at);
      } else {
        this.convertStruct(plan, value._position, out, at);
      }
      return;
    }
    const { fields } = this._to.structs[type.name];
    const object = value as Record<string, unknown>;
    for (const name in fields) {
      const field = fields[name];
      const fieldType = resolveType(this._to, field.type) as ElementType;
      this.encode(fieldType, object[name], out, at + field.offset);
    }
  }

  // Writing to the builder

  private emit(slots: number, targets: Target[], values: unknown[]) {
    const builder = this._builder;
    builder.startObject(slots);
    for (let i = 0; i < targets.length; i++) {
      const value = values[i];
      if (value === undefined) continue;
      const target = targets[i];
      const { type, slot } = target;
      if (type.kind === "scalar") {
        this.addScalar(slot, type.scalar, value, target.fallback);
      } else if (type.kind === "struct") {
        builder.prep(target.align, target.size);
        this.raw(value as Uint8Array);
        builder.addFieldStruct(slot, builder.offset(), 0);
      } else {
        builder.addFieldOffset(slot, value as number, 0);
      }
    }
    return builder.endObject();
  }

  private addScalar(
    slot: number,
    scalar: ScalarName,
    value: unknown,
    fallback: number | bigint | null,
  ) {
    const builder = this._builder;
    const number = value as number;
    const unless = fallback as number | null;
    switch (scalar) {
      case "bool":
      case "byte":
      case "ubyte":
        builder.addFieldInt8(slot, number, unless);
        break;
      case "short":
      case "ushort":
        builder.addFieldInt16(slot, number, unless);
        break;
      case "int":
      case "uint":
        builder.addFieldInt32(slot, number, unless);
        break;
      case "long":
      case "ulong":
        builder.addFieldInt64(slot, value as bigint, fallback as bigint | null);
        break;
      case "float":
        builder.addFieldFloat32(slot, number, unless);
        break;
      default:
        builder.addFieldFloat64(slot, number, unless);
    }
  }

  /**
   * Writes bytes as they are, the way the builder's own `createByteVector`
   * does. The builder exposes no bulk write for wider elements, so this
   * reaches for the two fields it needs.
   */
  private raw(bytes: Uint8Array) {
    const internals = this._builder as unknown as BuilderInternals;
    internals.space -= bytes.length;
    internals.bb.setPosition(internals.space);
    internals.bb.bytes().set(bytes, internals.space);
  }

  private rawVector(
    bytes: Uint8Array,
    size: number,
    length: number,
    align: number,
  ) {
    const builder = this._builder;
    builder.startVector(size, length, align);
    this.raw(bytes);
    return builder.endVector();
  }

  private offsetsVector(offsets: ArrayLike<number>) {
    const builder = this._builder;
    builder.startVector(4, offsets.length, 4);
    for (let i = offsets.length - 1; i >= 0; i--) {
      builder.addOffset(offsets[i]);
    }
    return builder.endVector();
  }
}
