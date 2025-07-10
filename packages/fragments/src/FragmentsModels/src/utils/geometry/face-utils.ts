import * as THREE from "three";

export class FaceUtils {
  static getEarcutDimensions(normal: THREE.Vector3) {
    // Project points in 2D for earcut algorithm, which only works in 2D

    const absX = Math.abs(normal.x);
    const absY = Math.abs(normal.y);
    const absZ = Math.abs(normal.z);

    const xDim = 0;
    const yDim = 1;
    const zDim = 2;

    const isMostlyHorizontal = absZ > absX && absZ > absY;
    if (isMostlyHorizontal) {
      const lookingUp = normal.z > 0;
      if (lookingUp) {
        return [xDim, yDim];
      }
      return [yDim, xDim];
    }

    const isMostlyLookingToY = absY > absX && absY > absZ;
    if (isMostlyLookingToY) {
      const isLookingYPositive = normal.y > 0;
      if (isLookingYPositive) {
        return [zDim, xDim];
      }
      return [xDim, zDim];
    }

    // At this point, we know that the normal is mostly looking to the X axis

    const isLookingXPositive = normal.x > 0;
    if (isLookingXPositive) {
      return [yDim, zDim];
    }

    return [zDim, yDim];
  }
}
