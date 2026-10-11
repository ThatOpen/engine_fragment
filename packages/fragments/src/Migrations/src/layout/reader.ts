/* eslint-disable max-classes-per-file, no-use-before-define */
import {
  ElementType,
  FieldType,
  ScalarName,
  SchemaDescriptor,
  resolveType,
} from "./descriptor";

const TYPED_ARRAYS = {
  bool: Uint8Array,
  byte: Int8Array,
  ubyte: Uint8Array,
  short: Int16Array,
  ushort: Uint16Array,
  int: Int32Array,
  uint: Uint32Array,
  long: BigInt64Array,
  ulong: BigUint64Array,
  float: Float32Array,
  double: Float64Array,
} as const;

export type ScalarArray = InstanceType<
  (typeof TYPED_ARRAYS)[keyof typeof TYPED_ARRAYS]
>;

/** The typed array a vector of this scalar is read into and written from. */
export function scalarArrayOf(scalar: ScalarName) {
  return TYPED_ARRAYS[scalar];
}

/** Reads a scalar as a number, a boolean as 0 or 1. */
export function readNumber(
  view: DataView,
  position: number,
  scalar: ScalarName,
): number | bigint {
  switch (scalar) {
    case "bool":
    case "ubyte":
      return view.getUint8(position);
    case "byte":
      return view.getInt8(position);
    case "short":
      return view.getInt16(position, true);
    case "ushort":
      return view.getUint16(position, true);
    case "int":
      return view.getInt32(position, true);
    case "uint":
      return view.getUint32(position, true);
    case "long":
      return view.getBigInt64(position, true);
    case "ulong":
      return view.getBigUint64(position, true);
    case "float":
      return view.getFloat32(position, true);
    default:
      return view.getFloat64(position, true);
  }
}

/**
 * A node of a fragments file read through a {@link SchemaDescriptor}: every
 * field of its table is a property, named as the schema names it.
 */
export class TableView {
  /** @internal */
  readonly _reader: Reader;
  /** @internal */
  readonly _position: number;
  /** @internal Set on the prototype of each table's class. */
  declare readonly _type: string;

  constructor(reader: Reader, position: number) {
    this._reader = reader;
    this._position = position;
  }

  /** The root table of the file this node belongs to. */
  get root(): TableView {
    return this._reader.root;
  }
}

/** A struct of a fragments file. Every field is a property. */
export class StructView {
  /** @internal */
  readonly _reader: Reader;
  /** @internal */
  readonly _position: number;
  /** @internal Set on the prototype of each struct's class. */
  declare readonly _type: string;

  constructor(reader: Reader, position: number) {
    this._reader = reader;
    this._position = position;
  }
}

/** A vector of strings, structs or tables of a fragments file. */
export class VectorView<T> implements Iterable<T> {
  readonly length: number;
  /** @internal */
  readonly _reader: Reader;
  /** @internal Position of the vector, where its length is stored. */
  readonly _position: number;
  /** @internal */
  readonly _element: ElementType;

  constructor(reader: Reader, position: number, element: ElementType) {
    this._reader = reader;
    this._position = position;
    this._element = element;
    this.length = reader.view.getUint32(position, true);
  }

  at(index: number): T | undefined {
    if (index < 0 || index >= this.length) {
      return undefined;
    }
    return this._reader.element(this._position, index, this._element) as T;
  }

  *[Symbol.iterator](): Iterator<T> {
    for (let i = 0; i < this.length; i++) {
      yield this._reader.element(this._position, i, this._element) as T;
    }
  }
}

type TableClass = new (reader: Reader, position: number) => TableView;
type StructClass = new (reader: Reader, position: number) => StructView;

/** Reads a raw (inflated) fragments file through the layout it was written with. */
export class Reader {
  readonly bytes: Uint8Array;
  readonly view: DataView;
  readonly schema: SchemaDescriptor;

  private readonly _decoder = new TextDecoder();
  private readonly _tables = new Map<string, TableClass>();
  private readonly _structs = new Map<string, StructClass>();
  private _root?: TableView;

