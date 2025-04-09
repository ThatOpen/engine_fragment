import * as THREE from "three";

export class PlanesUtils {
  private static tempPoint = new THREE.Vector3();
  private static dimensions = ["x", "y", "z"] as const;

  static containedInParallelPlanes(ps: THREE.Plane[], point: THREE.Vector3) {
    let result = true;
    for (const clipPlane of ps) {
      const distance = clipPlane.distanceToPoint(point);
      const isInFront = distance >= 0;
      result = result && isInFront;
    }
    return result;
  }

  static collides(box: THREE.Box3, ps: THREE.Plane[], included: boolean) {
    for (const plane of ps) {
      const distance = this.getPointDistance(plane, included, box);
      if (distance < 0) {
        return false;
      }
    }
    return true;
  }

  private static getPointDistance(
    plane: THREE.Plane,
    included: boolean,
    box: THREE.Box3,
  ) {
    const normal = plane.normal;
    for (const dim of this.dimensions) {
      const isPositive = normal[dim] >= 0.0;
      const isMax = isPositive !== included;
      if (isMax) {
        this.tempPoint[dim] = box.max[dim];
      } else {
        this.tempPoint[dim] = box.min[dim];
      }
    }
    return plane.distanceToPoint(this.tempPoint);
  }
}
