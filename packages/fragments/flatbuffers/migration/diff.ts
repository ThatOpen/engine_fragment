import {
  SchemaDescriptor,
  canCarry,
  resolveType,
  sameStructLayout,
} from "../../src/Migrations/src/layout/descriptor";

export interface SchemaChange {
  kind:
    | "type-added"
    | "type-removed"
    | "enum-extended"
    | "enum-changed"
    | "field-added"
    | "field-removed"
    | "field-moved"
    | "field-retyped"
    | "default-changed"
    | "root-changed";
  /** `Type` or `Type.field`. */
  path: string;
  detail: string;
  /** A reader of the new schema misreads a file of the old one. */
  breaking: boolean;
  /** The copier cannot decide this one: the migration needs a handler for it. */
  obligation: boolean;
}

export interface SchemaDiff {
  /** Whether a file of the old schema has to be rewritten to be read. */
  rewrite: boolean;
  /** The fields the migration needs a handler for, as `Type.field`. */
  obligations: string[];
  changes: SchemaChange[];
}

/**
 * What changed between two versions of the schema, and which of it the
 * migration author has to decide. The rules for what the copier carries on
 * its own are the copier's (`canCarry`), so the obligations listed here are
 * exactly the handlers it asks for.
 */
export function diffSchemas(
  from: SchemaDescriptor,
  to: SchemaDescriptor,
): SchemaDiff {
  const changes: SchemaChange[] = [];
  const add = (
    kind: SchemaChange["kind"],
    path: string,
    detail: string,
    flags: { breaking?: boolean; obligation?: boolean } = {},
  ) => {
    changes.push({
      kind,
      path,
      detail,
      breaking: flags.breaking === true,
      obligation: flags.obligation === true,
    });
  };

  if (from.root !== to.root) {
    add("root-changed", to.root, `was ${from.root}`, { breaking: true });
  }

  for (const name in from.enums) {
    const before = from.enums[name];
    const after = to.enums[name];
    if (!after) {
      add("type-removed", name, "enum");
      continue;
    }
    const kept = Object.keys(before.values).every(
      (value) => after.values[value] === before.values[value],
    );
    if (before.type !== after.type || !kept) {
      add("enum-changed", name, "a value was removed or renumbered", {
        breaking: true,
      });
    } else if (
      Object.keys(after.values).length > Object.keys(before.values).length
    ) {
      add("enum-extended", name, "values were added");
    }
  }
  for (const name in to.enums) {
    if (!from.enums[name]) add("type-added", name, "enum");
  }

  for (const name in from.structs) {
    const before = from.structs[name];
    const after = to.structs[name];
    if (!after) {
      add("type-removed", name, "struct");
      continue;
    }
    if (sameStructLayout(from, to, name, name)) continue;
    for (const field in before.fields) {
      const old = before.fields[field];
      const path = `${name}.${field}`;
      const current = after.fields[field];
      if (!current) {
        add("field-removed", path, old.type, {
          breaking: true,
          obligation: true,
        });
        continue;
      }
      const a = resolveType(from, old.type);
      const b = resolveType(to, current.type);
      if (!canCarry(from, to, a, b)) {
        add("field-retyped", path, `${old.type} -> ${current.type}`, {
          breaking: true,
          obligation: true,
        });
      } else if (old.offset !== current.offset) {
        add("field-moved", path, `offset ${old.offset} -> ${current.offset}`, {
          breaking: true,
        });
      }
    }
    for (const field in after.fields) {
      if (before.fields[field]) continue;
      // A struct has no absent fields, so a new one always needs a value.
      add("field-added", `${name}.${field}`, after.fields[field].type, {
        breaking: true,
        obligation: true,
      });
    }
  }
  for (const name in to.structs) {
    if (!from.structs[name]) add("type-added", name, "struct");
  }

  for (const name in from.tables) {
    const before = from.tables[name];
    const after = to.tables[name];
    if (!after) {
      add("type-removed", name, "table");
      continue;
    }
    for (const field in before.fields) {
      const old = before.fields[field];
      const path = `${name}.${field}`;
      const current = after.fields[field];
      if (!current) {
        add("field-removed", path, old.type, {
          breaking: true,
          obligation: true,
        });
        continue;
      }
      const a = resolveType(from, old.type);
      const b = resolveType(to, current.type);
      if (!canCarry(from, to, a, b)) {
        add("field-retyped", path, `${old.type} -> ${current.type}`, {
          breaking: true,
          obligation: true,
        });
        continue;
      }
      if (old.slot !== current.slot) {
        add("field-moved", path, `slot ${old.slot} -> ${current.slot}`, {
          breaking: true,
        });
      }
      const sameDefault =
        old.default === current.default &&
        Boolean(old.optional) === Boolean(current.optional);
      if (!sameDefault) {
        // The copier writes the old value out, so this needs no handler.
        add("default-changed", path, "a value left out reads differently", {
          breaking: true,
        });
      }
    }
    for (const field in after.fields) {
      if (before.fields[field]) continue;
      const added = after.fields[field];
      // A field added past the old ones is what flatbuffers calls evolution:
      // old files just don't have it. One in an old slot would be read from
      // whatever the old file stored there.
      add("field-added", `${name}.${field}`, added.type, {
        breaking: added.slot < before.slots,
        obligation: added.required === true,
      });
    }
  }
  for (const name in to.tables) {
    if (!from.tables[name]) add("type-added", name, "table");
  }

  const obligations = changes
    .filter((change) => change.obligation)
    .map((change) => change.path);
  const rewrite =
    obligations.length > 0 || changes.some((change) => change.breaking);
  return { rewrite, obligations, changes };
}
