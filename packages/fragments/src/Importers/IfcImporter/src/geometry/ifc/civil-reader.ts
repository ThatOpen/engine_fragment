import * as THREE from "three";
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

        const noVertical = alignment.vertical.length === 0;

        // When there's no vertical data, web-ifc doesn't produce a proper
        // 3D curve.  We synthesize one from the horizontal points and apply
        // the coordination matrix so they end up in the same space as the
        // model geometry (web-ifc applies it automatically to curve3D).
        // When there's no vertical data, web-ifc can't produce a proper 3D
        // curve.  We synthesize one from the 2D horizontal points.  Those
        // points are in alignment-local IFC space, so we apply the
        // alignment's world transform (same thing web-ifc does for curve3D).
        // We do NOT apply the coordination matrix — model geometry doesn't
        // have it baked in either (it's stored separately).
        let worldMatrix: THREE.Matrix4 | null = null;
        if (noVertical && alignment.FlattenedWorldTransformMatrix) {
          worldMatrix = new THREE.Matrix4();
          worldMatrix.fromArray(alignment.FlattenedWorldTransformMatrix);
        }

        let pointsCounter = 0;
        const points3d = alignment.curve3D[0]?.points;

        for (let i = 0; i < alignment.horizontal.length; i++) {
          const curveHorizontal = alignment.horizontal[i];

          const result3d: number[] = [];
          const resultHorizontal: number[] = [];

          const type = this.getCurveType(curveHorizontal.data[1]);
          const points3DReversed: number[][] = [];
          const pointsHorizontalReversed: number[][] = [];

          const tempVec = new THREE.Vector3();

          for (const point of curveHorizontal.points) {
            if (noVertical) {
              // Work in IFC space (x=easting, y=northing, z=elevation)
              tempVec.set(point.x, point.y, 0);
              if (worldMatrix) tempVec.applyMatrix4(worldMatrix);
              // Swizzle IFC Z-up → Three.js Y-up: (x, z, -y)
              points3DReversed.push([tempVec.x, tempVec.z, -tempVec.y]);
            } else {
              const point3d = points3d?.[pointsCounter++];
              if (point3d) {
                points3DReversed.push([point3d.x, point3d.y, point3d.z]);
              } else {
                console.log("Problem reading alignment 3D points");
              }
            }
            pointsHorizontalReversed.push([point.x, point.y]);
          }

          // points3DReversed.reverse();
          // pointsHorizontalReversed.reverse();

          for (const [x, y, z] of points3DReversed) {
            result3d.push(x, y, z);
          }

          for (const [x, y] of pointsHorizontalReversed) {
            resultHorizontal.push(x, 0, -y);
          }

          if (result3d.length) {
            currentAlignment.absolute.push({
              points: result3d,
              type,
            });
          }

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

          // pointsVerticalReversed.reverse();

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
      console.error("CivilReader error:", error);
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
