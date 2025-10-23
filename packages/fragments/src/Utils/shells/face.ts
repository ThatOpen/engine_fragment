import { Edge } from "./edge";
import { Plane } from "./plane";

export class Face {
  edges = new Map<string, Edge>();
  openEdges = new Set<string>();

  id: number;
  plane: Plane;

  constructor(id: number, plane: Plane) {
    this.id = id;
    this.plane = plane;
  }

  add(triangle: Iterable<Edge>) {
    if (this.edges.size === 0) {
      // This is the first triangle of the face
      for (const edge of triangle) {
        this.openEdges.add(edge.hash);
        this.edges.set(edge.hash, edge);
      }
      return;
    }

    // Is this necessary?
    // if (!this.match(triangle)) {
    //   throw new Error("Triangle doesn't match with any open edge");
    // }

    for (const edge of triangle) {
      // If the edge already exists, it means it matches with a previous one
      // so it becomes closed. Otherwise, it's a new open edge
      if (this.openEdges.has(edge.hash)) {
        this.openEdges.delete(edge.hash);
      } else {
        this.openEdges.add(edge.hash);
      }
      this.edges.set(edge.hash, edge);
    }
  }

  match(triangle: Iterable<Edge>, plane: Plane) {
    if (plane.id !== this.plane.id) {
      return false;
    }

    for (const edge of triangle) {
      if (this.openEdges.has(edge.hash)) {
        return true;
      }
    }
    return false;
  }

  getOpenEdges() {
    const openEdges: Edge[] = [];
    for (const edgeID of this.openEdges) {
      openEdges.push(this.edges.get(edgeID)!);
    }
    return openEdges;
  }

  merge(face: Face) {
    for (const [edgeID, edge] of face.edges) {
      this.edges.set(edgeID, edge);
    }

    // Common open edges are closed
    // New open edges are added
    for (const edgeID of face.openEdges) {
      if (this.openEdges.has(edgeID)) {
        this.openEdges.delete(edgeID);
      } else {
        this.openEdges.add(edgeID);
      }
    }
  }
}
