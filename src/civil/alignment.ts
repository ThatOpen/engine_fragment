import * as THREE from "three";
import { CivilCurve } from "./civil-curve";

export type AlignmentType = "vertical" | "horizontal" | "absolute";

export class Alignment {
  vertical: CivilCurve[] = [];
  horizontal: CivilCurve[] = [];
  absolute: CivilCurve[] = [];
  initialKP = 0;

  getLength(type: AlignmentType) {
    let length = 0;
    for (const curve of this[type]) {
      length += curve.getLength();
    }
    return length;
  }

  getPointAt(percentage: number, type: AlignmentType) {
    const found = this.getCurveAt(percentage, type);
    return found.curve.getPointAt(found.percentage);
  }

  // Returns the percentage or null if the point is not contained in this alignment
  getPercentageAt(point: THREE.Vector3, type: AlignmentType, tolerance = 0.01) {
    const alignment = this[type];
    let currentLength = 0;

    for (const curve of alignment) {
      const factor = curve.getPercentageAt(point, tolerance);
      const curveLength = curve.getLength();

      if (factor !== null) {
        // This segment has the point
        const foundLength = currentLength + factor * curveLength;
        const totalLength = this.getLength(type);
        return foundLength / totalLength;
      }

      currentLength += curveLength;
    }

    return null;
  }

  getCurveAt(percentage: number, type: AlignmentType) {
    if (percentage < 0) {
      percentage = 0;
    } else if (percentage > 1) {
      percentage = 1;
    }

    const alignment = this[type];
    const alignmentLength = this.getLength(type);
    const targetLength = alignmentLength * percentage;

    let accumulatedLength = 0;
    for (const curve of alignment) {
      const curveLength = curve.getLength();
      if (accumulatedLength + curveLength > targetLength) {
        const targetCurveLength = targetLength - accumulatedLength;
        const percentage = targetCurveLength / curveLength;
        return { curve, percentage };
      }
      accumulatedLength += curveLength;
    }

    throw new Error("Could not compute point!");
  }
}
