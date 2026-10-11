import { readFileSync } from "node:fs";
import path from "node:path";
import pako from "pako";
import * as flatbuffers from "flatbuffers";
import { describe, expect, test } from "vitest";
import { Model } from "../../Schema";
import { getItems } from "./fetch-functions";

/**
 * getItems read `guids(i)` with the item index i, but `guids` is parallel to
 * `guidsItems` (localIds of the items that have a guid). As soon as one item
 * has no guid, every later guid shifted onto the wrong item, and items without
 * a guid got another item's.
 */

const fixture = path.resolve(
  import.meta.dirname,
  "../../../../..",
  "resources/frags/small_test.frag",
);

describe("EditUtils.getItems guid", () => {
  test("returns each item's own guid, and none for items without one", () => {
    const data = pako.inflate(new Uint8Array(readFileSync(fixture)));
    const model = Model.getRootAsModel(new flatbuffers.ByteBuffer(data));

    const expected = new Map<number, string>();
    for (let j = 0; j < model.guidsItemsLength(); j++) {
      expected.set(model.guidsItems(j)!, model.guids(j)!);
    }
    // The fixture must have items without a guid, or it can't show the shift.
    expect(expected.size).toBeLessThan(model.localIdsLength());

    const items = getItems(model);
    expect(items.size).toBe(model.localIdsLength());
    for (const [localId, item] of items) {
      expect(item.guid).toBe(expected.get(localId));
    }
  });
});
