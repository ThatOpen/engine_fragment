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

  constructor(parameters: LineMaterialParameters) {
    super(LodHelper.newLodMaterialParams(parameters));
    this.clipping = true;
    this.lights = false;
    this.needsUpdate = true;
  }
}
