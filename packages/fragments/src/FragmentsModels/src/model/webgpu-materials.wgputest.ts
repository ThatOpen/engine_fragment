// Runs ONLY under vitest.config-webgpu.ts (three -> three.webgpu):
//   npx vitest --run --config vitest.config-webgpu.ts
// Under classic three the WebGPU branches are inactive and these asserts
// would be false reds, hence the .wgputest.ts suffix.
//
// It pins the premise (three.webgpu has no UniformsUtils, so the GLSL
// LodMaterial cannot be built there) and that the TSL side constructs: the
// LOD ribbon's node twin, the target-aware MRT, and MaterialManager choosing
// them. No GPU: graphs are built, not compiled.
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { LodNodeMaterial } from "../lod/lod-node-material";
import { targetAwareMRT } from "./target-aware-mrt";

describe("materials under three.webgpu", () => {
  it("this build IS webgpu and does NOT carry the GLSL utilities", () => {
    expect(typeof (THREE as any).WebGPURenderer).toBe("function");
    expect((THREE as any).UniformsUtils).toBeUndefined();
    expect((THREE as any).UniformsLib).toBeUndefined();
    expect(typeof (THREE as any).TSL).toBe("object");
    expect(typeof (THREE as any).NodeMaterial).toBe("function");
    expect(typeof (THREE as any).MRTNode).toBe("function");
  });

  it("the LOD TSL twin constructs, with the surface the library mutates", () => {
    const material = new LodNodeMaterial({
      color: new THREE.Color(0x888888),
      opacity: 0.9,
      transparent: true,
    }) as any;

    expect(material.isLodMaterial).toBe(true);
    expect(material.isLineMaterial).toBe(true);
    expect(material.isLodNodeMaterial).toBe(true);
    expect(material.isNodeMaterial).toBe(true);

    // vertexNode = the screen-space ribbon; outputNode (not fragmentNode, so
    // a pass MRT still applies) = the base/highlight mix.
    expect(material.vertexNode).toBeTruthy();
    expect(material.outputNode).toBeTruthy();
    expect(material.fragmentNode ?? null).toBeNull();

    material.lodColor = new THREE.Color(0x123456);
    expect(material.uniforms.lodColor.value.getHex()).toBe(0x123456);
    material.lodOpacity = 0.5;
    expect(material.uniforms.lodOpacity.value).toBe(0.5);
    material.lodSize = new THREE.Vector2(800, 600);
    expect(material.uniforms.lodSize.value.x).toBe(800);
    expect(material.lodSize.y).toBe(600);
    material.highlightOpacity = 0.7;
    expect(material.uniforms.highlightOpacity.value).toBe(0.7);
    expect(material.transparent).toBe(true);

    material.dispose();
  });

  it("the target-aware MRT is an MRT node and merges into its own kind", () => {
    const { TSL } = THREE as any;
    const a = targetAwareMRT({ output: TSL.output });
    const b = targetAwareMRT({
      face: TSL.vec4(TSL.attribute("color", "vec3"), 0),
    });
    expect(a).toBeInstanceOf((THREE as any).MRTNode);
    const merged = a.merge(b);
    expect(merged.constructor).toBe(a.constructor);
    expect(Object.keys(merged.outputNodes).sort()).toEqual(["face", "output"]);
  });

  it("MaterialManager builds the LOD twin and gives shells a face MRT", async () => {
    // Imported here so a failure of the wider module graph under this build
    // shows up as this test, not as the whole file.
    const { MaterialManager } = await import("./material-manager");
    const manager = new MaterialManager();
    manager.addDefinitions("m", [
      {
        color: new THREE.Color(0xff0000),
        renderedFaces: 0,
        opacity: 1,
        transparent: false,
      } as any,
    ]);
    const lod = manager.getFromRequest({
      modelId: "m",
      objectClass: 0, // ObjectClass.LINE
      currentLod: 1, // CurrentLod.WIRES
      material: 0,
    }) as any;
    expect(lod.isLodNodeMaterial).toBe(true);

    const shell = manager.getFromRequest({
      modelId: "m",
      objectClass: 1, // ObjectClass.SHELL
      currentLod: 0, // CurrentLod.GEOMETRY
      material: 0,
    }) as any;
    expect(shell.isMeshLambertMaterial).toBe(true);
    expect(shell.mrtNode).toBeInstanceOf((THREE as any).MRTNode);
    expect(Object.keys(shell.mrtNode.outputNodes).sort()).toEqual([
      "face",
      "output",
    ]);

    // Capture is the WebGL deferred path: the twin ignores it.
    manager.setCaptureEmission(true);
    expect(lod.userData.hasCaptureEmission).toBeUndefined();
    manager.setCaptureEmission(false);
  });
});
