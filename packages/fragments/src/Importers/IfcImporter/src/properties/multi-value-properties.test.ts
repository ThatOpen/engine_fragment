import { readFile } from "fs/promises";
import * as path from "path";
import { ByteBuffer } from "flatbuffers";
import { expect, test } from "vitest";
import { IfcImporter } from "../..";
import * as TFB from "../../../../Schema";
import { getItems } from "../../../../Utils/edit/fetch-functions";

const assetDir = path.resolve(import.meta.dirname, "../../../../../../..");
const webIfcDir = path.dirname(import.meta.resolve("web-ifc"));

/**
 * `resources/ifc/property-values.ifc`: one property set with a list, a bounded,
 * an enumerated and a table property. They used to be left out of the import,
 * so the set referred to items with no category and no data.
 */
test("imports list, bounded, enumerated and table properties with their values", async () => {
  const bytes = new Uint8Array(
    await readFile(
      path.resolve(assetDir, "resources", "ifc", "property-values.ifc"),
    ),
  );
  const importer = new IfcImporter();
  importer.wasm = { path: webIfcDir + path.sep, absolute: true };
  const fragBytes = await importer.process({ bytes, raw: true });
  const model = TFB.Model.getRootAsModel(new ByteBuffer(fragBytes));

  const byName = new Map<
    string,
    { category: string; data: Record<string, any> }
  >();
  for (const item of getItems(model).values()) {
    const name = item.data.Name?.value;
    if (typeof name === "string") byName.set(`${item.category}:${name}`, item);
  }

  expect(
    byName.get("IFCPROPERTYLISTVALUE:Codes")?.data.ListValues.value,
  ).toEqual(["A", "B"]);
  const range = byName.get("IFCPROPERTYBOUNDEDVALUE:Range")!.data;
  expect([
    range.LowerBoundValue.value,
    range.UpperBoundValue.value,
    range.SetPointValue.value,
  ]).toEqual([1, 5, 3]);
  expect(
    byName.get("IFCPROPERTYENUMERATEDVALUE:Status")?.data.EnumerationValues
      .value,
  ).toEqual(["EXISTING", "DEMOLISH"]);
  expect(
    byName.get("IFCPROPERTYENUMERATION:Status")?.data.EnumerationValues.value,
  ).toEqual(["NEW", "EXISTING", "DEMOLISH"]);
  const lookup = byName.get("IFCPROPERTYTABLEVALUE:Lookup")!.data;
  expect([lookup.DefiningValues.value, lookup.DefinedValues.value]).toEqual([
    ["K"],
    [2],
  ]);
}, 30_000);
