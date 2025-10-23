import { Point } from "./point";

export class Edge {
  p1: Point;

  p2: Point;

  hash: string;

  constructor(p1: Point, p2: Point) {
    this.p1 = p1;
    this.p2 = p2;

    // To make sure that the edges AB === BA
    // The smaller coordinate should always be first when building the ID
    const points = [this.p1, this.p2];
    points.sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z);
    this.hash = `${points[0].hash}_${points[1].hash}`;
  }
}
