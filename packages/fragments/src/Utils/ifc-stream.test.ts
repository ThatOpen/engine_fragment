import { expect, test } from "vitest";
import * as webIfc from "web-ifc";
import { parseStepArguments } from "./ifc-parsing-utils";
import {
  IfcDecoderStream,
  IfcParserStream,
  streamAsyncIterator,
} from "./ifc-stream";

const sourceOf = (values: number[], onCancel: () => void) =>
  new ReadableStream<number>({
    start(controller) {
      for (const value of values) controller.enqueue(value);
      controller.close();
    },
    cancel: onCancel,
  });

test("streamAsyncIterator cancels the source when iteration breaks early", async () => {
  let cancelled = false;
  const stream = sourceOf([1, 2, 3], () => {
    cancelled = true;
  });

  for await (const value of streamAsyncIterator(stream)) {
    if (value === 2) break;
  }

  expect(cancelled).toBe(true);
  expect(stream.locked).toBe(false);
});

test("streamAsyncIterator cancels the source when the consumer throws", async () => {
  let cancelled = false;
  const stream = sourceOf([1, 2, 3], () => {
    cancelled = true;
  });

  const boom = new Error("boom");
  await expect(
    (async () => {
      for await (const value of streamAsyncIterator(stream)) {
        if (value === 2) throw boom;
      }
    })(),
  ).rejects.toBe(boom);

  expect(cancelled).toBe(true);
  expect(stream.locked).toBe(false);
});

test("streamAsyncIterator does not cancel a fully drained source", async () => {
  let cancelled = false;
  const stream = sourceOf([1, 2, 3], () => {
    cancelled = true;
  });

  const seen: number[] = [];
  for await (const value of streamAsyncIterator(stream)) seen.push(value);

  expect(seen).toEqual([1, 2, 3]);
  expect(cancelled).toBe(false);
  expect(stream.locked).toBe(false);
});

// ---------------------------------------------------------------------------
// IfcDecoderStream
// ---------------------------------------------------------------------------

const decode = async (chunks: string[]) => {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  const lines: string[] = [];
  for await (const line of streamAsyncIterator(
    source.pipeThrough(new IfcDecoderStream()),
  )) {
    lines.push(line);
  }
  return lines;
};

test("IfcDecoderStream strips a CRLF pair split across two chunks", async () => {
  expect(await decode(["A;\r", "\nB;\r\n"])).toEqual(["A;", "B;"]);
});

// ---------------------------------------------------------------------------
// parseStepArguments — emits web-ifc's raw tape shape
// ---------------------------------------------------------------------------

// tape item shorthands in web-ifc's raw shape
const str = (value: string) => ({ type: webIfc.STRING, value });
const enumOf = (value: string | boolean | undefined) => ({
  type: webIfc.ENUM,
  value,
});
// web-ifc keeps the raw literal text of reals (and binary literals) as strings
const real = (value: string) => ({ type: webIfc.REAL, value });
const int = (value: number) => ({ type: webIfc.INTEGER, value });
const ref = (value: number) => ({ type: webIfc.REF, value });
const label = (typecode: number, value: unknown) => ({
  type: webIfc.LABEL,
  typecode,
  value,
});

test("parseStepArguments tokenizes every STEP primitive", () => {
  const line =
    "#1=IFCFOO('it''s',$,#42,.ENUMVAL.,.T.,.F.,3.5,-2,1.0E-3,IFCLABEL('x'),(1,(2)));";
  expect(parseStepArguments(line)).toEqual([
    str("it's"),
    null,
    ref(42),
    enumOf("ENUMVAL"),
    enumOf(true),
    enumOf(false),
    real("3.5"),
    int(-2),
    real("1.0E-3"),
    label(webIfc.IFCLABEL, "x"),
    [int(1), [int(2)]],
  ]);
});

test("parseStepArguments emits no slot for '*' derived attributes", () => {
  // web-ifc's raw tape for IFCSIUNIT(*,...) has 3 slots, not 4
  expect(parseStepArguments("#1=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);")).toEqual(
    [enumOf("LENGTHUNIT"), null, enumOf("METRE")],
  );
});

test("parseStepArguments keeps arguments after a nested aggregate", () => {
  expect(parseStepArguments("#1=IFCFOO((1,2),'after',());")).toEqual([
    [int(1), int(2)],
    str("after"),
    [],
  ]);
});

test("parseStepArguments keeps arguments after a typed value", () => {
  expect(parseStepArguments("#1=IFCFOO(IFCLABEL('x'),$);")).toEqual([
    label(webIfc.IFCLABEL, "x"),
    null,
  ]);
});

test("parseStepArguments flattens typed values to their inner primitive", () => {
  expect(
    parseStepArguments("#1=IFCFOO(IFCBOOLEAN(.T.),IFCINTEGER(42));"),
  ).toEqual([label(webIfc.IFCBOOLEAN, true), label(webIfc.IFCINTEGER, 42)]);
  expect(parseStepArguments("#1=IFCFOO(IFCLOGICAL(.U.));")).toEqual([
    label(webIfc.IFCLOGICAL, undefined),
  ]);
});

