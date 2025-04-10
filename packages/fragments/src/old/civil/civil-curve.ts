import * as THREE from "three";
import { AlignmentObject } from "./alignment";
import { CurveMesh } from "./curve-mesh";

/**
 * Represents an alignment curve of a civil engineering model.
 */
export class CivilCurve {
  /**
   * The index of the curve. An alignment is a sequence of ordered curves, and this is the index of this curve in that sequence.
   */
  index: number;

  /**
   * The THREE.js mesh containing the vertices of the curve.
   */
  mesh: CurveMesh;

  /**
   * Additional data associated with the curve.
   */
  data: { [name: string]: any };

  /**
   * The alignment to which this curve belongs.
   */
  alignment: AlignmentObject;

  private get _index() {
    return this.mesh.geometry.index as THREE.BufferAttribute;
  }

  private get _pos() {
    return this.mesh.geometry.attributes.position.array;
  }

  /**
   * Constructs a new instance of CivilCurve.
   * @param index - The index of the curve.
   * @param mesh - The mesh associated with the curve.
   * @param data - Additional data associated with the curve.
   * @param alignment - The alignment of the curve.
   */
  constructor(
    index: number,
    mesh: CurveMesh,
    data: { [name: string]: any },
    alignment: AlignmentObject,
  ) {
    this.index = index;
    this.mesh = mesh;
    this.data = data;
    this.alignment = alignment;
  }

  /**
   * Calculates the total length of the curve by summing up the lengths of all segments.
   * @returns The total length of the curve.
   */
  getLength() {
    let length = 0;
    for (let i = 0; i < this._index.array.length - 1; i += 2) {
      const { startPoint, endPoint } = this.getSegment(i);
      length += startPoint.distanceTo(endPoint);
    }
    return length;
  }

  /**
   * Calculates a point on the curve based on the given percentage.
   *
   * @param percentage - The percentage along the curve (between zero and one).
   * @returns A new THREE.Vector3 representing the point on the curve.
   *
   * @remarks
   * The method works by first finding the segment that corresponds to the given percentage.
   * It then normalizes the direction of the segment, multiplies it by the distance to the start of the segment,
   * and adds it to the start point of the segment.
   *
   * @throws Will throw an error if the percentage is outside the range [0, 1].
   */
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

  /**
   * Calculates a segment of the curve based on the given percentage.
   *
   * @param percentage - The percentage along the curve (between zero and one).
   * @returns An object containing the distance to the start of the segment, the index of the segment, and the start and end points of the segment.
   *
   * @remarks
   * The method works by first finding the segment that corresponds to the given percentage.
   * It then returns an object containing the distance to the start of the segment, the index of the segment, and the start and end points of the segment.
   *
   * @throws Will throw an error if the percentage is outside the range [0, 1].
   */
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
      if (accumulatedLength + segmentLength >= targetLength) {
        // Position is the distance from the startPoint to the target point
        const distanceToStart = targetLength - accumulatedLength;
        return { distanceToStart, index, startPoint, endPoint };
      }
      accumulatedLength += segmentLength;
    }

    throw new Error("Could not compute point");
  }

  /**
   * Calculates the percentage of the curve that corresponds to the given point.
   *
   * @param point - The point for which to calculate the percentage.
   * @param tolerance - The tolerance for determining if a point is on the curve. Default is 0.01.
   * @returns The percentage of the curve that corresponds to the given point, or null if the point is not contained in this curve.
   *
   * @remarks
   * The method works by iterating over each segment of the curve and checking if the given point is within the tolerance of the segment.
   * If a point is found, it calculates the percentage of the curve that corresponds to the point.
   * If no point is found, it returns null.
   */
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

  /**
   * Retrieves a segment of the curve based on the given index.
   *
   * @param index - The index of the segment.
   * @returns An object containing the start and end points of the segment.
   *
   * @remarks
   * The method calculates the start and end points of the segment based on the given index.
   * It uses the index array and position attribute of the curve's geometry to determine the start and end points.
   *
   * @throws Will throw an error if the index is out of range.
   */
  getSegment(index: number) {
    const start = this._index.array[index] * 3;
    const end = this._index.array[index + 1] * 3;

    const startPoint = new THREE.Vector3(
      this._pos[start],
      this._pos[start + 1],
      this._pos[start + 2],
    );

    const endPoint = new THREE.Vector3(
      this._pos[end],
      this._pos[end + 1],
      this._pos[end + 2],
    );

    return { startPoint, endPoint };
  }
}
