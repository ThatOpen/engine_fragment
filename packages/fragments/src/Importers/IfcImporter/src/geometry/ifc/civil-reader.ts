import * as WEBIFC from "web-ifc";
import {
  AlignmentCurveType,
  AlignmentData,
} from "../../../../../FragmentsModels";

export class CivilReader {
  read(webIfc: WEBIFC.IfcAPI) {
    try {
      const alignments = webIfc.GetAllAlignments(0);

      const allAlignments: AlignmentData[] = [];

      for (const alignment of alignments) {
        const currentAlignment: AlignmentData = {
          absolute: [],
          horizontal: [],
          vertical: [],
        };
        allAlignments.push(currentAlignment);

        let pointsCounter = 0;

        for (let i = 0; i < alignment.horizontal.length; i++) {
          const points3d = alignment.curve3D[0].points;
          const curveHorizontal = alignment.horizontal[i];

          const result3d: number[] = [];
          const resultHorizontal: number[] = [];

          const type = this.getCurveType(curveHorizontal.data[1]);
          const points3DReversed: number[][] = [];
          const pointsHorizontalReversed: number[][] = [];

          for (const point of curveHorizontal.points) {
            const { x, y, z } = points3d[pointsCounter++];
            points3DReversed.push([x, y, z]);
            pointsHorizontalReversed.push([point.x, point.y]);
          }

          points3DReversed.reverse();
          pointsHorizontalReversed.reverse();

          for (const [x, y, z] of points3DReversed) {
            result3d.push(x, y, z);
          }

          for (const [x, y] of pointsHorizontalReversed) {
            resultHorizontal.push(x, 0, -y);
          }

          currentAlignment.absolute.push({
            points: result3d,
            type,
          });

          currentAlignment.horizontal.push({
            points: resultHorizontal,
            type,
          });
        }

        for (let i = 0; i < alignment.vertical.length; i++) {
          const curveVertical = alignment.vertical[i];

          const resultVertical: number[] = [];

          const type = this.getCurveType(curveVertical.data[1]);
          const pointsVerticalReversed: number[][] = [];

          for (const point of curveVertical.points) {
            pointsVerticalReversed.push([point.x, point.y]);
          }

          pointsVerticalReversed.reverse();

          for (const [x, y] of pointsVerticalReversed) {
            resultVertical.push(x, y, 0);
          }

          currentAlignment.vertical.push({
            points: resultVertical,
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
      return AlignmentCurveType.ELLIPSE_ARC;
    }
    if (data.includes("LINE") || data.includes("GRADIENT")) {
      return AlignmentCurveType.LINES;
    }
    if (data.includes("CLOTHOID")) {
      return AlignmentCurveType.CLOTHOID;
    }
    if (data.includes("PARABOLICARC")) {
      return AlignmentCurveType.PARABOLA;
    }
    throw new Error(`Fragments: Unknown curve type: ${data}`);
  }
}
