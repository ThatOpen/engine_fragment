import { readFileSync } from "node:fs";
import path from "node:path";
import pako from "pako";
import * as flatbuffers from "flatbuffers";
import { describe, expect, test } from "vitest";
import { Model } from "../../Schema";
import { edit } from "./edit-function";
import { EditRequest, EditRequestType } from "./edit-types";
import { getItems } from "./fetch-functions";

/**
 * An item created and then updated before the next save was written with its
 * creation attributes: UPDATE_ITEM only reached items of the previous model.
 * Reads of the pending edits already return the latest request, so the item
 * changed back on save.
 */

const fixture = path.resolve(
  import.meta.dirname,
  "../../../../..",
  "resources/frags/small_test.frag",
);

const load = (bytes: Uint8Array) =>
  Model.getRootAsModel(new flatbuffers.ByteBuffer(bytes));

const itemOf = (model: Model, localId: number) => {
  for (let i = 0; i < model.localIdsLength(); i++) {
    if (model.localIds(i) === localId) return getItems(model, [i]).get(localId);
  }
  return undefined;
};

describe("EditUtils.edit created items", () => {
  const base = load(pako.inflate(new Uint8Array(readFileSync(fixture))));
  const localId = base.maxLocalId() + 1;
  const created: EditRequest = {
    type: EditRequestType.CREATE_ITEM,
    localId,
    data: {
      category: "IFCWALL",
      guid: "created-guid",
      data: { Name: { value: "Before", type: "IFCLABEL" } },
    },
  };

  test("writes the latest update of an item created since the last save", () => {
    const updated: EditRequest = {
      type: EditRequestType.UPDATE_ITEM,
      localId,
      data: {
        category: "IFCWALLSTANDARDCASE",
        guid: "created-guid",
        data: {
          Name: { value: "After", type: "IFCLABEL" },
          Tag: { value: "T1", type: "IFCIDENTIFIER" },
        },
      },
    };
    const { model } = edit(base, [created, updated], { raw: true });
    expect(itemOf(load(model), localId)).toEqual(updated.data);
  });

  test("writes the creation attributes of an item without updates", () => {
    const { model } = edit(base, [created], { raw: true });
    expect(itemOf(load(model), localId)?.data.Name.value).toBe("Before");
  });
});
