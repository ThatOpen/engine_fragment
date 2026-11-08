import { ByteBuffer } from "flatbuffers";
import * as path from "path";
import { expect, test } from "vitest";
import { IfcImporter } from "../..";
import * as TFB from "../../../../Schema";

const ifc = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('','2026-11-07T00:00:00',(),(),'test','test','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCWALL('1hqIFTRjfV6AWq_bMtnZwI',$,'Wall',$,$,$,$,$,$);
#2=IFCTASK('0eA6m4fELI9QBIhP3wiLAp',$,'Task',$,$,$,$,$,$,.T.,$,$,$);
ENDSEC;
END-ISO-10303-21;`;
async function convert(include: boolean, all: boolean) {
  const importer = new IfcImporter();
  importer.wasm = {
    path: `${path.dirname(import.meta.resolve("web-ifc"))}/`,
    absolute: true,
  };
  importer.includeImportSettings = include;
  if (all) importer.addAllAttributes();
  const bytes = await importer.process({
    bytes: new TextEncoder().encode(ifc),
    raw: true,
  });
  const model = TFB.Model.getRootAsModel(new ByteBuffer(bytes));
  return JSON.parse(model.metadata()!);
}
test("import settings are opt-in", async () => {
  expect((await convert(false, false)).importSettings).toBeUndefined();
});
test("source counts identify omitted nongeometric objects", async () => {
  const partial = (await convert(true, false)).importSettings;
  expect(partial.version).toBe(1);
  expect(partial.sourceCounts.IFCTASK).toBe(1);
  expect(partial.retainedCounts.IFCTASK ?? 0).toBe(0);
  expect(partial.excludedAttributes).toContain("OwnerHistory");
  const complete = (await convert(true, true)).importSettings;
  expect(complete.retainedCounts.IFCTASK).toBe(1);
  expect(complete.excludedAttributes).toEqual([]);
  expect(complete.sourceCounts.IFCWALL).toBe(complete.retainedCounts.IFCWALL);
}, 60000);
