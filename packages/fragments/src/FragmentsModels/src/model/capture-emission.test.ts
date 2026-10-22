import { describe, expect, test } from "vitest";
import * as THREE from "three";
import { MaterialManager } from "./material-manager";
import { MaterialDefinition, ObjectClass } from "./model-types";
import { LodMaterial } from "../lod";

/**
 * Deferred capture emission, in process (no GPU): what MaterialManager
 * reports and installs when a deferred renderer turns capture on and off,
 * and that nothing at all is installed while it stays off (the default).
 */

const definition = (hex: number, opacity = 1): MaterialDefinition =>
  ({
    color: new THREE.Color(hex),
    renderedFaces: 0,
    opacity,
    transparent: opacity < 1,
  }) as MaterialDefinition;

const shell = (material: number) => ({
  modelId: "m",
  objectClass: ObjectClass.SHELL,
  currentLod: 0, // CurrentLod.GEOMETRY (a const enum)
  material,
});

const line = (material: number) => ({
  modelId: "m",
  objectClass: ObjectClass.LINE,
  currentLod: 1, // CurrentLod.WIRES
  material,
});

const setup = () => {
  const manager = new MaterialManager();
  manager.addDefinitions("m", [
    definition(0xff0000),
    definition(0x00ff00, 0.5),
    definition(0x0000ff),
  ]);
  return manager;
};

const lambertShader = () => ({
  uniforms: {} as Record<string, { value: any }>,
  vertexShader: THREE.ShaderLib.lambert.vertexShader,
  fragmentShader: THREE.ShaderLib.lambert.fragmentShader,
});

const defaultCompile = THREE.Material.prototype.onBeforeCompile;

describe("deferred capture emission", () => {
  test("off by default: no define, no flag, no shader patch on any material", () => {
    const manager = setup();
    const a = manager.getFromRequest(shell(0)) as THREE.MeshLambertMaterial;
    const b = manager.getFromRequest(shell(1)) as THREE.MeshLambertMaterial;
    const lod = manager.getFromRequest(line(2)) as LodMaterial;

    expect(manager.captureEmission).toBe(false);
    for (const m of [a, b]) {
      expect(m).toBeInstanceOf(THREE.MeshLambertMaterial);
      expect(m.userData.hasCaptureEmission).toBeUndefined();
      expect(m.onBeforeCompile).toBe(defaultCompile);
      expect(Object.keys(m.defines ?? {})).toEqual([]);
    }
    expect(lod).toBeInstanceOf(LodMaterial);
    expect(lod.userData.hasCaptureEmission).toBeUndefined();
    expect(lod.defines.CAPTURE_EMISSION).toBeUndefined();
    expect(manager.list.size).toBe(3);

    // Turning it off when it was never on is a no-op.
    manager.setCaptureEmission(false);
    expect(a.onBeforeCompile).toBe(defaultCompile);
    expect(a.userData.hasCaptureEmission).toBeUndefined();
  });

  test("on: every live SHELL and LOD material emits, off: the define goes away", () => {
    const manager = setup();
    const a = manager.getFromRequest(shell(0)) as THREE.MeshLambertMaterial;
    const lod = manager.getFromRequest(line(2)) as LodMaterial;

    manager.setCaptureEmission(true);
    expect(manager.captureEmission).toBe(true);
    expect(a.userData.hasCaptureEmission).toBe(true);
    expect(a.defines!.CAPTURE_EMISSION).toBe("");
    expect(a.onBeforeCompile).not.toBe(defaultCompile);
    const keyOn = a.customProgramCacheKey();
    expect(keyOn.endsWith("|capture:1")).toBe(true);
    expect(lod.userData.hasCaptureEmission).toBe(true);
    expect(lod.defines.CAPTURE_EMISSION).toBe("");

    // A material created while capture is on (a tile loaded mid-session).
    const late = manager.getFromRequest(shell(1)) as THREE.MeshLambertMaterial;
    expect(late.userData.hasCaptureEmission).toBe(true);
    expect(late.defines!.CAPTURE_EMISSION).toBe("");

    manager.setCaptureEmission(false);
    expect(manager.captureEmission).toBe(false);
    for (const m of [a, late]) {
      expect(m.defines!.CAPTURE_EMISSION).toBeUndefined();
      expect(m.userData.hasCaptureEmission).toBe(true);
      // Two cached variants, one per state; no material count change.
      expect(m.customProgramCacheKey().endsWith("|capture:0")).toBe(true);
      expect(m.customProgramCacheKey()).not.toBe(keyOn);
    }
    expect(lod.defines.CAPTURE_EMISSION).toBeUndefined();
    expect(manager.list.size).toBe(3);

    // A material created after capture was turned off carries nothing.
    manager.addDefinitions("m", [definition(0xffffff)]);
    const after = manager.getFromRequest(shell(3)) as THREE.MeshLambertMaterial;
    expect(after.userData.hasCaptureEmission).toBeUndefined();
    expect(after.onBeforeCompile).toBe(defaultCompile);
  });

  test("the injection finds its anchors in three's lambert shader and shares the pixel size", () => {
    const manager = setup();
    const a = manager.getFromRequest(shell(0)) as THREE.MeshLambertMaterial;
    manager.setCaptureEmission(true);

    const shader = lambertShader();
    a.onBeforeCompile(shader as any, undefined as any);
    expect(shader.vertexShader).toContain("vCaptureFaceId = color;");
    expect(shader.vertexShader).toContain("captureIdHash");
    expect(shader.fragmentShader).toContain(
      "gCaptureFaceId = vec4(vCaptureFaceId, captureRole);",
    );
    expect(shader.fragmentShader).toContain("gCaptureNormal = captureOctEncode");
    expect(shader.uniforms.captureTargetPixels).toBeDefined();

    manager.setCapturePixels(800, 600);
    expect(shader.uniforms.captureTargetPixels.value.x).toBe(800);
    expect(shader.uniforms.captureTargetPixels.value.y).toBe(600);
    manager.setCapturePixels(0, 0);
    expect(shader.uniforms.captureTargetPixels.value.x).toBe(0);
  });
});
