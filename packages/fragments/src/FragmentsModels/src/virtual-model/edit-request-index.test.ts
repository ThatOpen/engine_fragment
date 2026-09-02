import { readFileSync } from "node:fs";
import path from "node:path";
import pako from "pako";
import { describe, expect, test } from "vitest";
import { EditRequestIndex } from "./edit-request-index";
import { VirtualFragmentsModel } from "./virtual-fragments-model";
import { EditRequest, EditRequestType } from "../../../Utils";

const fixture = path.resolve(
  import.meta.dirname,
  "../../../../../..",
  "resources/frags/small_test.frag",
);

function loadModel() {
  const data = pako.inflate(new Uint8Array(readFileSync(fixture)));
  const model = new VirtualFragmentsModel(
    "edit-request-index-test",
    data as any,
    undefined as any,
  );
  model.setupData();
  return model;
}

// Reference implementations of the scans the index replaces
function scanLatest(
  requests: EditRequest[],
  localId: number,
  types: EditRequestType[],
) {
  for (let i = requests.length - 1; i >= 0; i--) {
    const request = requests[i] as EditRequest & { localId?: number };
    if (types.includes(request.type) && request.localId === localId) {
      return request;
    }
  }
  return undefined;
}

function scanDeleted(requests: EditRequest[]) {
  const deleted = new Set<number>();
  for (const request of requests) {
    if (request.type === EditRequestType.DELETE_ITEM) {
      deleted.add(request.localId as number);
    }
  }
  return deleted;
}

const item = (name: string, category = "IFCWALL") => ({
  category,
  data: { Name: { value: name, type: "IfcLabel" } },
});

describe("EditRequestIndex", () => {
  test("push, latest, first and deletedItems follow the request order", () => {
    const index = new EditRequestIndex();
    const create: EditRequest = {
      type: EditRequestType.CREATE_ITEM,
      localId: 7,
      data: item("a"),
    };
    const update: EditRequest = {
      type: EditRequestType.UPDATE_ITEM,
      localId: 7,
      data: item("b"),
    };
    const remove: EditRequest = {
      type: EditRequestType.DELETE_ITEM,
      localId: 7,
    };
    index.push(create);
    index.push(update);

    expect(
      index.latest(7, EditRequestType.CREATE_ITEM, EditRequestType.UPDATE_ITEM),
    ).toBe(update);
    expect(index.first(7, EditRequestType.CREATE_ITEM)).toBe(create);
    expect(index.latest(7, EditRequestType.CREATE_RELATION)).toBeUndefined();
    expect(index.latest(8, EditRequestType.CREATE_ITEM)).toBeUndefined();
    expect(index.deletedItems.has(7)).toBe(false);

    index.push(remove);
    expect(index.deletedItems.has(7)).toBe(true);

    index.pop(remove);
    expect(index.deletedItems.has(7)).toBe(false);
    index.pop(update);
    expect(
      index.latest(7, EditRequestType.CREATE_ITEM, EditRequestType.UPDATE_ITEM),
    ).toBe(create);
    index.pop(create);
    expect(index.latest(7, EditRequestType.CREATE_ITEM)).toBeUndefined();
  });

  test("a deleted item stays deleted until every DELETE_ITEM is popped", () => {
    const index = new EditRequestIndex();
    const first: EditRequest = {
      type: EditRequestType.DELETE_ITEM,
      localId: 3,
    };
    const second: EditRequest = {
      type: EditRequestType.DELETE_ITEM,
      localId: 3,
    };
    index.push(first);
    index.push(second);
    index.pop(second);
    expect(index.deletedItems.has(3)).toBe(true);
    index.pop(first);
    expect(index.deletedItems.has(3)).toBe(false);
  });

  test("index requests are ignored and sync rebuilds a replaced array", () => {
    const index = new EditRequestIndex();
    const requests: EditRequest[] = [
      {
        type: EditRequestType.CREATE_INDEX,
        data: { name: "idx", keys: [], values: [] } as any,
      },
      { type: EditRequestType.DELETE_ITEM, localId: 1 },
    ];
    index.sync(requests);
    expect(index.deletedItems.has(1)).toBe(true);

    // Same array, same length: no rebuild needed
    index.sync(requests);
    expect(index.deletedItems.has(1)).toBe(true);

    // Length drift (external mutation) is picked up
    requests.push({ type: EditRequestType.DELETE_ITEM, localId: 2 });
    index.sync(requests);
    expect(index.deletedItems.has(2)).toBe(true);

    // A replaced array is rebuilt from scratch
    index.sync([]);
    expect(index.deletedItems.size).toBe(0);
  });
});

