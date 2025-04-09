import * as WEBIFC from "web-ifc";
import { GeometryClass } from "../../../../../Schema";
import { AlignmentData } from "../../../../../FragmentsModels";

export class CivilReader {
  read(webIfc: WEBIFC.IfcAPI) {
    try {
      const alignments = webIfc.GetAllAlignments(0);

      const allAlignments: AlignmentData[] = [];

      for (const alignment of alignments) {
        const points3d = alignment.curve3D[0].points;
        let pointCounter = 0;

        const currentAlignment: AlignmentData = {
          absolute: [],
        };
        allAlignments.push(currentAlignment);

        for (let i = 0; i < alignment.horizontal.length; i++) {
          const curve = alignment.horizontal[i];
          const type = this.getCurveType(curve.data[1]);
          const points: number[] = [];
          for (const _point of curve.points) {
            const { x, y, z } = points3d[pointCounter++];
            points.push(x, y, z);
          }
          const pointsBuffer = new Float32Array(points);
          currentAlignment.absolute.push({
            points: pointsBuffer,
            type,
          });
        }
      }
      return allAlignments;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  private getCurveType(data: string) {
    if (data.includes("CIRCULARARC")) {
      return GeometryClass.ELLIPSE_ARC;
    }
    if (data.includes("LINE") || data.includes("GRADIENT")) {
      return GeometryClass.LINES;
    }
    if (data.includes("CLOTHOID")) {
      return GeometryClass.CLOTHOID;
    }
    if (data.includes("PARABOLICARC")) {
      return GeometryClass.PARABOLA;
    }
    throw new Error(`Fragments: Unknown curve type: ${data}`);
  }
}
