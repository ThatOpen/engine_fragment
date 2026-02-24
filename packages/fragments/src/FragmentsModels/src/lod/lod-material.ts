import * as THREE from "three";
import { LineMaterialParameters } from "three/examples/jsm/lines/LineMaterial.js";
import { LodHelper } from "./lod-helper";

export class LodMaterial extends THREE.ShaderMaterial {
  readonly isLodMaterial = true;
  readonly isLineMaterial = true;

  get lodSize(): THREE.Vector2 {
    return this.uniforms.lodSize.value;
  }

  set lodColor(color: THREE.Color) {
    this.uniforms.lodColor.value = color;
  }

  set lodSize(value: THREE.Vector2) {
    this.uniforms.lodSize.value.copy(value);
  }

  get lodColor(): THREE.Color {
    return this.uniforms.lodColor.value;
  }

  set lodOpacity(value: number) {
    this.uniforms.lodOpacity.value = value;
  }

  get lodOpacity(): number {
    return this.uniforms.lodOpacity.value;
  }

  set highlightColor(color: THREE.Color) {
    this.uniforms.highlightColor.value = color;
  }

  get highlightColor(): THREE.Color {
    return this.uniforms.highlightColor.value;
  }

  set highlightOpacity(value: number) {
    this.uniforms.highlightOpacity.value = value;
  }

  get highlightOpacity(): number {
    return this.uniforms.highlightOpacity.value;
  }

  constructor(parameters: LineMaterialParameters) {
    super(LodHelper.newLodMaterialParams(parameters));
    this.clipping = true;
    this.lights = false;
    this.needsUpdate = true;
  }
}