  constructor(bytes: Uint8Array, schema: SchemaDescriptor) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.schema = schema;
  }

  get rootPosition() {
    return this.view.getUint32(0, true);
  }

  get root(): TableView {
    if (!this._root) {
      this._root = this.table(this.schema.root, this.rootPosition);
    }
    return this._root;
  }

  /**
   * Position of a field of a table, or 0 when the table does not have it.
   * @param vtableOffset - `4 + 2 * slot`.
   */
  fieldPosition(table: number, vtableOffset: number) {
    const { view } = this;
    const vtable = table - view.getInt32(table, true);
    if (vtableOffset >= view.getUint16(vtable, true)) {
      return 0;
    }
    const offset = view.getUint16(vtable + vtableOffset, true);
    return offset === 0 ? 0 : table + offset;
  }

  /** Follows the offset stored at a position. */
  indirect(position: number) {
    return position + this.view.getUint32(position, true);
  }

  /** The bytes of the string stored at a position, not decoded. */
  stringBytes(position: number) {
    const length = this.view.getUint32(position, true);
    return this.bytes.subarray(position + 4, position + 4 + length);
  }

  string(position: number) {
    return this._decoder.decode(this.stringBytes(position));
  }

  table(name: string, position: number): TableView {
    return new (this.tableClass(name))(this, position);
  }

  struct(name: string, position: number): StructView {
    return new (this.structClass(name))(this, position);
  }

  /** A vector of scalars as a typed array, without copying when it is aligned. */
  scalars(vector: number, scalar: ScalarName): ScalarArray {
    const TypedArray = TYPED_ARRAYS[scalar];
    const length = this.view.getUint32(vector, true);
    const start = this.bytes.byteOffset + vector + 4;
    const size = TypedArray.BYTES_PER_ELEMENT;
    if (start % size === 0) {
      return new TypedArray(this.bytes.buffer, start, length);
    }
    const copy = this.bytes.slice(vector + 4, vector + 4 + length * size);
    return new TypedArray(copy.buffer);
  }

  /** The element of a vector of strings, structs or tables. */
  element(vector: number, index: number, type: ElementType) {
    const data = vector + 4;
    switch (type.kind) {
      case "string":
        return this.string(this.indirect(data + index * 4));
      case "table":
        return this.table(type.name, this.indirect(data + index * 4));
      case "struct": {
        const { size } = this.schema.structs[type.name];
        return this.struct(type.name, data + index * size);
      }
      default:
        return this.scalarValue(data + index * type.size, type.scalar);
    }
  }

  private scalarValue(position: number, scalar: ScalarName) {
    const value = readNumber(this.view, position, scalar);
    return scalar === "bool" ? value !== 0 : value;
  }

  /** What a field holds once it is known to be present, at `position`. */
  private value(position: number, type: FieldType) {
    switch (type.kind) {
      case "scalar":
        return this.scalarValue(position, type.scalar);
      case "string":
        return this.string(this.indirect(position));
      case "struct":
        return this.struct(type.name, position);
      case "table":
        return this.table(type.name, this.indirect(position));
      default: {
        const vector = this.indirect(position);
        if (type.of.kind === "scalar") {
          return this.scalars(vector, type.of.scalar);
        }
        return new VectorView(this, vector, type.of);
      }
    }
  }

  private tableClass(name: string) {
    let found = this._tables.get(name);
    if (found) {
      return found;
    }
    // Field names come from the schema, so each table gets a class of its own
    // with one getter per field.
    found = class extends TableView {};
    Object.defineProperty(found.prototype, "_type", { value: name });
    const { fields } = this.schema.tables[name];
    for (const field in fields) {
      const descriptor = fields[field];
      const type = resolveType(this.schema, descriptor.type);
      const vtableOffset = 4 + 2 * descriptor.slot;
      let absent: unknown = null;
      if (type.kind === "scalar" && !descriptor.optional) {
        absent = this.defaultOf(type.scalar, descriptor.default);
      }
      Object.defineProperty(found.prototype, field, {
        enumerable: true,
        get(this: TableView) {
          const reader = this._reader;
          const position = reader.fieldPosition(this._position, vtableOffset);
          return position === 0 ? absent : reader.value(position, type);
        },
      });
    }
    this._tables.set(name, found);
    return found;
  }

  private structClass(name: string) {
    let found = this._structs.get(name);
    if (found) {
      return found;
    }
    found = class extends StructView {};
    Object.defineProperty(found.prototype, "_type", { value: name });
    const { fields } = this.schema.structs[name];
    for (const field in fields) {
      const { offset, type: spelled } = fields[field];
      const type = resolveType(this.schema, spelled);
      Object.defineProperty(found.prototype, field, {
        enumerable: true,
        get(this: StructView) {
          return this._reader.value(this._position + offset, type);
        },
      });
    }
    this._structs.set(name, found);
    return found;
  }

  private defaultOf(scalar: ScalarName, value: number | string | undefined) {
    if (scalar === "bool") {
      return Boolean(value);
    }
    if (scalar === "long" || scalar === "ulong") {
      return BigInt(value ?? 0);
    }
    return Number(value ?? 0);
  }
}