test("parseStepArguments decodes STEP string escapes", () => {
  expect(
    parseStepArguments("#1=IFCFOO('caf\\X2\\00E9\\X0\\ \\S\\d \\\\x');"),
  ).toEqual([str("café ä \\x")]);
});

test("parseStepArguments reads binary literals as raw hex text", () => {
  expect(parseStepArguments('#1=IFCFOO(("00FF"),$);')).toEqual([
    [real("00FF")],
    null,
  ]);
});

test("parseStepArguments skips /* */ comments between tokens", () => {
  expect(parseStepArguments("#1=IFCFOO('g', /* owner */ #5);")).toEqual([
    str("g"),
    ref(5),
  ]);
});

test("parseStepArguments throws on malformed tokens instead of emitting NaN", () => {
  expect(() => parseStepArguments("#1=IFCFOO(#);")).toThrow(/digits/);
  expect(() => parseStepArguments("#1=IFCFOO(-);")).toThrow(/malformed number/);
  expect(() => parseStepArguments("#1=IFCFOO(%);")).toThrow(
    /unexpected character/,
  );
});

test("parseStepArguments returns no arguments for a line without parens", () => {
  expect(parseStepArguments("ENDSEC;")).toEqual([]);
});

// ---------------------------------------------------------------------------
// IfcParserStream
// ---------------------------------------------------------------------------

const linesOf = (lines: string[]) =>
  new ReadableStream<string>({
    start(controller) {
      for (const line of lines) controller.enqueue(line);
      controller.close();
    },
  });

const collect = async (lines: string[]) => {
  const out: any[] = [];
  for await (const entity of streamAsyncIterator(
    linesOf(lines).pipeThrough(new IfcParserStream()),
  )) {
    out.push(entity);
  }
  return out;
};

const HEADER = [
  "ISO-10303-21;",
  "HEADER;",
  "FILE_DESCRIPTION((''),'2;1');",
  "FILE_NAME('','',(''),(''),'','','');",
  "FILE_SCHEMA(('IFC4'));",
  "ENDSEC;",
  "DATA;",
];

const FOOTER = ["ENDSEC;", "END-ISO-10303-21;"];

test("IfcParserStream produces entities matching web-ifc's GetLine shape", async () => {
  const [point, prop] = await collect([
    ...HEADER,
    "#1=IFCCARTESIANPOINT((1.5,-2.5E-1,3.));",
    "#2=IFCPROPERTYSINGLEVALUE('Answer',$,IFCLABEL('forty two'),$);",
    ...FOOTER,
  ]);

  expect(point.expressID).toBe(1);
  expect(point.type).toBe(webIfc.IFCCARTESIANPOINT);
  // attributes are typed wrappers whose .value is the primitive, like GetLine
  expect(point.Coordinates.map((c: any) => c.value)).toEqual([1.5, -0.25, 3]);
  expect(point.Coordinates[0].name).toBe("IFCLENGTHMEASURE");

  expect(prop.expressID).toBe(2);
  expect(prop.type).toBe(webIfc.IFCPROPERTYSINGLEVALUE);
  expect(prop.Name.value).toBe("Answer");
  expect(prop.Description).toBeNull(); // '$' is null, not a placeholder object
  expect(prop.NominalValue.value).toBe("forty two");
  expect(prop.NominalValue.name).toBe("IFCLABEL");
  expect(prop.Unit).toBeNull();
});

test("IfcParserStream does not shift attributes of '*' derived slots", async () => {
  const [unit] = await collect([
    ...HEADER,
    "#1=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);",
    ...FOOTER,
  ]);

  expect(unit.UnitType).toEqual({ type: webIfc.ENUM, value: "LENGTHUNIT" });
  expect(unit.Prefix).toBeNull();
  expect(unit.Name).toEqual({ type: webIfc.ENUM, value: "METRE" });
});

test("IfcParserStream parses .T./.F. as booleans", async () => {
  const [prop] = await collect([
    ...HEADER,
    "#1=IFCPROPERTYSINGLEVALUE('B',$,IFCBOOLEAN(.T.),$);",
    ...FOOTER,
  ]);

  expect(prop.NominalValue.value).toBe(true);
});

test("IfcParserStream decodes escaped strings", async () => {
  const [prop] = await collect([
    ...HEADER,
    "#1=IFCPROPERTYSINGLEVALUE('X',$,IFCTEXT('caf\\X2\\00E9\\X0\\'),$);",
    ...FOOTER,
  ]);

  expect(prop.NominalValue.value).toBe("café");
});

test("IfcParserStream handles statements spanning or sharing physical lines", async () => {
  const entities = await collect([
    ...HEADER,
    "#1=IFCPROPERTYSINGLEVALUE('Answer',$,", // wrapped across two lines
    "  IFCLABEL('forty two'),$);",
    "#2=IFCCARTESIANPOINT((0.,0.)); #3=IFCCARTESIANPOINT((1.,1.));", // shared line
    ...FOOTER,
  ]);

  expect(entities.map((e) => e.expressID)).toEqual([1, 2, 3]);
  expect(entities[0].NominalValue.value).toBe("forty two");
});

