import * as THREE from "three";
import { expect, test } from "vitest";
import { FragmentsModel } from "./fragments-model";
import { HighlightManager } from "./highlight-manager";
import { MaterialDefinition } from "./model-types";

// Material definitions come from the worker through postMessage, which copies
// them the way structuredClone() does: a THREE.Color arrives as a plain
// object that still has `isColor`. Grey tells a second sRGB conversion
// apart, which pure red doesn't.

const grey = new THREE.Color(0x808080);

const definition = (color: THREE.Color): MaterialDefinition => ({
  color,
  renderedFaces: 0,
  opacity: 1,
  transparent: false,
});

// A model whose worker returns `result`.
const stubModel = (result: unknown) =>
  ({
    _invoke: async () => structuredClone(result),
  }) as unknown as FragmentsModel;

test("getHighlight() returns colors as THREE.Color", async () => {
  const model = stubModel([definition(grey), undefined]);

  const [highlight, none] = await new HighlightManager().getHighlight(model);

  expect(highlight.color).toBeInstanceOf(THREE.Color);
  expect(highlight.color.getHex()).toBe(0x808080);
  expect(none).toBeUndefined();
});

test("getItemsMaterialDefinition() returns colors as THREE.Color", async () => {
  const model = stubModel([{ definition: definition(grey), localIds: [1] }]);

  const [{ definition: result }] =
    await FragmentsModel.prototype.getItemsMaterialDefinition.call(model, [1]);

  expect(result.color).toBeInstanceOf(THREE.Color);
  expect(result.color.getHex()).toBe(0x808080);
});
