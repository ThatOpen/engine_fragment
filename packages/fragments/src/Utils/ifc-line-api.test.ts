import { readFileSync, readdirSync } from "node:fs";
import * as path from "node:path";
import { beforeAll, describe, expect, test } from "vitest";
import * as webIfc from "web-ifc";
import { IfcEntityResolver } from "./ifc-resolver";
import { IfcResolverLineApi } from "./ifc-line-api";

const fixtureDir = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "..",
  "resources",
  "ifc",
);
const webIfcDir = path.dirname(import.meta.resolve("web-ifc"));

// Plain data, so `toEqual` compares what the property pass reads rather than
// class identity or prototype getters.
const plain = (value: unknown) => JSON.parse(JSON.stringify(value ?? null));

describe.each(readdirSync(fixtureDir).filter((f) => f.endsWith(".ifc")))(
  "IfcResolverLineApi matches IfcAPI on %s",
  (fixture) => {
    let api: webIfc.IfcAPI;
    let lines: IfcResolverLineApi;

    beforeAll(async () => {
      const bytes = readFileSync(path.join(fixtureDir, fixture));
      api = new webIfc.IfcAPI();
      api.SetWasmPath(webIfcDir + path.sep, true);
      await api.Init();
      api.SetLogLevel(webIfc.LogLevel.LOG_LEVEL_OFF);
      api.OpenModel(bytes);
      lines = new IfcResolverLineApi(await IfcEntityResolver.fromBytes(bytes));
      return () => api.Dispose();
    });

    test("schema and header lines", () => {
      expect(lines.GetModelSchema(0)).toBe(api.GetModelSchema(0));
      for (const header of [webIfc.FILE_NAME, webIfc.FILE_DESCRIPTION]) {
        expect(plain(lines.GetHeaderLine(0, header).arguments)).toEqual(
          plain(api.GetHeaderLine(0, header).arguments),
        );
      }
    });

    test("types, in order, and the ids of each", () => {
      // Type names differ in case only (STEP's `IFCWALL` against web-ifc's
      // `IfcWall`) and nothing reads them, so the codes are what must match.
      const types = lines.GetAllTypesOfModel(0);
      expect(types.map((t) => t.typeID)).toEqual(
        api.GetAllTypesOfModel(0).map((t) => t.typeID),
      );
      for (const { typeID } of types) {
        expect([...lines.GetLineIDsWithType(0, typeID)]).toEqual([
          ...api.GetLineIDsWithType(0, typeID),
        ]);
      }
    });

    test("every line", () => {
      for (const { typeID } of lines.GetAllTypesOfModel(0)) {
        for (const id of lines.GetLineIDsWithType(0, typeID)) {
          expect(plain(lines.GetLine(0, id))).toEqual(
            plain(api.GetLine(0, id)),
          );
        }
      }
    });
  },
);