test("IfcParserStream tolerates blank, indented, and comment lines", async () => {
  const entities = await collect([
    ...HEADER,
    "",
    "/* a whole-line comment */",
    "  #1=IFCCARTESIANPOINT((1.,2.));",
    "/* a comment",
    "   spanning lines */ #2=IFCCARTESIANPOINT((3.,4.));",
    ...FOOTER,
  ]);

  expect(entities.map((e) => e.expressID)).toEqual([1, 2]);
});

test("IfcParserStream accepts spec-legal FILE_SCHEMA variants", async () => {
  const spaced = await collect([
    "ISO-10303-21;",
    "HEADER;",
    "FILE_SCHEMA (('IFC4'));", // whitespace before the parens
    "ENDSEC;",
    "DATA;",
    "#1=IFCCARTESIANPOINT((0.,0.));",
    ...FOOTER,
  ]);
  expect(spaced).toHaveLength(1);

  const multi = await collect([
    "ISO-10303-21;",
    "HEADER;",
    "FILE_SCHEMA(('NOTASCHEMA','IFC4'));", // multi-identifier list
    "ENDSEC;",
    "DATA;",
    "#1=IFCCARTESIANPOINT((0.,0.));",
    ...FOOTER,
  ]);
  expect(multi).toHaveLength(1);
});

test("IfcParserStream skips entity types outside the declared schema", async () => {
  const entities = await collect([
    "ISO-10303-21;",
    "HEADER;",
    "FILE_SCHEMA(('IFC2X3'));",
    "ENDSEC;",
    "DATA;",
    "#1=IFCALIGNMENT($,$,$,$,$,$,$);", // IFC4X3-only type
    "#2=IFCTOTALGARBAGETYPE($);", // not a web-ifc type at all
    "#3=IFCCARTESIANPOINT((0.,0.));",
    ...FOOTER,
  ]);

  expect(entities.map((e) => e.expressID)).toEqual([3]);
});

test("IfcParserStream parses entities from several DATA sections", async () => {
  const entities = await collect([
    ...HEADER,
    "#1=IFCCARTESIANPOINT((0.,0.));",
    "ENDSEC;",
    "DATA;",
    "#2=IFCCARTESIANPOINT((9.,9.));",
    ...FOOTER,
  ]);

  expect(entities.map((e) => e.expressID)).toEqual([1, 2]);
});

test("IfcParserStream errors when the header has no FILE_SCHEMA", async () => {
  await expect(collect(["ISO-10303-21;", "HEADER;", "DATA;"])).rejects.toThrow(
    "Ifc schema not found",
  );
});

test("IfcParserStream errors on an unsupported schema", async () => {
  await expect(
    collect(["HEADER;", "FILE_SCHEMA(('IFC9000'));", "DATA;"]),
  ).rejects.toThrow("Ifc schema 'IFC9000' not found");
});

test("IfcParserStream errors on a corrupted data statement", async () => {
  await expect(collect([...HEADER, "garbage;"])).rejects.toThrow(
    "Corrupted Ifc statement: garbage",
  );
});

test("IfcParserStream errors on truncated input instead of succeeding", async () => {
  // ends mid-DATA with a complete last statement but no ENDSEC/END-ISO marker
  await expect(
    collect([...HEADER, "#1=IFCCARTESIANPOINT((0.,0.));"]),
  ).rejects.toThrow("Unexpected end of Ifc stream");

  // non-IFC input never reaches DATA; and must not succeed silently
  await expect(collect(["hello", "world"])).rejects.toThrow(
    "Unexpected end of Ifc stream",
  );
});

test("IfcDecoderStream and IfcParserStream compose over byte chunks", async () => {
  const text = [
    ...HEADER,
    "#1=IFCCARTESIANPOINT((1.5,2.5,3.5));",
    ...FOOTER,
  ].join("\r\n");
  const bytes = new TextEncoder().encode(text);
  const chunked = new ReadableStream<Uint8Array>({
    start(controller) {
      // deliberately split mid-line to exercise the decoder's tail handling
      for (let i = 0; i < bytes.length; i += 7) {
        controller.enqueue(bytes.subarray(i, i + 7));
      }
      controller.close();
    },
  });

  const entities: any[] = [];
  for await (const entity of streamAsyncIterator(
    chunked
      .pipeThrough(new IfcDecoderStream())
      .pipeThrough(new IfcParserStream()),
  )) {
    entities.push(entity);
  }

  expect(entities).toHaveLength(1);
  expect(entities[0].expressID).toBe(1);
  expect(entities[0].type).toBe(webIfc.IFCCARTESIANPOINT);
  expect(entities[0].Coordinates.map((c: any) => c.value)).toEqual([
    1.5, 2.5, 3.5,
  ]);
});
