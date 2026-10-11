export type ScalarName =
  | "bool"
  | "byte"
  | "ubyte"
  | "short"
  | "ushort"
  | "int"
  | "uint"
  | "long"
  | "ulong"
  | "float"
  | "double";

export interface EnumDescriptor {
  type: ScalarName;
  values: Record<string, number>;
}

export interface StructFieldDescriptor {
  offset: number;
  type: string;
}

export interface StructDescriptor {
  size: number;
  align: number;
  fields: Record<string, StructFieldDescriptor>;
}

export interface TableFieldDescriptor {
  slot: number;
  type: string;
  /** Default of a scalar when it is not zero. */
  default?: number | string;
  /** A scalar declared `= null`: absent is different from its default. */
  optional?: boolean;
  required?: boolean;
}

export interface TableDescriptor {
  /** Number of vtable slots, deprecated ones included. */
  slots: number;
  fields: Record<string, TableFieldDescriptor>;
}

/**
 * The binary layout of one version of the fragments schema, as data. It is
 * what lets this package read a file written with a schema it no longer has
 * generated code for. `yarn migration:new` writes one per schema change, as
 * `schema.json` next to the migration.
 *
 * Types are spelled the way the schema spells them: `uint`, `string`,
 * `Meshes`, `[FloatVector]`.
 */
export interface SchemaDescriptor {
  /** `file_identifier` of the schema. No writer in this package emits it. */
  identifier: string;
  /** Name of the root table. */
  root: string;
  enums: Record<string, EnumDescriptor>;
  structs: Record<string, StructDescriptor>;
  tables: Record<string, TableDescriptor>;
}

export const SCALAR_SIZES: Record<ScalarName, number> = {
  bool: 1,
  byte: 1,
  ubyte: 1,
  short: 2,
  ushort: 2,
  int: 4,
  uint: 4,
  long: 8,
  ulong: 8,
  float: 4,
  double: 8,
};

export type ElementType =
  | { kind: "scalar"; scalar: ScalarName; size: number; enum?: string }
  | { kind: "string" }
  | { kind: "struct"; name: string }
  | { kind: "table"; name: string };

export type FieldType = ElementType | { kind: "vector"; of: ElementType };

function resolveElement(schema: SchemaDescriptor, type: string): ElementType {
  if (type === "string") {
    return { kind: "string" };
  }
  if (type in SCALAR_SIZES) {
    const scalar = type as ScalarName;
    return { kind: "scalar", scalar, size: SCALAR_SIZES[scalar] };
  }
  if (type in schema.enums) {
    const scalar = schema.enums[type].type;
    return { kind: "scalar", scalar, size: SCALAR_SIZES[scalar], enum: type };
  }
  if (type in schema.structs) {
    return { kind: "struct", name: type };
  }
  if (type in schema.tables) {
    return { kind: "table", name: type };
  }
  throw new Error(`Fragments: unknown type "${type}" in a schema descriptor`);
}

/** Resolves a type as the schema spells it against the schema it comes from. */
export function resolveType(schema: SchemaDescriptor, type: string): FieldType {
  if (type.startsWith("[")) {
    return { kind: "vector", of: resolveElement(schema, type.slice(1, -1)) };
  }
  return resolveElement(schema, type);
}

/**
 * Whether an enum of the old schema can be read as the same-named enum of the
 * new one: same storage, and every old value kept its number.
 */
function sameEnum(
  from: SchemaDescriptor,
  to: SchemaDescriptor,
  fromName: string | undefined,
  toName: string | undefined,
) {
  if (fromName === undefined || toName === undefined) {
    return true;
  }
  const a = from.enums[fromName];
  const b = to.enums[toName];
  for (const name in a.values) {
    if (b.values[name] !== a.values[name]) {
      return false;
    }
  }
  return true;
}

/** Whether a struct has the same bytes in both schemas. */
export function sameStructLayout(
  from: SchemaDescriptor,
  to: SchemaDescriptor,
  fromName: string,
  toName: string,
): boolean {
  const a = from.structs[fromName];
  const b = to.structs[toName];
  if (a.size !== b.size || a.align !== b.align) {
    return false;
  }
  const names = Object.keys(a.fields);
  if (names.length !== Object.keys(b.fields).length) {
    return false;
  }
  for (const name of names) {
    const fa = a.fields[name];
    const fb = b.fields[name];
    if (!fb || fa.offset !== fb.offset) {
      return false;
    }
    const ta = resolveElement(from, fa.type);
    const tb = resolveElement(to, fb.type);
    // eslint-disable-next-line no-use-before-define
    if (!sameElementBytes(from, to, ta, tb)) {
      return false;
    }
  }
  return true;
}

/**
 * Whether a value of the old type is, byte for byte, a value of the new type.
 * Tables never are: they are always copied field by field, by name.
 */
export function sameElementBytes(
  from: SchemaDescriptor,
  to: SchemaDescriptor,
  a: ElementType,
  b: ElementType,
): boolean {
  if (a.kind === "scalar" && b.kind === "scalar") {
    return a.scalar === b.scalar && sameEnum(from, to, a.enum, b.enum);
  }
  if (a.kind === "string" && b.kind === "string") {
    return true;
  }
  if (a.kind === "struct" && b.kind === "struct") {
    return sameStructLayout(from, to, a.name, b.name);
  }
  return false;
}

/**
 * Whether the copier can carry a field from the old type to the new one on
 * its own. When it cannot, the migration has to give a handler for the field:
 * that is what `diff.json` lists as an obligation.
 */
export function canCarry(
  from: SchemaDescriptor,
  to: SchemaDescriptor,
  a: FieldType,
  b: FieldType,
): boolean {
  if (a.kind === "vector" || b.kind === "vector") {
    if (a.kind !== "vector" || b.kind !== "vector") {
      return false;
    }
    return canCarry(from, to, a.of, b.of);
  }
  if (a.kind === "table" && b.kind === "table") {
    return a.name === b.name;
  }
  if (a.kind === "struct" && b.kind === "struct") {
    // A struct that changed is converted field by field, by name. The fields
    // that cannot be carried are obligations of their own.
    return a.name === b.name;
  }
  return sameElementBytes(from, to, a, b);
}
