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
// parseStepArguments
// ---------------------------------------------------------------------------

// tape item shorthands (codes mirror web-ifc internals)
const str = (value: string) => ({ type: 1, value });
const label = (name: string, value: unknown) => ({ type: 2, value, name });
const enumOf = (value: string) => ({ type: 3, value });
const real = (value: number) => ({ type: 4, value });
const ref = (value: number) => ({ type: 5, value });
const empty = () => ({ type: 6, value: null });
const int = (value: number) => ({ type: 10, value });

test("parseStepArguments tokenizes every STEP primitive", () => {
  const line =
    "#1=IFCFOO('it''s',$,*,#42,.ENUMVAL.,3.5,-2,1.0E-3,IFCLABEL('x'),(1,(2)));";
  expect(parseStepArguments(line)).toEqual([
    str("it's"),
    empty(),
    empty(),
    ref(42),
    enumOf("ENUMVAL"),
    real(3.5),
    int(-2),
    real(0.001),
    label("IFCLABEL", str("x")),
    [int(1), [int(2)]],
  ]);
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
    label("IFCLABEL", str("x")),
    empty(),
  ]);
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

const collect = async <T>(stream: ReadableStream<T>) => {
  const out: T[] = [];
  for await (const value of streamAsyncIterator(stream)) out.push(value);
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

test("IfcParserStream parses data lines into web-ifc entities", async () => {
  const stream = linesOf([
    ...HEADER,
    "#1=IFCCARTESIANPOINT((1.5,2.5,3.5));",
    "#2=IFCPROPERTYSINGLEVALUE('Answer',$,IFCLABEL('forty two'),$);",
    ...FOOTER,
  ]).pipeThrough(new IfcParserStream());

  const entities = await collect(stream);
  expect(entities).toHaveLength(2);

  const [point, prop] = entities as any[];
  expect(point.expressID).toBe(1);
  expect(point.type).toBe(webIfc.IFCCARTESIANPOINT);
  expect(point.Coordinates).toEqual([real(1.5), real(2.5), real(3.5)]);

  expect(prop.expressID).toBe(2);
  expect(prop.type).toBe(webIfc.IFCPROPERTYSINGLEVALUE);
  expect(prop.Name).toEqual(str("Answer"));
  expect(prop.Description).toEqual(empty());
  expect(prop.NominalValue).toEqual(label("IFCLABEL", str("forty two")));
  expect(prop.Unit).toEqual(empty());
});

test("IfcParserStream errors when the header has no FILE_SCHEMA", async () => {
  const stream = linesOf(["ISO-10303-21;", "HEADER;", "DATA;"]).pipeThrough(
    new IfcParserStream(),
  );

  await expect(collect(stream)).rejects.toBe("Ifc schema not found");
});

test("IfcParserStream errors on an unsupported schema", async () => {
  const stream = linesOf([
    "HEADER;",
    "FILE_SCHEMA(('IFC9000'));",
    "DATA;",
  ]).pipeThrough(new IfcParserStream());

  await expect(collect(stream)).rejects.toBe("Ifc schema 'IFC9000' not found");
});

test("IfcParserStream errors on a corrupted data line", async () => {
  const stream = linesOf([...HEADER, "garbage"]).pipeThrough(
    new IfcParserStream(),
  );

  await expect(collect(stream)).rejects.toBe("Ifc corrupted line: garbage");
});

test("IfcParserStream errors on an unknown entity type", async () => {
  const stream = linesOf([...HEADER, "#1=IFCNOTAREALTYPE($);"]).pipeThrough(
    new IfcParserStream(),
  );

  await expect(collect(stream)).rejects.toBe(
    "Unknown Ifc type 'IFCNOTAREALTYPE'",
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

  const entities = await collect(
    chunked
      .pipeThrough(new IfcDecoderStream())
      .pipeThrough(new IfcParserStream()),
  );

  expect(entities).toHaveLength(1);
  expect(entities[0].expressID).toBe(1);
  expect(entities[0].type).toBe(webIfc.IFCCARTESIANPOINT);
});
