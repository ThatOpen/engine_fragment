import { readFileSync } from "node:fs";
import path from "node:path";
import pako from "pako";
import { expect, test, vi } from "vitest";
import { VirtualFragmentsModel } from "./virtual-fragments-model";
import { ModelUid } from "../model/model-types";

const fixture = path.resolve(
  import.meta.dirname,
  "../../../../../..",
  "resources/frags/small_test.frag",
);

function loadModel() {
  const data = pako.inflate(new Uint8Array(readFileSync(fixture)));
  return new VirtualFragmentsModel(
    1 as ModelUid,
    data as any,
    undefined as any,
  );
}

test("a model saved without metadata has empty metadata and no CRS", () => {
  const model = loadModel();
  vi.spyOn(model.data, "metadata").mockReturnValue(null);

  expect(model.getMetadata()).toEqual({});
  expect(model.getCRS()).toBeNull();
});

test("a model saved with metadata returns it", () => {
  const model = loadModel();

  expect(model.getMetadata()).toEqual(JSON.parse(model.data.metadata()!));
});
