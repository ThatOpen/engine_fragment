import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import * as webIfc from "web-ifc";
import { IfcEntityResolver } from "./ifc-resolver";
import { IfcStatementScanner } from "./ifc-scanner";
import { IfcParserStream, streamAsyncIterator } from "./ifc-stream";

/** Joins statements written without their trailing `;`. */
const ifc = (...statements: string[]) =>
  statements.map((statement) => `${statement};`).join("\n");

const HEADER = ifc(
  "ISO-10303-21",
  "HEADER",
  "FILE_SCHEMA(('IFC4'))",
  "ENDSEC",
  "DATA",
);
const FOOTER = ifc("ENDSEC", "END-ISO-10303-21");

const ifcFile = (...statements: string[]) =>
  [HEADER, ifc(...statements), FOOTER].join("\n");

const resolverFor = async (...statements: string[]) =>
  IfcEntityResolver.fromBytes(new TextEncoder().encode(ifcFile(...statements)));

/**
 * web-ifc's `IfcLineObject` declares no per-type attributes, so reading one by
 * name needs a cast — the same `any` the other stream tests use.
 */
const get = (resolver: IfcEntityResolver, id: number): any => resolver.get(id);

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

test("resolves a handle to the entity it points at", async () => {
  const resolver = await resolverFor(
    "#1=IFCORGANIZATION($,'Acme',$,$,$)",
    "#2=IFCAPPLICATION(#1,'1.0','Full','Id')",
  );

  const app = get(resolver, 2);
  expect(app.expressID).toBe(2);
  // the handle still reads like web-ifc's GetLine output
  expect(app.ApplicationDeveloper.value).toBe(1);
  expect(app.ApplicationDeveloper.type).toBe(webIfc.REF);
  // and now also resolves
  expect(app.ApplicationDeveloper.ref.expressID).toBe(1);
  expect(app.ApplicationDeveloper.ref.Name.value).toBe("Acme");
});

test("resolves handles nested in aggregates", async () => {
  const resolver = await resolverFor(
    "#1=IFCORGANIZATION($,'A',$,$,$)",
    "#2=IFCORGANIZATION($,'B',$,$,$)",
    "#3=IFCRELAGGREGATES('g',$,$,$,#1,(#1,#2))",
  );

  const rel = get(resolver, 3);
  expect(rel.RelatedObjects.map((r: any) => r.ref.Name.value)).toEqual([
    "A",
    "B",
  ]);
});

test("leaves typed values alone", async () => {
  // web-ifc's own constructors unwrap IFCLABEL(...) and friends to a bare
  // primitive, so there is no handle inside one to resolve
  const resolver = await resolverFor(
    "#1=IFCPROPERTYSINGLEVALUE('P',$,IFCLABEL('plain'),$)",
  );
  expect(get(resolver, 1).NominalValue.value).toBe("plain");
});

test("reports a dangling handle as undefined rather than throwing", async () => {
  const resolver = await resolverFor(
    "#1=IFCAPPLICATION(#999,'1.0','Full','Id')",
  );
  expect(get(resolver, 1).ApplicationDeveloper.ref).toBeUndefined();
  expect(get(resolver, 999)).toBeUndefined();
});

test("hands back the same object for repeated resolutions", async () => {
  const resolver = await resolverFor(
    "#1=IFCORGANIZATION($,'A',$,$,$)",
    "#2=IFCRELAGGREGATES('g',$,$,$,#1,(#1,#1))",
  );

  const rel = get(resolver, 2);
  const [first, second] = rel.RelatedObjects;
  expect(first.ref).toBe(second.ref);
  expect(first.ref).toBe(rel.RelatingObject.ref);
  expect(first.ref).toBe(get(resolver, 1));
});

test("survives a reference cycle", async () => {
  const resolver = await resolverFor(
    "#1=IFCRELAGGREGATES('a',$,$,$,#2,(#2))",
    "#2=IFCRELAGGREGATES('b',$,$,$,#1,(#1))",
  );

  const one = get(resolver, 1);
  expect(one.RelatingObject.ref.RelatingObject.ref).toBe(one);
});

test("resolves forward references, not just backward ones", async () => {
  const resolver = await resolverFor(
    "#1=IFCAPPLICATION(#2,'1.0','Full','Id')", // points at a later statement
    "#2=IFCORGANIZATION($,'Later',$,$,$)",
  );
  expect(get(resolver, 1).ApplicationDeveloper.ref.Name.value).toBe("Later");
});

