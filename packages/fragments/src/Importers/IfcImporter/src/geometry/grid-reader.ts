import * as WEBIFC from "web-ifc";
import * as THREE from "three";
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
          units,
        );

        transform.premultiply(coordMatrix);

        const data: GridData = {
          id,
          transform: transform.elements,
          uAxes: [],
          vAxes: [],
          wAxes: [],
        };
        result.push(data);

        this.getGridAxes(grid, webIfc, units, "UAxes", "uAxes", data);
        this.getGridAxes(grid, webIfc, units, "VAxes", "vAxes", data);
        this.getGridAxes(grid, webIfc, units, "WAxes", "wAxes", data);
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
    ifcKey: "UAxes" | "VAxes" | "WAxes",
    fragKey: "uAxes" | "vAxes" | "wAxes",
    gridData: GridData,
  ) {
    if (!ifcGrid[ifcKey]) {
      return;
    }
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
      const pointsId = curve.Points.value;
      if (!pointsId) {
        continue;
      }
      const ifcPoints = webIfc.GetLine(0, pointsId);
      if (ifcPoints.CoordList) {
        for (const coordinates of ifcPoints.CoordList) {
          for (const coord of coordinates) {
            const value = coord.value * units;
            axisData.curve.push(value);
          }
        }
      }
      gridData[fragKey].push(axisData);
    }
  }
}
