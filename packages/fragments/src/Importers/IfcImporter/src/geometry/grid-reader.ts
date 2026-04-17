import * as THREE from "three";
import * as WEBIFC from "web-ifc";
import { GridAxisData, GridData } from "../../../../FragmentsModels";
import { FragmentsIfcUtils } from "../../../../Utils";

export class GridReader {
  read(webIfc: WEBIFC.IfcAPI) {
    try {
      const result: GridData[] = [];

      const coordMatrixValues = webIfc.GetCoordinationMatrix(0);
      const coordMatrix = new THREE.Matrix4();
      coordMatrix.fromArray(coordMatrixValues);

      const units = FragmentsIfcUtils.getUnitsFactor(webIfc);

      const gridsVector = webIfc.GetLineIDsWithType(0, WEBIFC.IFCGRID);
      const size = gridsVector.size();
      for (let i = 0; i < size; i++) {
        const id = gridsVector.get(i);
        const grid = webIfc.GetLine(0, id);

        const transform = FragmentsIfcUtils.getAbsolutePlacement(
          webIfc,
          grid,
          units
        );

        transform.premultiply(coordMatrix);

        const data: GridData = {
          id,
          transform: transform.elements,
          uAxes: this.getGridAxes(grid, webIfc, units, "UAxes"),
          vAxes: this.getGridAxes(grid, webIfc, units, "VAxes"),
          wAxes: this.getGridAxes(grid, webIfc, units, "WAxes"),
        };
        result.push(data);
      }

      return result;
    } catch (error) {
      console.error(error);
      return [] as GridData[];
    }
  }

  private getGridAxes(
    ifcGrid: any,
    webIfc: WEBIFC.IfcAPI,
    units: number,
    ifcKey: "UAxes" | "VAxes" | "WAxes"
  ): GridAxisData[] {
    if (!ifcGrid[ifcKey]) {
      return [];
    }

    const axisDataArr: GridAxisData[] = [];
    for (const axis of ifcGrid[ifcKey]) {
      const axisCurve = webIfc.GetLine(0, axis.value);
      const curveId = axisCurve.AxisCurve.value;
      const curve = webIfc.GetLine(0, curveId);
      const axisData: GridAxisData = {
        tag: axisCurve.AxisTag.value,
        curve: [],
      };
      if (!curve.Points) {
        continue;
      }

      // IFCCARTESIANPOINT can be 2D or 3D depending on the exporter; the
      // downstream renderer assumes 3D points (3 values each), so normalize
      // here. Without this, a file like BLOXHUB that stores grid axis points
      // as 3D `(x, y, 0)` would have the renderer misread them as 2D and
      // produce a fan-shaped grid.
      const pushPoint = (coords: { value: number }[]) => {
        const x = (coords[0]?.value ?? 0) * units;
        const y = (coords[1]?.value ?? 0) * units;
        const z = (coords[2]?.value ?? 0) * units;
        axisData.curve.push(x, y, z);
      };

      if (curve.type === WEBIFC.IFCPOLYLINE) {
        for (const { value: pointId } of curve.Points) {
          const ifcPoints = webIfc.GetLine(0, pointId);
          if (ifcPoints.Coordinates) {
            pushPoint(ifcPoints.Coordinates);
          }
        }
      } else {
        const pointsId = curve.Points.value;
        if (!pointsId) {
          continue;
        }
        const ifcPoints = webIfc.GetLine(0, pointsId);
        if (ifcPoints.CoordList) {
          for (const coordinates of ifcPoints.CoordList) {
            pushPoint(coordinates);
          }
        }
      }
      axisDataArr.push(axisData);
    }
    return axisDataArr;
  }
}
