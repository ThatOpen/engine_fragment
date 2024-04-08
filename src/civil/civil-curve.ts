import * as THREE from "three";
import { Alignment } from "./alignment";
import { CurveMesh } from "./curve-mesh";

export class CivilCurve {
  index: number;
  mesh: CurveMesh;
  data: { [name: string]: any };
  alignment: Alignment;

  private get _index() {
    return this.mesh.geometry.index as THREE.BufferAttribute;
  }

  private get _pos() {
    return this.mesh.geometry.attributes.position.array;
  }

  constructor(
    index: number,
    mesh: CurveMesh,
    data: { [name: string]: any },
    alignment: Alignment
  ) {
    this.index = index;
    this.mesh = mesh;
    this.data = data;
    this.alignment = alignment;
  }

  getLength() {
    let length = 0;
    for (let i = 0; i < this._index.array.length - 1; i += 2) {
      const { startPoint, endPoint } = this.getSegment(i);
      length += startPoint.distanceTo(endPoint);
    }
    return length;
  }

  getPointAt(percentage: number) {
    // Strategy: get start-end segment, normalize it,
    // multiply by target length and add it to start point
    const { startPoint, endPoint, distanceToStart } =
      this.getSegmentAt(percentage);

    const targetPoint = endPoint.clone();
    targetPoint.sub(startPoint);
    targetPoint.normalize();
    targetPoint.multiplyScalar(distanceToStart);
    targetPoint.add(startPoint);
    return targetPoint;
  }

  getSegmentAt(percentage: number) {
    if (percentage < 0) {
      percentage = 0;
    } else if (percentage > 1) {
      percentage = 1;
    }

    const totalLength = this.getLength();
    const targetLength = totalLength * percentage;

    let accumulatedLength = 0;

    for (let index = 0; index < this._index.array.length - 1; index += 2) {
      const { startPoint, endPoint } = this.getSegment(index);
      const segmentLength = startPoint.distanceTo(endPoint);
      if (accumulatedLength + segmentLength > targetLength) {
        // Position is the distance from the startPoint to the target point
        const distanceToStart = targetLength - accumulatedLength;
        return { distanceToStart, index, startPoint, endPoint };
      }
      accumulatedLength += segmentLength;
    }

    throw new Error("Could not compute point");
  }

  // Returns the percentage or null if the point is not contained in this curve
  getPercentageAt(point: THREE.Vector3, tolerance = 0.01) {
    let currentLength = 0;

    for (let i = 0; i < this._index.array.length - 1; i += 2) {
      const { startPoint, endPoint } = this.getSegment(i);
      // Strategy: all points contained in a segment fulfill that
      // distanceToStart + distanceToEnd = segmentLength

      const segmentLength = startPoint.distanceTo(endPoint);
      const startLength = point.distanceTo(startPoint);
      const endLength = point.distanceTo(endPoint);
      const combinedLength = startLength + endLength;

      const hasPoint = combinedLength - segmentLength <= tolerance;

      if (hasPoint) {
        // Length from start to the found point
        const foundLength = currentLength + startLength;
        const totalLength = this.getLength();
        return foundLength / totalLength;
      }

      currentLength += segmentLength;
    }

    return null;
  }

  getSegment(index: number) {
    const start = this._index.array[index] * 3;
    const end = this._index.array[index + 1] * 3;

    const startPoint = new THREE.Vector3(
      this._pos[start],
      this._pos[start + 1],
      this._pos[start + 2]
    );

    const endPoint = new THREE.Vector3(
      this._pos[end],
      this._pos[end + 1],
      this._pos[end + 2]
    );

    return { startPoint, endPoint };
  }
}
