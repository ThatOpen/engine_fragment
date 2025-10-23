import * as THREE from "three";
import { Edge } from "./edge";
import { Point } from "./point";
import { Plane } from "./plane";

export class Profile {
  // Do we need edges here?
  // edges = new Map<string, Edge>();

  closed = false;
  openStartPoint: string | null = null;
  openEndPoint: string | null = null;

  plane: Plane;

  orderedPoints: Point[] = [];

  constructor(plane: Plane) {
    this.plane = plane;
  }

  getEdges(reverse: boolean = false) {
    const edges: Edge[] = [];

    if (reverse) {
      for (let i = this.orderedPoints.length - 1; i > 0; i--) {
        edges.push(new Edge(this.orderedPoints[i], this.orderedPoints[i - 1]));
      }
    } else {
      for (let i = 0; i < this.orderedPoints.length - 1; i++) {
        edges.push(new Edge(this.orderedPoints[i], this.orderedPoints[i + 1]));
      }
    }

    return edges;
  }

  getIndices() {
    return this.orderedPoints.map((p) => p.id);
  }

  add(edge: Edge) {
    if (this.orderedPoints.length === 0) {
      // This is the first edge of the profile
      this.openStartPoint = edge.p1.hash;
      this.openEndPoint = edge.p2.hash;
      this.orderedPoints.push(edge.p1, edge.p2);
      return;
    }

    const matches = this.match(edge);

    // TODO: Is this necessary?
    if (matches === 0) {
      throw new Error("Fragments: Edge doesn't match with any open point");
    }

    if (matches > 2) {
      throw new Error("Fragments: Edge matches with more than 2 open points");
    }

    if (matches === 2) {
      // This edge closes the profile
      this.closed = true;
      this.openEndPoint = null;
      this.openStartPoint = null;
      return;
    }

    // Sort the profile points when the new edge is added
    if (this.openStartPoint === edge.p1.hash) {
      this.orderedPoints.unshift(edge.p2);
      this.openStartPoint = edge.p2.hash;
    } else if (this.openEndPoint === edge.p1.hash) {
      this.orderedPoints.push(edge.p2);
      this.openEndPoint = edge.p2.hash;
    } else if (this.openStartPoint === edge.p2.hash) {
      this.orderedPoints.unshift(edge.p1);
      this.openStartPoint = edge.p1.hash;
    } else if (this.openEndPoint === edge.p2.hash) {
      this.orderedPoints.push(edge.p1);
      this.openEndPoint = edge.p1.hash;
    }
  }

  match(edge: Edge) {
    if (this.closed) return 0;
    let matchNumber = 0;
    if (this.openStartPoint === edge.p1.hash) matchNumber++;
    if (this.openStartPoint === edge.p2.hash) matchNumber++;
    if (this.openEndPoint === edge.p1.hash) matchNumber++;
    if (this.openEndPoint === edge.p2.hash) matchNumber++;
    return matchNumber;
  }

  merge(newProfile: Profile) {
    if (newProfile.closed || this.closed) {
      throw new Error("Fragments: Cannot merge closed profiles");
    }

    // A profile closing the current profile means we missed a previous match
    // This should never happen

    if (
      newProfile.openStartPoint === this.openEndPoint &&
      newProfile.openEndPoint === this.openStartPoint
    ) {
      throw new Error("Fragments: Cannot merge profiles that close each other");
    }

    if (
      newProfile.openEndPoint === this.openEndPoint &&
      newProfile.openStartPoint === this.openStartPoint
    ) {
      throw new Error("Fragments: Cannot merge profiles that close each other");
    }

    let reverse = false;
    if (
      newProfile.openEndPoint === this.openStartPoint ||
      newProfile.openEndPoint === this.openEndPoint
    ) {
      reverse = true;
    }

    const newEdges = newProfile.getEdges(reverse);

    for (const edge of newEdges) {
      this.add(edge);
    }
  }

  getArea() {
    const vertices = this.orderedPoints.map((p) => [p.x, p.y, p.z]);

    // Make polygon 2d simply by removing the least important axis

    let dimension1 = 0;
    let dimension2 = 1;

    const absX = Math.abs(this.plane.normal.x);
    const absY = Math.abs(this.plane.normal.y);
    const absZ = Math.abs(this.plane.normal.z);

    if (absX >= absY && absX >= absZ) {
      // x is the least important axis
      dimension1 = 1;
      dimension2 = 2;
    } else if (absY >= absX && absY >= absZ) {
      // y is the least important axis
      dimension1 = 0;
      dimension2 = 2;
    } else {
      // z is the least important axis
      dimension1 = 0;
      dimension2 = 1;
    }

    const projectedPoints: THREE.Vector2[] = [];

    for (const point of vertices) {
      projectedPoints.push(
        new THREE.Vector2(point[dimension1], point[dimension2]),
      );
    }

    // Now, to get the area of a 2D polygon:
    // https://stackoverflow.com/a/33670691

    let total = 0;

    for (let i = 0, l = projectedPoints.length; i < l; i++) {
      const addX = projectedPoints[i].x;
      const addY =
        projectedPoints[i === projectedPoints.length - 1 ? 0 : i + 1].y;
      const subX =
        projectedPoints[i === projectedPoints.length - 1 ? 0 : i + 1].x;
      const subY = projectedPoints[i].y;

      total += addX * addY * 0.5;
      total -= subX * subY * 0.5;
    }

    return Math.abs(total);
  }
}
