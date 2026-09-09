import { describe, expect, test } from "vitest";
import * as THREE from "three";
import { MaterialDefinition } from "../../model/model-types";
import { MaterialManager } from "../../model/material-manager";
import { VirtualMaterialController } from "./virtual-material-controller";

function harness() {
  const definitions: MaterialDefinition[] = [];
  const renderer = new MaterialManager();
  const controller = new VirtualMaterialController("model", (event) => {
    definitions.push(...event.materialDefinitions);
    renderer.addDefinitions("model", event.materialDefinitions);
  });
  return { controller, definitions, renderer };
}

const original = (opacity = 1): MaterialDefinition => ({
  color: new THREE.Color(0.8, 0.2, 0.1),
  opacity,
  transparent: opacity < 1,
  renderedFaces: 0,
});

const opacityOverride = (opacity: number) =>
  ({
    opacity,
    transparent: opacity < 1,
    preserveOriginalMaterial: true,
    _explicitProps: ["opacity", "transparent"],
  }) as MaterialDefinition;

describe("preserved material definitions", () => {
  test("reuses identical overrides across items and repeated slider values", () => {
    const { controller, definitions } = harness();
    controller.transfer([original()]);
    const first = controller.transfer([opacityOverride(0.25)])[0];
    controller.transfer([opacityOverride(0.5)]);
    const ids = controller.transfer(
      Array.from({ length: 1000 }, () => opacityOverride(0.25)),
    );
    expect(new Set(ids)).toEqual(new Set([first]));
    expect(definitions).toHaveLength(3);
  });

  test("a reused color override preserves each original opacity", () => {
    const { controller, renderer } = harness();
    const bases = controller.transfer([original(1), original(0.2)]);
    const override = {
      color: new THREE.Color(0, 1, 0),
      preserveOriginalMaterial: true,
      _explicitProps: ["color"],
    } as MaterialDefinition;
    const [a, b] = controller.transfer([override, { ...override }]);
    expect(a).toBe(b);
    expect(renderer.getHighlightProps(a, bases[0], "model")?.opacity).toBe(1);
    expect(renderer.getHighlightProps(b, bases[1], "model")?.opacity).toBe(0.2);
  });

  test("does not alias different depth, transparency, custom ID or inheritance semantics", () => {
    const { controller } = harness();
    const base = original();
    const variants = [
      base,
      { ...base, depthWrite: false },
      { ...base, depthTest: false },
      { ...base, transparent: true },
      { ...base, customId: "selection" },
      { ...base, localId: 12 },
      { ...base, preserveOriginalMaterial: true, _explicitProps: ["color"] },
      { ...base, preserveOriginalMaterial: true, _explicitProps: ["opacity"] },
    ];
    expect(new Set(controller.transfer(variants)).size).toBe(variants.length);
  });

  test("explicit property order does not create a new override", () => {
    const { controller } = harness();
    const a = opacityOverride(0.4);
    const b = { ...a, _explicitProps: ["transparent", "opacity", "opacity"] };
    const ids = controller.transfer([a, b]);
    expect(ids[0]).toBe(ids[1]);
  });
});
