import { closeSync, openSync, readFileSync, readSync, statSync } from "fs";
import * as path from "path";
import * as WEBIFC from "web-ifc";
import { afterEach, expect, test, vi } from "vitest";
import { IfcImporter } from "..";

/**
 * Issue #342: `parseOnce` reuses the geometry step's web-ifc model for the
 * properties instead of parsing the file a second time. Off by default.
 */

const assetDir = path.resolve(import.meta.dirname, "../../../../../..");
const webIfcDir = path.dirname(import.meta.resolve("web-ifc"));
const ifcPath = (name: string) =>
  path.resolve(assetDir, "resources", "ifc", name);

const createImporter = (parseOnce?: boolean) => {
  const importer = new IfcImporter();
  importer.wasm = { path: webIfcDir + path.sep, absolute: true };
  if (parseOnce !== undefined) importer.parseOnce = parseOnce;
  return importer;
};

const sameBytes = (a: Uint8Array, b: Uint8Array) =>
  Buffer.from(a).equals(Buffer.from(b));

afterEach(() => {
  vi.restoreAllMocks();
});

/** Converts a file through a read callback, counting the bytes it reads. */
const convertFromFile = async (file: string, parseOnce: boolean) => {
  const fd = openSync(file, "r");
  let bytesRead = 0;
  const readCallback = (offset: number, size: number) => {
    const data = new Uint8Array(size);
    const read = readSync(fd, data, 0, size, offset);
    bytesRead += read;
    return data.subarray(0, read);
  };
  try {
    const bytes = await createImporter(parseOnce).process({
      id: "parse-once",
      raw: true,
      readFromCallback: true,
      readCallback,
    });
    return { bytes, bytesRead };
  } finally {
    closeSync(fd);
  }
};

test("parseOnce is off by default", () => {
  expect(new IfcImporter().parseOnce).toBe(false);
});

test("parseOnce reads the file once through readCallback and imports the same model", async () => {
  const file = ifcPath("school_str.ifc");
  const size = statSync(file).size;

  const twice = await convertFromFile(file, false);
  const once = await convertFromFile(file, true);

  // web-ifc may read a file more than once while opening it, so the runs
  // are compared with each other rather than with the file size.
  expect(once.bytesRead).toBeGreaterThanOrEqual(size);
  expect(twice.bytesRead).toBe(2 * once.bytesRead);
  expect(sameBytes(once.bytes, twice.bytes)).toBe(true);
}, 120_000);

test("parseOnce opens the model once when given bytes", async () => {
  const bytes = new Uint8Array(readFileSync(ifcPath("dedup_repro.ifc")));
  const openModel = vi.spyOn(WEBIFC.IfcAPI.prototype, "OpenModel");
  const dispose = vi.spyOn(WEBIFC.IfcAPI.prototype, "Dispose");

  const twice = await createImporter().process({ id: "a", bytes, raw: true });
  expect(openModel).toHaveBeenCalledTimes(2);
  expect(dispose).toHaveBeenCalledTimes(2);

  openModel.mockClear();
  dispose.mockClear();
  const once = await createImporter(true).process({ id: "a", bytes, raw: true });
  expect(openModel).toHaveBeenCalledTimes(1);
  // The one instance is still disposed once the properties are read.
  expect(dispose).toHaveBeenCalledTimes(1);
  expect(sameBytes(once, twice)).toBe(true);
}, 60_000);
