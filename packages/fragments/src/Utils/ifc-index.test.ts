import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { IfcLineIndexBuilder } from "./ifc-index";
import { IfcStatementScanner } from "./ifc-scanner";
import { streamAsyncIterator } from "./ifc-stream";

const build = (entries: [id: number, type: string][]) => {
  const builder = new IfcLineIndexBuilder();
  let offset = 0;
  for (const [id, type] of entries) {
    const length = `#${id}=${type}();`.length;
    builder.add({ id, type, offset, length });
    offset += length + 1;
  }
  return builder.finalize();
};

test("looks up offset, length, and type by id", () => {
  const index = build([
    [1, "IFCWALL"],
    [7, "IFCSLAB"],
    [9, "IFCWALL"],
  ]);

  expect(index.count).toBe(3);
  expect(index.maxId).toBe(9);
  expect(index.getType(7)).toBe("IFCSLAB");
  expect(index.getOffset(1)).toBe(0);
  expect(index.getLength(1)).toBe("#1=IFCWALL();".length);
  expect(index.has(7)).toBe(true);
});

test("reports ids it has no statement for", () => {
  const index = build([
    [1, "IFCWALL"],
    [9, "IFCSLAB"],
  ]);
  expect(index.indexOf(5)).toBe(-1);
  expect(index.has(5)).toBe(false);
  expect(index.getType(5)).toBeUndefined();
  expect(index.getOffset(5)).toBeUndefined();
  // outside the range entirely, on both sides
  expect(index.has(0)).toBe(false);
  expect(index.has(1000)).toBe(false);
});

test("is empty, not broken, with nothing added", () => {
  const index = new IfcLineIndexBuilder().finalize();
  expect(index.count).toBe(0);
  expect(index.maxId).toBe(0);
  expect(index.has(1)).toBe(false);
  expect(index.indexOf(1)).toBe(-1);
});

test("sorts ids that arrive out of order", () => {
  const builder = new IfcLineIndexBuilder();
  builder.add({ id: 9, type: "IFCWALL", offset: 90, length: 9 });
  builder.add({ id: 1, type: "IFCSLAB", offset: 10, length: 5 });
  builder.add({ id: 5, type: "IFCBEAM", offset: 50, length: 7 });
  const index = builder.finalize();

  expect([0, 1, 2].map((i) => index.idAt(i))).toEqual([1, 5, 9]);
  expect(index.maxId).toBe(9);
  // the other columns travel with the ids
  expect(index.getOffset(9)).toBe(90);
  expect(index.getLength(9)).toBe(9);
  expect(index.getType(1)).toBe("IFCSLAB");
  expect(index.getOffset(5)).toBe(50);
});

test("rejects a duplicate express id", () => {
  const builder = new IfcLineIndexBuilder();
  builder.add({ id: 3, type: "IFCWALL", offset: 0, length: 5 });
  builder.add({ id: 3, type: "IFCSLAB", offset: 10, length: 5 });
  expect(() => builder.finalize()).toThrow("Duplicate Ifc entity id #3");
});

test("spends the builder on finalize", () => {
  const builder = new IfcLineIndexBuilder();
  builder.add({ id: 1, type: "IFCWALL", offset: 0, length: 5 });
  const index = builder.finalize();

  expect(() =>
    builder.add({ id: 2, type: "IFCSLAB", offset: 6, length: 5 }),
  ).toThrow("finalized");
  // finalizing again hands back the same index rather than rebuilding one
  expect(builder.finalize()).toBe(index);
});

test("grows past its initial capacity", () => {
  const builder = new IfcLineIndexBuilder();
  const total = 10_000; // initial capacity is 4096
  for (let id = 1; id <= total; id++) {
    builder.add({ id, type: "IFCWALL", offset: id * 10, length: 9 });
  }
  expect(builder.count).toBe(total);
  const index = builder.finalize();

  expect(index.count).toBe(total);
  expect(index.getOffset(1)).toBe(10);
  expect(index.getOffset(total)).toBe(total * 10);
  expect(index.has(total + 1)).toBe(false);
});

test("interns type names into codes", () => {
  const index = build([
    [1, "IFCWALL"],
    [2, "IFCSLAB"],
    [3, "IFCWALL"],
  ]);
  expect(index.typeAt(0)).toBe("IFCWALL");
  expect(index.typeCodeAt(0)).toBe(index.typeCodeAt(2));
  expect(index.typeCodeAt(0)).not.toBe(index.typeCodeAt(1));
  expect(index.codeOf("IFCWALL")).toBe(index.typeCodeAt(0));
  // a type the file never used
  expect(index.codeOf("IFCBEAM")).toBe(0);
});

test("collects every id of the requested types", () => {
  const index = build([
    [1, "IFCWALL"],
    [2, "IFCSLAB"],
    [3, "IFCWALL"],
    [4, "IFCBEAM"],
  ]);
  expect([...index.getAll(new Set(["IFCWALL", "IFCBEAM"]))]).toEqual([1, 3, 4]);
  expect([...index.getAll(new Set(["IFCNOPE"]))]).toEqual([]);
});

test("slices a statement out of an in-memory source", () => {
  const text = "#1=IFCWALL();\n#7=IFCSLAB();\n";
  const source = new TextEncoder().encode(text);
  const builder = new IfcLineIndexBuilder();
  builder.add({ id: 1, type: "IFCWALL", offset: 0, length: 13 });
  builder.add({ id: 7, type: "IFCSLAB", offset: 14, length: 13 });
  const index = builder.finalize();

  expect(new TextDecoder().decode(index.slice(source, 7)!)).toBe(
    "#7=IFCSLAB();",
  );
  expect(index.slice(source, 5)).toBeUndefined();
});

// ---------------------------------------------------------------------------
// End to end, against a real file
// ---------------------------------------------------------------------------

test("indexes a real IFC from the scanner and slices it back", async () => {
  const bytes = new Uint8Array(
    readFileSync(
      new URL("../../../../resources/ifc/school_str.ifc", import.meta.url),
    ),
  );
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += 64 * 1024) {
        controller.enqueue(bytes.subarray(i, i + 64 * 1024));
      }
      controller.close();
    },
  });

  const builder = new IfcLineIndexBuilder();
  const expected = new Map<number, string>();
  const decoder = new TextDecoder();
  for await (const statement of streamAsyncIterator(
    source.pipeThrough(new IfcStatementScanner()),
  )) {
    if (!statement.id) continue;
    // a StatementRef is an IndexedStatement, so it goes straight in
    builder.add(statement);
    // keep a few to compare against, rather than all 93k
    if (statement.id % 10_000 === 0 || statement.id === 1) {
      expected.set(statement.id, decoder.decode(statement.bytes));
    }
  }
  const index = builder.finalize();

  expect(index.count).toBe(93491);
  expect(index.maxId).toBe(96460);
  expect(index.getType(1)).toBe("IFCORGANIZATION");

  // every sampled statement slices back out of the source byte-exactly
  for (const [id, text] of expected) {
    expect(decoder.decode(index.slice(bytes, id)!), `#${id}`).toBe(text);
  }

  // spot-check that lookups agree with a linear scan over the same data
  let mismatched = 0;
  for (let i = 0; i < index.count; i++) {
    const id = index.idAt(i);
    if (index.getOffset(id) !== index.offsetAt(i)) mismatched++;
    if (index.getType(id) !== index.typeAt(i)) mismatched++;
  }
  expect(mismatched).toBe(0);

  // ids the file does not define are reported as absent, not as neighbours
  expect(index.has(96461)).toBe(false);
  expect(index.indexOf(96461)).toBe(-1);
});
