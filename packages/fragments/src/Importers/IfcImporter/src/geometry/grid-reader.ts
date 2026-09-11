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

        // One malformed grid must not drop the remaining ones, so each grid
        // gets its own catch instead of failing the whole read.
        try {
          const grid = webIfc.GetLine(0, id);

          // ObjectPlacement is optional for IFCGRID; getAbsolutePlacement
          // falls back to the identity placement, but let the user know.
          if (!grid.ObjectPlacement) {
            console.warn(
              `Fragments: IFCGRID #${id} has no ObjectPlacement. Using the identity placement for it.`
            );
          }

          const transform = FragmentsIfcUtils.getAbsolutePlacement(
            webIfc,
            grid,
            units
          );

          transform.premultiply(coordMatrix);

          const unsupportedAxes: NonNullable<GridData["unsupportedAxes"]> = [];

          const data: GridData = {
            id,
            transform: transform.elements,
            // prettier-ignore
            uAxes: this.getGridAxes(grid, webIfc, units, "UAxes", unsupportedAxes),
            // prettier-ignore
            vAxes: this.getGridAxes(grid, webIfc, units, "VAxes", unsupportedAxes),
            // prettier-ignore
            wAxes: this.getGridAxes(grid, webIfc, units, "WAxes", unsupportedAxes),
          };

          if (unsupportedAxes.length > 0) {
            data.unsupportedAxes = unsupportedAxes;
            const skipped = unsupportedAxes
              .map(({ tag, curveType }) => `"${tag}" (${curveType})`)
              .join(", ");
            console.warn(
              `Fragments: IFCGRID #${id} has axes with unsupported curve types that will not be displayed: ${skipped}.`
            );
          }

          result.push(data);
        } catch (error) {
          console.warn(
            `Fragments: skipping IFCGRID #${id} because it could not be read:`,
            error
          );
        }
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
    unsupportedAxes: NonNullable<GridData["unsupportedAxes"]>
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
        // AxisTag is an optional IfcLabel. web-ifc returns it as null when the
        // IFC omits it (IFCGRIDAXIS($,...)), so read it defensively; otherwise
        // a single tagless axis threw and the outer catch dropped every grid.
        tag: axisCurve.AxisTag?.value ?? "",
        curve: [],
      };
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

      if (curve.type === WEBIFC.IFCPOLYLINE && curve.Points) {
        for (const { value: pointId } of curve.Points) {
          const ifcPoints = webIfc.GetLine(0, pointId);
          if (ifcPoints.Coordinates) {
            pushPoint(ifcPoints.Coordinates);
          }
        }
      } else if (curve.Points?.value) {
        // Non-polyline curves with a point list (e.g. IFCINDEXEDPOLYCURVE).
        const ifcPoints = webIfc.GetLine(0, curve.Points.value);
        if (ifcPoints.CoordList) {
          for (const coordinates of ifcPoints.CoordList) {
            pushPoint(coordinates);
          }
        }
      }

      if (axisData.curve.length === 0) {
        // Curves without a readable point list (IFCCIRCLE, IFCLINE,
        // IFCTRIMMEDCURVE...) are not tessellated yet. Never emit an
        // empty-curve axis (downstream label placement slices the ends of
        // the curve and would produce NaN positions); surface it instead of
        // dropping it silently.
        unsupportedAxes.push({
          tag: axisData.tag,
          curveType: this.getCurveTypeName(webIfc, curve),
        });
        continue;
      }

      axisDataArr.push(axisData);
    }
    return axisDataArr;
  }

  private getCurveTypeName(webIfc: WEBIFC.IfcAPI, curve: any) {
    try {
      // Uppercase to match the STEP spelling used in IFC files (IFCCIRCLE...).
      const name = webIfc.GetNameFromTypeCode(curve.type);
      if (name) return name.toUpperCase();
    } catch {
      // Fall through to the numeric type code below.
    }
    return `IFC type ${curve.type}`;
  }
}
