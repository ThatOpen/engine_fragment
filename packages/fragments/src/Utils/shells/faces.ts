import { Plane } from "./plane";
import { Edge } from "./edge";
import { Face } from "./face";

export class Faces {
  list = new Map<number, Face>();
  nextFaceID = 0;

  add(triangle: Edge[], plane: Plane) {
    const matches = this.match(triangle, plane);

    // CASE 0: It doesn't match with any existing face

    if (matches.length === 0) {
      const newFaceID = this.nextFaceID++;
      const face = new Face(newFaceID, plane);
      face.add(triangle);
      this.list.set(face.id, face);
      return;
    }

    // CASE 1: It matches with an existing face
    // Just add the triangle to the face

    if (matches.length === 1) {
      const face = this.list.get(matches[0])!;
      face.add(triangle);
      return;
    }

    // CASE 2: It matches with multiple existing faces
    // We need to merge them with the first one

    if (matches.length > 1) {
      const baseFace = this.list.get(matches[0])!;
      baseFace.add(triangle);

      for (let i = 1; i < matches.length; i++) {
        const faceToMergeID = matches[i];
        const faceToMerge = this.list.get(faceToMergeID)!;
        baseFace.merge(faceToMerge);
        this.list.delete(faceToMergeID);
      }
    }
  }

  private match(triangle: Edge[], plane: Plane) {
    let matchedFaceIDs: number[] = [];
    for (const face of this.list.values()) {
      if (face.match(triangle, plane)) {
        matchedFaceIDs.push(face.id);
      }
    }
    return matchedFaceIDs;
  }
}