describe("VirtualFragmentsModel property reads through the request index", () => {
  test("created, updated, related and deleted items resolve like the full scans", () => {
    const model = loadModel();
    const [existing, other] = model.getLocalIds();
    const originalName = model.getItemAttributes(existing)?.Name?.value;
    const [existingCategory] = model.getItemsCategories([existing]);

    const { ids } = model.edit([
      { type: EditRequestType.CREATE_ITEM, data: item("New wall") },
    ]);
    const created = ids[0] as number;

    expect(model.getItemAttributes(created)).toEqual(item("New wall").data);
    expect(model.getItemsCategories([created])).toEqual(["IFCWALL"]);

    model.edit([
      {
        type: EditRequestType.UPDATE_ITEM,
        localId: existing,
        data: item("Renamed", existingCategory!),
      },
      {
        type: EditRequestType.CREATE_RELATION,
        localId: created,
        data: { data: { IsDefinedBy: [existing, other] } },
      },
      { type: EditRequestType.DELETE_ITEM, localId: other },
    ]);

    expect(model.getItemAttributes(existing)?.Name?.value).toBe("Renamed");
    expect(model.getItemRelations(created)).toEqual({
      IsDefinedBy: [existing, other],
    });
    expect(model.getItemsData([other], { attributesDefault: true })).toEqual([
      {},
    ]);
    expect(
      model.getItemsData([created], {
        attributesDefault: true,
        relations: { IsDefinedBy: { attributes: true, relations: false } },
      })[0].IsDefinedBy,
    ).toHaveLength(1); // the deleted relation target is skipped

    // Same answers as scanning the whole requests list
    const attrTypes = [
      EditRequestType.CREATE_ITEM,
      EditRequestType.UPDATE_ITEM,
    ];
    for (const id of [existing, other, created]) {
      expect(model.requestIndex.latest(id, ...attrTypes)).toBe(
        scanLatest(model.requests, id, attrTypes),
      );
    }
    expect(model.requestIndex.deletedItems).toEqual(
      scanDeleted(model.requests),
    );

    // Undo / redo / reset keep the index in step with the history
    model.undo();
    expect(model.requestIndex.deletedItems.size).toBe(0);
    expect(model.getItemRelations(created)).toEqual({
      IsDefinedBy: [existing, other],
    });
    model.redo();
    expect(model.requestIndex.deletedItems.has(other)).toBe(true);

    model.reset();
    expect(model.requestIndex.deletedItems.size).toBe(0);
    expect(model.getItemAttributes(created)).toBeNull();
    expect(model.getItemAttributes(existing)?.Name?.value).toBe(originalName);
  });

  test("restoring, selecting and externally mutating the history rebuilds the index", () => {
    const model = loadModel();
    const [existing] = model.getLocalIds();
    const [existingCategory] = model.getItemsCategories([existing]);

    model.edit([
      {
        type: EditRequestType.UPDATE_ITEM,
        localId: existing,
        data: item("First", existingCategory!),
      },
    ]);
    model.edit([
      {
        type: EditRequestType.UPDATE_ITEM,
        localId: existing,
        data: item("Second", existingCategory!),
      },
    ]);
    const saved = model.getRequests().requests.slice();

    model.reset();
    expect(model.getItemAttributes(existing)?.Name?.value).not.toBe("Second");

    model.setRequests({ requests: saved });
    expect(model.getItemAttributes(existing)?.Name?.value).toBe("Second");

    model.selectRequest(0);
    expect(model.getItemAttributes(existing)?.Name?.value).toBe("First");

    model.requests.push({
      type: EditRequestType.UPDATE_ITEM,
      localId: existing,
      data: item("Third", existingCategory!),
    });
    expect(model.getItemAttributes(existing)?.Name?.value).toBe("Third");
  });
});
