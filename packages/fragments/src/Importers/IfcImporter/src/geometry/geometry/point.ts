import { round } from "./utils";

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
    this.x = round(vertices[index * 3], precission);
    this.y = round(vertices[index * 3 + 1], precission);
    this.z = round(vertices[index * 3 + 2], precission);
    this.hash = `${this.x}/${this.y}/${this.z}`;
    this.id = id;
  }
}
