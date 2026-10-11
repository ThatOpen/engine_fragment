import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { flatc, resolveReflectionSchema } from "../flatc.mjs";
import type {
  ScalarName,
  SchemaDescriptor,
} from "../../src/Migrations/src/layout/descriptor";

// A compiled schema (.bfbs) printed as JSON by flatc, as far as it is used.
interface ReflectedType {
  base_type: string;
  element: string;
  index: number;
}

interface ReflectedField {
  name: string;
  type: ReflectedType;
  id: number;
  offset: number;
  default_integer: number;
  default_real: number;
  deprecated: boolean;
  required: boolean;
  optional: boolean;
}

interface ReflectedObject {
  name: string;
  fields: ReflectedField[];
  is_struct: boolean;
  minalign: number;
  bytesize: number;
}

interface ReflectedEnum {
  name: string;
  values: { name: string; value: number }[];
  is_union: boolean;
  underlying_type: ReflectedType;
}

interface ReflectedSchema {
  objects: ReflectedObject[];
  enums: ReflectedEnum[];
  file_ident: string;
  root_table: { name: string };
}

const SCALARS: Record<string, ScalarName> = {
  Bool: "bool",
  Byte: "byte",
  UByte: "ubyte",
  Short: "short",
  UShort: "ushort",
  Int: "int",
  UInt: "uint",
  Long: "long",
  ULong: "ulong",
  Float: "float",
  Double: "double",
};

function spell(schema: ReflectedSchema, type: ReflectedType, owner: string) {
  const one = (base: string) => {
    if (base in SCALARS) {
      // A scalar with an index is an enum, stored as that scalar.
      return type.index >= 0 ? schema.enums[type.index].name : SCALARS[base];
    }
    if (base === "String") {
      return "string";
    }
    if (base === "Obj") {
      return schema.objects[type.index].name;
    }
    throw new Error(
      `${owner} is a ${base}, which migrations do not support yet.`,
    );
  };
  if (type.base_type === "Vector") {
    return `[${one(type.element)}]`;
  }
  return one(type.base_type);
}

function toDescriptor(schema: ReflectedSchema): SchemaDescriptor {
  const descriptor: SchemaDescriptor = {
    identifier: schema.file_ident,
    root: schema.root_table.name,
    enums: {},
    structs: {},
    tables: {},
  };

  for (const reflected of schema.enums) {
    if (reflected.is_union) {
      throw new Error(
        `${reflected.name} is a union, which migrations do not support yet.`,
      );
    }
    const values: Record<string, number> = {};
    for (const { name, value } of reflected.values) {
      values[name] = value;
    }
    const type = SCALARS[reflected.underlying_type.base_type];
    descriptor.enums[reflected.name] = { type, values };
  }

  for (const object of schema.objects) {
    const owner = (field: ReflectedField) => `${object.name}.${field.name}`;
    if (object.is_struct) {
      const fields: SchemaDescriptor["structs"][string]["fields"] = {};
      const sorted = [...object.fields].sort((a, b) => a.offset - b.offset);
      for (const field of sorted) {
        fields[field.name] = {
          offset: field.offset,
          type: spell(schema, field.type, owner(field)),
        };
      }
      descriptor.structs[object.name] = {
        size: object.bytesize,
        align: object.minalign,
        fields,
      };
      continue;
    }
    const fields: SchemaDescriptor["tables"][string]["fields"] = {};
    const sorted = [...object.fields].sort((a, b) => a.id - b.id);
    for (const field of sorted) {
      // A deprecated field keeps its slot and has no accessor: it counts in
      // `slots` and is otherwise not there.
      if (field.deprecated) continue;
      const type = spell(schema, field.type, owner(field));
      const entry: (typeof fields)[string] = { slot: field.id, type };
      const base = field.type.base_type;
      if (base in SCALARS) {
        if (field.optional) {
          entry.optional = true;
        } else if (base === "Float" || base === "Double") {
          if (field.default_real !== 0) entry.default = field.default_real;
        } else if (field.default_integer !== 0) {
          const wide = base === "Long" || base === "ULong";
          entry.default = wide
            ? String(field.default_integer)
            : field.default_integer;
        }
      }
      if (field.required) {
        entry.required = true;
      }
      fields[field.name] = entry;
    }
    descriptor.tables[object.name] = { slots: object.fields.length, fields };
  }

  return descriptor;
}

/** The layout descriptor of a schema file, read off what flatc compiles it to. */
export async function describeSchema(fbs: string): Promise<SchemaDescriptor> {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "fragments-schema-"));
  try {
    const name = path.basename(fbs, ".fbs");
    await flatc(["--binary", "--schema", "-o", out, path.resolve(fbs)]);
    const reflection = await resolveReflectionSchema();
    const compiled = path.join(out, `${name}.bfbs`);
    await flatc([
      "--json",
      "--strict-json",
      "--defaults-json",
      "--raw-binary",
      "-o",
      out,
      reflection,
      "--",
      compiled,
    ]);
    const json = fs.readFileSync(path.join(out, `${name}.json`), "utf8");
    return toDescriptor(JSON.parse(json));
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
}

/** Whether flatc accepts the new schema as an evolution of the old one. */
export async function conforms(oldFbs: string, newFbs: string) {
  try {
    await flatc(["--conform", path.resolve(oldFbs), path.resolve(newFbs)]);
    return { ok: true, message: "" };
  } catch (error: any) {
    const message = String(error.stderr || error.stdout || error.message);
    return { ok: false, message: message.trim() };
  }
}
