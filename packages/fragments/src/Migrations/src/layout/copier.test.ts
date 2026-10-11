import { readFile } from "fs/promises";
import * as path from "path";
import * as FB from "flatbuffers";
import pako from "pako";
import { describe, expect, test } from "vitest";
import * as TFB from "../../../Schema";
import { getObject } from "../../../Utils/flatbuffers-json-converter";
import { registry } from "../../registry";
import { MigrationObligationError } from "../errors";
import { drop } from "../drop";
import { Copier } from "./copier";
import { SchemaDescriptor } from "./descriptor";
import { Reader } from "./reader";

const repoRoot = path.resolve(import.meta.dirname, "../../../../../..");
const current = registry.steps.find(
  (step) => step.slug === "model-indexes",
)!.schema!;

const readFrag = async (name: string) => {
  const file = path.join(repoRoot, "resources", "frags", name);
  return pako.inflate(new Uint8Array(await readFile(file)));
};

/** Everything the generated accessors read from a file, as plain data. */
const dump = (bytes: Uint8Array) => {
  const model = TFB.Model.getRootAsModel(new FB.ByteBuffer(bytes));
  const result = {};
  getObject(model, result);
  return result;
};

describe("copying a file to its own layout", () => {
  // The copier reads and writes through a descriptor and the generated code
  // reads through flatc's output: the two have to agree on every field.
  test.each([
    "small_test.frag",
    "school_str.frag",
    "synthetic_large_grid.frag",
  ])(
    "%s reads the same through the generated code",
    async (name) => {
      const bytes = await readFrag(name);
      const copy = new Copier({ bytes, from: current, to: current }).run();
      expect(dump(copy)).toEqual(dump(bytes));
      // Vectors are read in place as typed arrays, so the file has to start
      // on an aligned byte of its buffer.
      expect(copy.byteOffset % 8).toBe(0);
      const model = TFB.Model.getRootAsModel(new FB.ByteBuffer(copy));
      expect(model.localIdsArray()!.length).toBe(model.localIdsLength());
      // The importer shares equal strings, and so must the copy.
      expect(copy.length).toBeLessThanOrEqual(bytes.length * 1.01);
    },
    60000,
  );

  test("a copy of a copy is the same bytes", async () => {
    const bytes = await readFrag("school_arq.frag");
    const once = new Copier({ bytes, from: current, to: current }).run();
    const twice = new Copier({ bytes: once, from: current, to: current }).run();
    expect(twice.length).toBe(once.length);
    expect(Buffer.compare(twice, once)).toBe(0);
  }, 60000);
});

const v1: SchemaDescriptor = {
  identifier: "TOY1",
  root: "Root",
  enums: { Kind: { type: "byte", values: { A: 0, B: 1 } } },
  structs: {
    Point: {
      size: 8,
      align: 4,
      fields: {
        x: { offset: 0, type: "float" },
        y: { offset: 4, type: "float" },
      },
    },
  },
  tables: {
    Root: {
      slots: 8,
      fields: {
        metadata: { slot: 0, type: "string" },
        count: { slot: 1, type: "ushort", default: 7 },
        legacy: { slot: 2, type: "[Child]" },
        origin: { slot: 3, type: "Point" },
        points: { slot: 4, type: "[Point]" },
        names: { slot: 5, type: "[string]" },
        kind: { slot: 6, type: "Kind" },
        big: { slot: 7, type: "ulong" },
      },
    },
    Child: {
      slots: 3,
      fields: {
        id: { slot: 0, type: "uint", optional: true },
        label: { slot: 1, type: "string" },
        weights: { slot: 2, type: "[double]" },
      },
    },
  },
};

const file = () =>
  Copier.write(v1, {
    metadata: "{}",
    legacy: [
      { id: 0, label: "first", weights: [1.5, 2.5] },
      { label: "second" },
    ],
    origin: { x: 1, y: 2 },
    points: [
      { x: 3, y: 4 },
      { x: 5, y: 6 },
    ],
    names: ["a", "b", "c"],
    kind: 1,
    big: 2n ** 40n,
  });

const evolve = (change: (schema: SchemaDescriptor) => void) => {
  const schema: SchemaDescriptor = JSON.parse(JSON.stringify(v1));
  change(schema);
  return schema;
};

const read = (bytes: Uint8Array, schema: SchemaDescriptor) =>
  new Reader(bytes, schema).root as any;

describe("writing and reading through a descriptor", () => {
  test("a file written from objects reads back", () => {
    const root = read(file(), v1);
    expect(root.metadata).toBe("{}");
    // Not stored: the default of the schema.
    expect(root.count).toBe(7);
    expect(root.kind).toBe(1);
    expect(root.big).toBe(2n ** 40n);
    expect([root.origin.x, root.origin.y]).toEqual([1, 2]);
    expect([...root.points].map((point: any) => [point.x, point.y])).toEqual([
      [3, 4],
      [5, 6],
    ]);
    expect([...root.names]).toEqual(["a", "b", "c"]);
    expect(root.legacy.length).toBe(2);
    // An optional scalar tells 0 from absent.
    expect(root.legacy.at(0).id).toBe(0);
    expect(root.legacy.at(1).id).toBeNull();
    expect(root.legacy.at(0).label).toBe("first");
    expect([...root.legacy.at(0).weights]).toEqual([1.5, 2.5]);
    expect(root.legacy.at(1).weights).toBeNull();
    expect(root.legacy.at(0).root).toBe(root.root);
  });
});