// ---------------------------------------------------------------------------
// Laziness
// ---------------------------------------------------------------------------

test("parses nothing until a handle is actually read", async () => {
  // #2's arguments are malformed, so parsing it throws — but only on access
  const resolver = await resolverFor(
    "#1=IFCAPPLICATION(#2,'1.0','Full','Id')",
    "#2=IFCORGANIZATION($,%,$,$,$)",
  );

  const app = get(resolver, 1);
  expect(app.expressID).toBe(1); // the referrer parsed fine
  expect(() => app.ApplicationDeveloper.ref).toThrow("Corrupted Ifc statement");
});

test("keeps `ref` off the enumerable shape web-ifc produces", async () => {
  const resolver = await resolverFor(
    "#1=IFCORGANIZATION($,'A',$,$,$)",
    "#2=IFCAPPLICATION(#1,'1.0','Full','Id')",
  );
  const handle = get(resolver, 2).ApplicationDeveloper;
  expect(Object.keys(handle)).toEqual(["value", "type"]);
  expect({ ...handle }).toEqual({ value: 1, type: webIfc.REF });
});

// ---------------------------------------------------------------------------
// Schema handling
// ---------------------------------------------------------------------------

test("errors on a file with no usable schema", async () => {
  const bytes = new TextEncoder().encode(
    ifc("ISO-10303-21", "HEADER", "ENDSEC", "DATA", "ENDSEC"),
  );
  await expect(IfcEntityResolver.fromBytes(bytes)).rejects.toThrow(
    "Ifc schema not found",
  );

  const unknown = new TextEncoder().encode(
    ifc("HEADER", "FILE_SCHEMA(('IFC9000'))", "ENDSEC", "DATA", "ENDSEC"),
  );
  await expect(IfcEntityResolver.fromBytes(unknown)).rejects.toThrow(
    "Ifc schema 'IFC9000' not found",
  );
});

// ---------------------------------------------------------------------------
// Through IfcParserStream
// ---------------------------------------------------------------------------

test("IfcParserStream attaches refs when given a resolver", async () => {
  const text = ifcFile(
    "#1=IFCORGANIZATION($,'Acme',$,$,$)",
    "#2=IFCAPPLICATION(#1,'1.0','Full','Id')",
  );
  const bytes = new TextEncoder().encode(text);
  const resolver = await IfcEntityResolver.fromBytes(bytes);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });

  const entities: any[] = [];
  for await (const entity of streamAsyncIterator(
    stream
      .pipeThrough(new IfcStatementScanner())
      .pipeThrough(new IfcParserStream({ resolver })),
  )) {
    entities.push(entity);
  }

  expect(entities.map((e) => e.expressID)).toEqual([1, 2]);
  expect(entities[1].ApplicationDeveloper.ref.Name.value).toBe("Acme");
});

test("IfcParserStream leaves handles bare without a resolver", async () => {
  const bytes = new TextEncoder().encode(
    ifcFile(
      "#1=IFCORGANIZATION($,'Acme',$,$,$)",
      "#2=IFCAPPLICATION(#1,'1.0','Full','Id')",
    ),
  );
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });

  const entities: any[] = [];
  for await (const entity of streamAsyncIterator(
    stream
      .pipeThrough(new IfcStatementScanner())
      .pipeThrough(new IfcParserStream()),
  )) {
    entities.push(entity);
  }

  expect(entities[1].ApplicationDeveloper.ref).toBeUndefined();
  expect(entities[1].ApplicationDeveloper.value).toBe(1);
});

// ---------------------------------------------------------------------------
// Against a real file
// ---------------------------------------------------------------------------

test("follows a reference chain through a real IFC", async () => {
  const bytes = new Uint8Array(
    readFileSync(
      new URL("../../../../resources/ifc/school_str.ifc", import.meta.url),
    ),
  );
  const resolver = await IfcEntityResolver.fromBytes(bytes);

  expect(resolver.index.count).toBe(93491);

  // #2=IFCAPPLICATION(#1,...) -> #1=IFCORGANIZATION($,'Autodesk Revit ...')
  const app = get(resolver, 2);
  expect(app.type).toBe(webIfc.IFCAPPLICATION);
  const developer = app.ApplicationDeveloper.ref;
  expect(developer.expressID).toBe(1);
  expect(developer.Name.value).toBe("Autodesk Revit 2024 (ENU)");

  // walking two entities does not drag the rest of the file in with it
  expect(resolver.index.count).toBe(93491);
});
