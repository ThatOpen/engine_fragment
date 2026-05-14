import { GeomsFbUtils } from "./index";

export class Point {
  x: number;

  y: number;

  z: number;

  hash: string;

  id: number;

  constructor(
    vertices: Float32Array,
    index: number,
    id: number,
    precision: number,
  ) {
    this.x = GeomsFbUtils.round(vertices[index * 3], precision);
    this.y = GeomsFbUtils.round(vertices[index * 3 + 1], precision);
    this.z = GeomsFbUtils.round(vertices[index * 3 + 2], precision);
    this.hash = `${this.x}/${this.y}/${this.z}`;
    this.id = id;
  }
}
