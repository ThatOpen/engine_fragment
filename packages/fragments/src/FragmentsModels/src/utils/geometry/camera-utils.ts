import * as THREE from "three";
import { PlanesUtils } from "./planes-utils";

export class CameraUtils {
  static transform(
    input: THREE.Frustum,
    transform: THREE.Matrix4,
    result = new THREE.Frustum(),
  ) {
    for (let i = 0; i < result.planes.length; i++) {
      const resultPlane = result.planes[i];
      const inputPlane = input.planes[i];
      resultPlane.copy(inputPlane);
      resultPlane.applyMatrix4(transform);
    }
    return result;
  }

  static isIncluded(box: THREE.Box3, ps: THREE.Plane[]) {
    return PlanesUtils.collides(box, ps, true);
  }

  static collides(box: THREE.Box3, ps: THREE.Plane[]) {
    return PlanesUtils.collides(box, ps, false);
  }
}
