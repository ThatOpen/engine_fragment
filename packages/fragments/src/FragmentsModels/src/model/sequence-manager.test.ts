import * as THREE from "three";
import { expect, test } from "vitest";
import { FragmentsModel } from "./fragments-model";
import { SequenceManager } from "./sequence-manager";

// Results come from the worker through postMessage, which copies them the way
// structuredClone() does: class instances in them arrive as plain objects.

// A model whose worker returns `result`.
const stubModel = (result: unknown) =>
  ({
    _invoke: async () => structuredClone(result),
  }) as unknown as FragmentsModel;

const sequenced = new SequenceManager();

test("getSequenced() returns merged boxes as THREE.Box3", async () => {
  const box = new THREE.Box3(
    new THREE.Vector3(0, 1, 2),
    new THREE.Vector3(3, 4, 5),
  );
  const model = stubModel(box);

  const result = await sequenced.getSequenced(model, "mergedBoxes", []);

  expect(result).toBeInstanceOf(THREE.Box3);
  expect(result!.equals(box)).toBe(true);
});

test("getSequenced() returns geometry transforms as THREE.Matrix4", async () => {
  const transform = new THREE.Matrix4().makeTranslation(1, 0, 0);
  const model = stubModel([[{ localId: 1, transform }]]);

  const result = await sequenced.getSequenced(model, "geometry", []);

  expect(result![0][0].transform).toBeInstanceOf(THREE.Matrix4);
  expect(result![0][0].transform.equals(transform)).toBe(true);
});

test("getSequenced() returns highlight colors as THREE.Color", async () => {
  const color = new THREE.Color(0x808080);
  const model = stubModel([
    { color, renderedFaces: 0, opacity: 1, transparent: false },
  ]);

  const result = await sequenced.getSequenced(model, "highlight", []);

  expect(result![0]!.color).toBeInstanceOf(THREE.Color);
  expect(result![0]!.color!.getHex()).toBe(0x808080);
});

test("getSequenced() returns null for a result the worker doesn't know", async () => {
  const model = stubModel(null);

  const result = await sequenced.getSequenced(model, "unknown" as any, []);

  expect(result).toBeNull();
});
