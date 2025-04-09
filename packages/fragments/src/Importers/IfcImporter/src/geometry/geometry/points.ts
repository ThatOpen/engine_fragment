import * as THREE from "three";
import { Point } from "./point";

export class Points {
  list = new Map<string, Point>();
  tempV1 = new THREE.Vector3();
  tempV2 = new THREE.Vector3();
  tempV3 = new THREE.Vector3();

  precission: number;

  constructor(precission: number) {
    this.precission = precission;
  }

  create(vertices: Float32Array, index: number) {
    const point = new Point(vertices, index, this.list.size, this.precission);
    if (!this.list.has(point.hash)) {
      this.list.set(point.hash, point);
    }
    return this.list.get(point.hash)!;
  }

  get() {
    return Array.from(this.list.values()).map((p) => [p.x, p.y, p.z]);
  }

  // Prevent degenerate triangles
  isValidTriangle(
    position: Float32Array,
    index1: number,
    index2: number,
    index3: number,
  ) {
    this.tempV1.set(
      position[index1 * 3],
      position[index1 * 3 + 1],
      position[index1 * 3 + 2],
    );

    this.tempV2.set(
      position[index2 * 3],
      position[index2 * 3 + 1],
      position[index2 * 3 + 2],
    );

    this.tempV3.set(
      position[index3 * 3],
      position[index3 * 3 + 1],
      position[index3 * 3 + 2],
    );

    const pointPrecision = (1 / this.precission) * 10;
    const d1Valid = this.tempV1.distanceTo(this.tempV2) > pointPrecision;
    const d2Valid = this.tempV1.distanceTo(this.tempV3) > pointPrecision;
    const d3Valid = this.tempV2.distanceTo(this.tempV3) > pointPrecision;

    return d1Valid && d2Valid && d3Valid;
  }
}
