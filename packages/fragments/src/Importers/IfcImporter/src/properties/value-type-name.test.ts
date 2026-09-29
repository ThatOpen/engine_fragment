import { readFile } from "fs/promises";
import * as path from "path";
import { ByteBuffer } from "flatbuffers";
import * as WEBIFC from "web-ifc";
import { afterEach, expect, test } from "vitest";
import { IfcImporter } from "../..";
import * as TFB from "../../../../Schema";
import { ifcValueTypeName } from "./value-type-name";

// A bundler that minifies renames web-ifc's classes, so an importer that
// derives IFC type names from `constructor.name` writes "K" or "EE" into
// the .frag instead of IFCCOMPOUNDPLANEANGLEMEASURE. These tests rename the
// classes the way a minifier would and check the written names don't move.

const assetDir = path.resolve(import.meta.dirname, "..", "..", "..", "..", "..", "..", "..");
const webIfcDir = path.dirname(import.meta.resolve("web-ifc"));
const CONVERSION_TIMEOUT = 30_000;

// The value wrappers that carry no `name` field in web-ifc 0.0.77.
const NAMELESS = [
  "IfcCompoundPlaneAngleMeasure",
  "IfcComplexNumber",
  "IfcLineIndex",
  "IfcArcIndex",
  "IfcPropertySetDefinitionSet",
];
const SCHEMAS = { IFC2X3: WEBIFC.IFC2X3, IFC4: WEBIFC.IFC4, IFC4X3: WEBIFC.IFC4X3 } as Record<string, any>;

const restore: (() => void)[] = [];
function minifyClassNames() {
  let i = 0;
  for (const schema of Object.values(SCHEMAS)) {
    for (const key of NAMELESS) {
      const cls = schema[key];
      if (typeof cls !== "function") continue;
      const original = Object.getOwnPropertyDescriptor(cls, "name")!;
      Object.defineProperty(cls, "name", { value: `K${i++}`, configurable: true });
      restore.push(() => Object.defineProperty(cls, "name", original));
    }
  }
  expect(i).toBeGreaterThan(0);
}

afterEach(() => {
  while (restore.length) restore.pop()!();
});

test("value wrappers without a name field resolve through the schema, not the class name", () => {
  minifyClassNames();
  let checked = 0;
  for (const [schemaName, schema] of Object.entries(SCHEMAS)) {
    for (const key of NAMELESS) {
      const cls = schema[key];
      if (typeof cls !== "function") continue;
      expect(ifcValueTypeName(new cls([1, 2])), `${schemaName}.${key}`).toBe(key.toUpperCase());
      checked++;
    }
  }
  expect(checked).toBeGreaterThanOrEqual(NAMELESS.length);
  // Wrappers with a name field keep it; plain objects have no IFC type.
  expect(ifcValueTypeName(new WEBIFC.IFC4.IfcLabel("a"))).toBe("IFCLABEL");
  expect(ifcValueTypeName({ type: 3, value: "X" })).toBeUndefined();
});

test(
  "the written type names do not depend on web-ifc's class names",
  async () => {
    minifyClassNames();
    const bytes = new Uint8Array(await readFile(path.resolve(assetDir, "resources", "ifc", "just_wall.ifc")));
    const importer = new IfcImporter();
    importer.wasm = { path: webIfcDir + path.sep, absolute: true };
    const fragBytes = await importer.process({ bytes, raw: true });

    const model = TFB.Model.getRootAsModel(new ByteBuffer(fragBytes));
    const typeOf = new Map<string, string>();
    const typeNames = new Set<string>();
    for (let i = 0; i < model.attributesLength(); i++) {
      const attr = model.attributes(i);
      if (!attr) continue;
      for (let j = 0; j < attr.dataLength(); j++) {
        const [name, , type] = JSON.parse(attr.data(j) as string);
        typeOf.set(name, type);
        typeNames.add(type);
      }
    }
    expect(typeOf.get("RefLatitude")).toBe("IFCCOMPOUNDPLANEANGLEMEASURE");
    expect(typeOf.get("RefLongitude")).toBe("IFCCOMPOUNDPLANEANGLEMEASURE");
    for (const type of typeNames) expect(type).toMatch(/^(IFC[A-Z0-9]+|UNDEFINED)$/);
  },
  CONVERSION_TIMEOUT,
);
