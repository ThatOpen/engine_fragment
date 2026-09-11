import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { IfcStatementScanner, StatementRef } from "./ifc-scanner";
import { streamAsyncIterator } from "./ifc-stream";

const encoder = new TextEncoder();

/** Feed `bytes` through the scanner in fixed-size chunks. */
const scanBytes = async (bytes: Uint8Array, chunkSize = bytes.length) => {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += chunkSize) {
        controller.enqueue(bytes.subarray(i, i + chunkSize));
      }
      controller.close();
    },
  });
  const out: StatementRef[] = [];
  for await (const statement of streamAsyncIterator(
    source.pipeThrough(new IfcStatementScanner()),
  )) {
    // `bytes` is a view into the live chunk, so snapshot it before moving on
    out.push({ ...statement, bytes: statement.bytes.slice() });
  }
  return out;
};

const scan = async (text: string, chunkSize?: number) =>
  scanBytes(encoder.encode(text), chunkSize);

const textOf = (statements: StatementRef[]) =>
  statements.map((s) => new TextDecoder().decode(s.bytes));

/**
 * Joins statements written without their trailing `;`. Tests that are about
 * statement framing itself spell the text out literally instead.
 */
const ifc = (...statements: string[]) =>
  statements.map((statement) => `${statement};`).join("\n");

// ---------------------------------------------------------------------------
// Framing
// ---------------------------------------------------------------------------

test("reports id, type, and byte span for entity statements", async () => {
  const text = ifc("#1=IFCWALL('a')", "#22=IFCSLAB(1.5)");
  const [wall, slab] = await scan(text);

  expect(wall).toMatchObject({ id: 1, type: "IFCWALL", offset: 0, length: 16 });
  expect(slab).toMatchObject({ id: 22, type: "IFCSLAB", offset: 17 });
  // the span is exactly the statement, `;` included
  expect(text.slice(wall.offset, wall.offset + wall.length)).toBe(
    "#1=IFCWALL('a');",
  );
  expect(text.slice(slab.offset, slab.offset + slab.length)).toBe(
    "#22=IFCSLAB(1.5);",
  );
});

test("reports non-entity statements with id 0 and no type", async () => {
  const statements = await scan(ifc("DATA", "FILE_SCHEMA(('IFC4'))", "ENDSEC"));
  expect(statements.map((s) => [s.id, s.type])).toEqual([
    [0, ""],
    [0, ""],
    [0, ""],
  ]);
  expect(textOf(statements)).toEqual([
    "DATA;",
    "FILE_SCHEMA(('IFC4'));",
    "ENDSEC;",
  ]);
});

test("accepts blanks around the id and the equals sign", async () => {
  const statements = await scan(ifc("#1 = IFCWALL($)", "#2\t=\tIFCSLAB($)"));
  expect(statements.map((s) => [s.id, s.type])).toEqual([
    [1, "IFCWALL"],
    [2, "IFCSLAB"],
  ]);
});

test("treats an id with no type name as a non-entity statement", async () => {
  const [only] = await scan("#1;");
  expect(only).toMatchObject({ id: 0, type: "" });
});

test("handles statements spanning and sharing physical lines", async () => {
  const statements = await scan(
    "#1=IFCFOO('a',\n  'b');\n#2=IFCBAR($); #3=IFCBAZ($);\n",
  );
  expect(statements.map((s) => s.id)).toEqual([1, 2, 3]);
  expect(textOf(statements)).toEqual([
    "#1=IFCFOO('a',\n  'b');", // the newline is kept: the span is byte-exact
    "#2=IFCBAR($);",
    "#3=IFCBAZ($);",
  ]);
});

test("skips blank lines and empty statements", async () => {
  const statements = await scan("\n\n  ;;\n#1=IFCWALL($);\n;\n");
  expect(statements.map((s) => s.id)).toEqual([1]);
});

// ---------------------------------------------------------------------------
// Comments and strings
// ---------------------------------------------------------------------------

test("drops comments that precede a statement from its span", async () => {
  const [statement] = await scan("/* a comment */ #1=IFCWALL($);");
  expect(new TextDecoder().decode(statement.bytes)).toBe("#1=IFCWALL($);");
  expect(statement.offset).toBe(16);
});

test("keeps comments that sit inside a statement", async () => {
  const [statement] = await scan("#1=IFCWALL(/* why */$);");
  expect(new TextDecoder().decode(statement.bytes)).toBe(
    "#1=IFCWALL(/* why */$);",
  );
  expect(statement).toMatchObject({ id: 1, type: "IFCWALL" });
});

test("ignores statement delimiters inside comments", async () => {
  const statements = await scan("/* ; #9=IFCNOPE($); */ #1=IFCWALL($);");
  expect(statements.map((s) => s.id)).toEqual([1]);
});

test("ignores a comment spanning lines", async () => {
  const statements = await scan("/* one\n two */ #1=IFCWALL($);");
  expect(statements.map((s) => s.id)).toEqual([1]);
});

test("ignores statement delimiters inside strings", async () => {
  const statements = await scan(
    ifc("#1=IFCWALL('a;b/*c*/#9')", "#2=IFCSLAB($)"),
  );
  expect(statements.map((s) => s.id)).toEqual([1, 2]);
  expect(textOf(statements)[0]).toBe("#1=IFCWALL('a;b/*c*/#9');");
});

test("treats '' inside a string as an escaped quote", async () => {
  const statements = await scan(
    ifc("#1=IFCWALL('it''s;fine')", "#2=IFCSLAB($)"),
  );
  expect(statements.map((s) => s.id)).toEqual([1, 2]);
  expect(textOf(statements)[0]).toBe("#1=IFCWALL('it''s;fine');");
});

