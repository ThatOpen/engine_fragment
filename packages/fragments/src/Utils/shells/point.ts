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
    precission: number,
  ) {
    this.x = GeomsFbUtils.round(vertices[index * 3], precission);
    this.y = GeomsFbUtils.round(vertices[index * 3 + 1], precission);
    this.z = GeomsFbUtils.round(vertices[index * 3 + 2], precission);
    this.hash = `${this.x}/${this.y}/${this.z}`;
    this.id = id;
  }
}