describe("copying to another layout", () => {
  test("a field that moved to another slot is carried by name", () => {
    const v2 = evolve((schema) => {
      const { fields } = schema.tables.Root;
      delete fields.legacy;
      fields.origin.slot = 2;
      fields.points.slot = 3;
      fields.names.slot = 4;
      fields.kind.slot = 5;
      fields.big.slot = 6;
      schema.tables.Root.slots = 7;
    });
    const seen: number[] = [];
    const out = new Copier({
      bytes: file(),
      from: v1,
      to: v2,
      handlers: {
        "Root.legacy": (root) => {
          seen.push(root.legacy.length);
          return drop;
        },
      },
    }).run();
    expect(seen).toEqual([2]);
    const root = read(out, v2);
    expect([...root.names]).toEqual(["a", "b", "c"]);
    expect([root.origin.x, root.origin.y]).toEqual([1, 2]);
    expect(root.points.length).toBe(2);
    expect(root.big).toBe(2n ** 40n);
    expect(root.count).toBe(7);
    // Read with the old layout the new file is wrong, which is the point.
    expect(() => [...read(out, v1).names]).toThrow();
  });

  test("a removed field needs a handler, and the handler has to drop it", () => {
    const v2 = evolve((schema) => {
      delete schema.tables.Root.fields.big;
      schema.tables.Root.slots = 7;
    });
    const bytes = file();
    expect(() => new Copier({ bytes, from: v1, to: v2 })).toThrow(
      MigrationObligationError,
    );
    const kept = new Copier({
      bytes,
      from: v1,
      to: v2,
      handlers: { "Root.big": () => 1 },
    });
    expect(() => kept.run()).toThrow(/must return drop/);
  });

  test("a struct that gained a field is converted, in a table and in a vector", () => {
    const v2 = evolve((schema) => {
      schema.structs.Point = {
        size: 12,
        align: 4,
        fields: {
          x: { offset: 0, type: "float" },
          z: { offset: 4, type: "float" },
          y: { offset: 8, type: "float" },
        },
      };
    });
    const bytes = file();
    expect(() => new Copier({ bytes, from: v1, to: v2 })).toThrow(
      /"Point.z" is new/,
    );
    const out = new Copier({
      bytes,
      from: v1,
      to: v2,
      handlers: { "Point.z": (point) => point.x + point.y },
    }).run();
    const root = read(out, v2);
    expect([root.origin.x, root.origin.y, root.origin.z]).toEqual([1, 2, 3]);
    expect(
      [...root.points].map((point: any) => [point.x, point.y, point.z]),
    ).toEqual([
      [3, 4, 7],
      [5, 6, 11],
    ]);
  });

  test("a field that changed type takes what its handler returns", () => {
    const v2 = evolve((schema) => {
      schema.tables.Root.fields.count = { slot: 1, type: "uint" };
      schema.tables.Root.fields.names.type = "[uint]";
    });
    const bytes = file();
    expect(() => new Copier({ bytes, from: v1, to: v2 })).toThrow(
      /"Root.count" changed type from ushort/,
    );
    const out = new Copier({
      bytes,
      from: v1,
      to: v2,
      handlers: {
        "Root.count": (root) => root.count,
        "Root.names": (root) =>
          [...root.names].map((name: string) => name.charCodeAt(0)),
      },
    }).run();
    const root = read(out, v2);
    // The old default was 7 and the old file relied on it.
    expect(root.count).toBe(7);
    expect([...root.names]).toEqual([97, 98, 99]);
  });

  test("a value left to an old default is written out when the default changes", () => {
    const v2 = evolve((schema) => {
      delete schema.tables.Root.fields.count.default;
    });
    const out = new Copier({ bytes: file(), from: v1, to: v2 }).run();
    expect(read(out, v2).count).toBe(7);
  });

  test("a handler can build a table, move a node of the old file, and use ctx", () => {
    const v2 = evolve((schema) => {
      const { fields } = schema.tables.Root;
      delete fields.legacy;
      fields.first = { slot: 2, type: "Child" };
      fields.made = { slot: 8, type: "[Child]" };
      fields.moved = { slot: 9, type: "[Point]" };
      schema.tables.Root.slots = 10;
    });
    const ctx = { labels: [] as string[] };
    const out = new Copier({
      bytes: file(),
      from: v1,
      to: v2,
      ctx,
      handlers: {
        "Root.legacy": (root, state) => {
          for (const child of root.legacy) state.labels.push(child.label);
          return drop;
        },
        "Root.first": (root) => root.legacy.at(0),
        "Root.made": (_root, state) =>
          state.labels.map((label: string, id: number) => ({ id, label })),
        "Root.moved": (root) => root.points,
      },
    }).run();
    const root = read(out, v2);
    expect(ctx.labels).toEqual(["first", "second"]);
    expect(root.first.label).toBe("first");
    expect([...root.first.weights]).toEqual([1.5, 2.5]);
    expect([...root.made].map((child: any) => [child.id, child.label])).toEqual(
      [
        [0, "first"],
        [1, "second"],
      ],
    );
    expect([...root.moved].map((point: any) => point.x)).toEqual([3, 5]);
  });

  test("an enum that renumbered a value needs a handler", () => {
    const v2 = evolve((schema) => {
      schema.enums.Kind.values = { A: 0, B: 2 };
    });
    const bytes = file();
    expect(() => new Copier({ bytes, from: v1, to: v2 })).toThrow(
      /"Root.kind" changed type from Kind/,
    );
    const out = new Copier({
      bytes,
      from: v1,
      to: v2,
      handlers: { "Root.kind": (root) => (root.kind === 1 ? 2 : root.kind) },
    }).run();
    expect(read(out, v2).kind).toBe(2);
  });

  test("a handler for a field of neither layout is a mistake", () => {
    const make = () =>
      new Copier({
        bytes: file(),
        from: v1,
        to: v1,
        handlers: { "Root.nmes": () => [] },
      });
    expect(make).toThrow(/a field of neither layout/);
  });
});