// ---------------------------------------------------------------------------
// Byte accounting
// ---------------------------------------------------------------------------

test("offsets stay byte-based with multi-byte UTF-8 content", async () => {
  const text = ifc("#1=IFCWALL('café ☃')", "#2=IFCSLAB($)");
  const bytes = encoder.encode(text);
  const statements = await scanBytes(bytes);

  expect(statements.map((s) => s.id)).toEqual([1, 2]);
  for (const statement of statements) {
    // slicing the raw bytes at the reported span reproduces the statement
    expect(
      bytes.subarray(statement.offset, statement.offset + statement.length),
    ).toEqual(statement.bytes);
  }
  // "café ☃" is 9 bytes but 7 characters — a string-based offset would drift
  expect(statements[1].offset).toBe(bytes.length - "#2=IFCSLAB($);".length);
});

test("skips a UTF-8 BOM without shifting offsets", async () => {
  const bytes = new Uint8Array([
    0xef,
    0xbb,
    0xbf,
    ...encoder.encode("#1=IFCWALL($);"),
  ]);
  const [statement] = await scanBytes(bytes);
  expect(statement).toMatchObject({ id: 1, offset: 3, length: 14 });
});

test("handles CRLF line endings", async () => {
  const statements = await scan("#1=IFCWALL($);\r\n#2=IFCSLAB($);\r\n");
  expect(statements.map((s) => s.id)).toEqual([1, 2]);
  expect(textOf(statements)).toEqual(["#1=IFCWALL($);", "#2=IFCSLAB($);"]);
});

// ---------------------------------------------------------------------------
// Chunking — the same input must scan identically at every chunk size
// ---------------------------------------------------------------------------

test("produces identical output at every chunk size", async () => {
  const text =
    "/* lead */\n#1=IFCWALL('a;b''c');\n#22 = IFCSLAB(/* mid */$,\n  #1);\n" +
    "DATA;\n#333=IFCFOO('café');\n";
  const whole = await scan(text);
  expect(whole.map((s) => s.id)).toEqual([1, 22, 0, 333]);

  const byteLength = encoder.encode(text).length;
  for (let size = 1; size <= byteLength; size++) {
    // eslint-disable-next-line no-await-in-loop
    const chunked = await scan(text, size);
    expect(chunked, `chunk size ${size}`).toEqual(whole);
  }
});

test("splits a two-byte comment delimiter across a chunk boundary", async () => {
  // "/*" and "*/" each straddle the boundary at these sizes
  expect((await scan("#1=IFCA(/* x */$);", 9)).map((s) => s.id)).toEqual([1]);
  expect((await scan("#1=IFCA(/* x */$);", 13)).map((s) => s.id)).toEqual([1]);
});

// ---------------------------------------------------------------------------
// Truncation
// ---------------------------------------------------------------------------

test("errors when the input stops mid-statement", async () => {
  await expect(scan(`${ifc("#1=IFCWALL($)")}\n#2=IFCSLAB(`)).rejects.toThrow(
    "Unexpected end of Ifc stream",
  );
  await expect(scan("hello world")).rejects.toThrow(
    "Unexpected end of Ifc stream",
  );
});

test("does not error on trailing blanks or a trailing comment", async () => {
  expect(
    (await scan(`${ifc("#1=IFCWALL($)")}\n\n  \n`)).map((s) => s.id),
  ).toEqual([1]);
  expect(
    (await scan(`${ifc("#1=IFCWALL($)")}\n/* done */`)).map((s) => s.id),
  ).toEqual([1]);
});

// ---------------------------------------------------------------------------
// Against a real file
// ---------------------------------------------------------------------------

test("spans every statement of a real IFC byte-exactly", async () => {
  const bytes = new Uint8Array(
    readFileSync(
      new URL("../../../../resources/ifc/school_str.ifc", import.meta.url),
    ),
  );
  const statements = await scanBytes(bytes, 64 * 1024);

  const entities = statements.filter((s) => s.id !== 0);
  expect(entities).toHaveLength(93491);

  // ids are ascending and unique — what the index's binary search relies on.
  // Checked with plain loops and asserted once: 93k `expect` calls time out.
  let previous = 0;
  let outOfOrder = 0;
  for (const entity of entities) {
    if (entity.id <= previous) outOfOrder++;
    previous = entity.id;
  }
  expect(outOfOrder).toBe(0);
  expect(previous).toBe(96460);

  // every reported span reproduces the statement, and ends on its ";"
  const mismatched: number[] = [];
  const unterminated: number[] = [];
  for (const statement of statements) {
    const slice = bytes.subarray(
      statement.offset,
      statement.offset + statement.length,
    );
    if (slice.length !== statement.bytes.length) mismatched.push(statement.id);
    else {
      for (let i = 0; i < slice.length; i++) {
        if (slice[i] !== statement.bytes[i]) {
          mismatched.push(statement.id);
          break;
        }
      }
    }
    if (slice[slice.length - 1] !== 0x3b) unterminated.push(statement.id); // ";"
  }
  expect(mismatched).toEqual([]);
  expect(unterminated).toEqual([]);

  // the prefix the scanner reports agrees with the bytes it points at
  const first = entities[0];
  expect(first).toMatchObject({ id: 1, type: "IFCORGANIZATION" });
  expect(new TextDecoder().decode(first.bytes)).toBe(
    "#1=IFCORGANIZATION($,'Autodesk Revit 2024 (ENU)',$,$,$);",
  );
});
