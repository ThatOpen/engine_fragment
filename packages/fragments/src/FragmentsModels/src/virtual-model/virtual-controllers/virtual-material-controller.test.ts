import { describe, expect, test } from "vitest";
import * as THREE from "three";
import {
  MaterialDefinition,
  ObjectClass,
  CurrentLod,
} from "../../model/model-types";
import { MaterialManager } from "../../model/material-manager";
import { HighlightHelper } from "../virtual-helpers/highlight-helper";
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
  test("rendered materials distinguish named depth properties, independently of insertion order", () => {
    const { renderer } = harness();
    const request = {
      modelId: "model",
      objectClass: ObjectClass.SHELL,
      currentLod: CurrentLod.GEOMETRY,
    };
    const noWrite = renderer.get({ ...original(), depthWrite: false }, request);
    const noTest = renderer.get({ ...original(), depthTest: false }, request);
    expect(noWrite).not.toBe(noTest);
    expect(noTest.depthWrite).toBe(true);
    expect(noTest.depthTest).toBe(false);
    expect(renderer.get({ depthWrite: false, ...original() }, request)).toBe(
      noWrite,
    );
  });
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

describe("polygon offset depth bias", () => {
  const request = {
    modelId: "model",
    objectClass: ObjectClass.SHELL,
    currentLod: CurrentLod.GEOMETRY,
  };

  test("does not alias definitions that differ only in depth bias", () => {
    const { controller } = harness();
    const base = original();
    const variants = [
      base,
      { ...base, polygonOffsetFactor: -1 },
      { ...base, polygonOffsetFactor: -2 },
      { ...base, polygonOffsetUnits: -1 },
      { ...base, polygonOffsetFactor: -1, polygonOffsetUnits: -1 },
    ];
    const ids = controller.transfer(variants);
    expect(new Set(ids).size).toBe(variants.length);
    const repeat = controller.transfer([
      { ...base, polygonOffsetFactor: -1, polygonOffsetUnits: -1 },
    ]);
    expect(repeat[0]).toBe(ids[4]);
  });

  test("a biased definition produces a material with polygonOffset enabled", () => {
    const { renderer } = harness();
    const biased = renderer.get(
      { ...original(), polygonOffsetFactor: -1, polygonOffsetUnits: -2 },
      request,
    ) as THREE.MeshLambertMaterial;
    expect(biased.polygonOffset).toBe(true);
    expect(biased.polygonOffsetFactor).toBe(-1);
    expect(biased.polygonOffsetUnits).toBe(-2);
    const unitsOnly = renderer.get(
      { ...original(), polygonOffsetUnits: -4 },
      request,
    ) as THREE.MeshLambertMaterial;
    expect(unitsOnly.polygonOffset).toBe(true);
    expect(unitsOnly.polygonOffsetFactor).toBe(0);
    expect(unitsOnly.polygonOffsetUnits).toBe(-4);
  });

  test("a definition without bias keeps today's defaults", () => {
    const { renderer } = harness();
    const plain = renderer.get(original(), request) as THREE.MeshLambertMaterial;
    expect(plain.polygonOffset).toBe(false);
    expect(plain.polygonOffsetFactor).toBe(0);
    expect(plain.polygonOffsetUnits).toBe(0);
    const zero = renderer.get(
      { ...original(), polygonOffsetFactor: 0, polygonOffsetUnits: 0 },
      request,
    ) as THREE.MeshLambertMaterial;
    expect(zero.polygonOffset).toBe(false);
  });

  test("a later highlight without bias inherits the previous highlight's bias and depth flags", () => {
    const helper = new HighlightHelper();
    const pastHigh: MaterialDefinition = {
      ...original(),
      depthTest: false,
      depthWrite: false,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
    };
    const model = { materials: { fetch: () => pastHigh } };
    const newHigh = (helper as any).getNewHighFromPast(model, 1, {
      color: new THREE.Color(0, 1, 0),
    });
    expect(newHigh.polygonOffsetFactor).toBe(-1);
    expect(newHigh.polygonOffsetUnits).toBe(-2);
    expect(newHigh.depthTest).toBe(false);
    expect(newHigh.depthWrite).toBe(false);
    expect(newHigh.color).toEqual(new THREE.Color(0, 1, 0));
  });
});
