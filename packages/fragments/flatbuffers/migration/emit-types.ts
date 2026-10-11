import {
  FieldType,
  ScalarName,
  SchemaDescriptor,
  resolveType,
} from "../../src/Migrations/src/layout/descriptor";
import type { SchemaChange, SchemaDiff } from "./diff";

const ARRAYS: Record<ScalarName, string> = {
  bool: "Uint8Array",
  byte: "Int8Array",
  ubyte: "Uint8Array",
  short: "Int16Array",
  ushort: "Uint16Array",
  int: "Int32Array",
  uint: "Uint32Array",
  long: "BigInt64Array",
  ulong: "BigUint64Array",
  float: "Float32Array",
  double: "Float64Array",
};

function scalarType(scalar: ScalarName) {
  if (scalar === "bool") return "boolean";
  if (scalar === "long" || scalar === "ulong") return "bigint";
  return "number";
}

const REASONS: Partial<Record<SchemaChange["kind"], string>> = {
  "field-removed": "Removed",
  "field-added": "New",
  "field-retyped": "Changed type",
};

/**
 * The `types.ts` of a migration: the shape of the old nodes its handlers
 * read, and one handler signature per field that changed. A field the copier
 * cannot carry on its own has to have one; a field that is merely new may
 * have one, to fill it in for old files. Only what changed gets a type of its
 * own: the nodes that own a changed field and what hangs from a field that
 * was removed or changed type. The rest of the old file is reachable from
 * them, untyped.
 */
export function emitTypes(
  from: SchemaDescriptor,
  to: SchemaDescriptor,
  diff: SchemaDiff,
): string {
  const obligations = diff.changes.filter(
    (change) => change.obligation || change.kind === "field-added",
  );
  const typed = new Set<string>();
  const used = new Set<string>();

  // Everything under a field that is gone or changed type: nothing else
  // describes those nodes any more.
  const reach = (type: FieldType) => {
    const element = type.kind === "vector" ? type.of : type;
    if (element.kind !== "table" && element.kind !== "struct") return;
    if (typed.has(element.name)) return;
    typed.add(element.name);
    const fields =
      element.kind === "table"
        ? from.tables[element.name].fields
        : from.structs[element.name].fields;
    for (const name in fields) {
      reach(resolveType(from, fields[name].type));
    }
  };

  for (const change of obligations) {
    const [owner, field] = change.path.split(".");
    const old = from.tables[owner] ?? from.structs[owner];
    if (!old) continue;
    typed.add(owner);
    const before = old.fields[field];
    if (before && change.kind !== "field-added") {
      reach(resolveType(from, before.type));
    }
  }

  const node = (name: string, fallback: string) => {
    if (typed.has(name)) return `From${name}`;
    used.add(fallback);
    return fallback;
  };

  const readType = (type: FieldType): string => {
    switch (type.kind) {
      case "scalar":
        return scalarType(type.scalar);
      case "string":
        return "string";
      case "struct":
        return node(type.name, "StructView");
      case "table":
        return node(type.name, "View");
      default: {
        if (type.of.kind === "scalar") return ARRAYS[type.of.scalar];
        used.add("Vector");
        return `Vector<${readType(type.of)}>`;
      }
    }
  };

  const writeType = (type: FieldType): string => {
    switch (type.kind) {
      case "scalar":
        return scalarType(type.scalar);
      case "string":
        return "string | Uint8Array";
      case "struct":
      case "table":
        used.add("Writable");
        return "Writable";
      default: {
        const { of } = type;
        if (of.kind === "scalar") {
          return `${ARRAYS[of.scalar]} | ${scalarType(of.scalar)}[]`;
        }
        return `Iterable<${writeType(of)}>`;
      }
    }
  };

  const interfaces: string[] = [];
  for (const name of [...typed].sort()) {
    const lines: string[] = [];
    const table = from.tables[name];
    if (table) {
      used.add("View");
      lines.push(`export interface From${name} extends View {`);
      for (const field in table.fields) {
        const descriptor = table.fields[field];
        const type = resolveType(from, descriptor.type);
        const always = type.kind === "scalar" && !descriptor.optional;
        const absent = always ? "" : " | null";
        lines.push(`  readonly ${field}: ${readType(type)}${absent};`);
      }
    } else {
      used.add("StructView");
      lines.push(`export interface From${name} extends StructView {`);
      const { fields } = from.structs[name];
      for (const field in fields) {
        const type = resolveType(from, fields[field].type);
        lines.push(`  readonly ${field}: ${readType(type)};`);
      }
    }
    lines.push("}");
    interfaces.push(lines.join("\n"));
  }

  const handlers: string[] = [];
  for (const change of obligations) {
    const [owner, field] = change.path.split(".");
    const old = from.tables[owner] ?? from.structs[owner];
    const nodeType = old ? `From${owner}` : "unknown";
    let returns: string;
    let spelled: string;
    if (change.kind === "field-removed") {
      used.add("Drop");
      returns = "Drop";
      spelled = old.fields[field].type;
    } else {
      const table = to.tables[owner];
      const descriptor = (table ?? to.structs[owner]).fields[field];
      spelled = descriptor.type;
      returns = writeType(resolveType(to, descriptor.type));
      const optional = table && !table.fields[field].required;
      if (optional) returns += " | null";
    }
    const required = to.tables[owner]?.fields[field]?.required;
    const reason = `${REASONS[change.kind]}${required ? " and required" : ""}`;
    const key = change.obligation ? `"${change.path}"` : `"${change.path}"?`;
    handlers.push(
      `  /** ${reason}: \`${field}: ${spelled}\`. */\n` +
        `  ${key}: (node: ${nodeType}, ctx: Ctx) => ${returns};`,
    );
  }

  const fromTypes = ["StructView", "Vector", "View", "Writable"].filter(
    (name) => used.has(name),
  );
  const imports: string[] = [];
  if (used.has("Drop")) {
    imports.push(`import type { Drop } from "../../src/drop";`);
  }
  if (fromTypes.length > 0) {
    imports.push(
      `import type { ${fromTypes.join(", ")} } from "../../src/types";`,
    );
  }

  return [
    "/* eslint-disable no-use-before-define */\n" +
      "// Generated by `yarn migration:new` from diff.json. Do not edit.",
    imports.join("\n"),
    ...interfaces,
    "/**\n * One handler per field that changed. The optional ones are new fields that\n * old files simply lack unless a handler fills them in.\n */\n" +
      `export interface Handlers<Ctx> {\n${handlers.join("\n")}\n}`,
  ].join("\n\n");
}
