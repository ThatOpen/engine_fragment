import * as THREE from "three";
import { expect, test } from "vitest";
import { EditManager } from "./edit-manager";
import { FragmentsModel } from "./fragments-model";

// Geometries come from the worker through postMessage, which copies them the
// way structuredClone() does: a THREE.Matrix4 arrives as a plain object.

const translation = (x: number) => new THREE.Matrix4().makeTranslation(x, 0, 0);

// A model, and optionally its delta model, whose worker returns `result`.
const stubModel = (result: unknown, delta?: FragmentsModel) =>
  ({
    _invoke: async () => structuredClone(result),
    _getDeltaModel: () => delta,
  }) as unknown as FragmentsModel;

test("getItemsGeometry() returns transforms as THREE.Matrix4", async () => {
  const delta = stubModel([[{ localId: 2, transform: translation(2) }]]);
  const model = stubModel([[{ localId: 1, transform: translation(1) }]], delta);

  const geometries = await new EditManager().getItemsGeometry(model, [1, 2], 0);

  const transforms = geometries.map(([geometry]) => geometry.transform);
  expect(transforms).toHaveLength(2);
  for (const transform of transforms) {
    expect(transform).toBeInstanceOf(THREE.Matrix4);
  }
  expect(transforms[0].equals(translation(1))).toBe(true);
  expect(transforms[1].equals(translation(2))).toBe(true);
});

test("getGeometries() returns transforms as THREE.Matrix4", async () => {
  const delta = stubModel([{ representationId: 2, transform: translation(2) }]);
  const model = stubModel(
    [{ representationId: 1, transform: translation(1) }],
    delta,
  );

  const geometries = await new EditManager().getGeometries(model, [1, 2]);

  expect(geometries).toHaveLength(2);
  for (const { transform } of geometries) {
    expect(transform).toBeInstanceOf(THREE.Matrix4);
  }
  expect(geometries[1].transform.equals(translation(2))).toBe(true);
});
