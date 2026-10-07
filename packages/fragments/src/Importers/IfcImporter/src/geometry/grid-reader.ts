import * as THREE from "three";
import * as WEBIFC from "web-ifc";
import { GridAxisData, GridData } from "../../../../FragmentsModels";
import { FragmentsIfcUtils } from "../../../../Utils";

/** Options for {@link GridReader.read}. */
export interface GridReaderOptions {
  /** The web-ifc model to read the grids of. Defaults to the first one opened. */
  modelId?: number;
}

export class GridReader {
  /**
   * Reads every IFCGRID of a model already open in `webIfc`.
   */
  read(webIfc: WEBIFC.IfcAPI, { modelId = 0 }: GridReaderOptions = {}) {
    try {
      const result: GridData[] = [];

      const coordMatrixValues = webIfc.GetCoordinationMatrix(modelId);
      const coordMatrix = new THREE.Matrix4();
      coordMatrix.fromArray(coordMatrixValues);

      const units = FragmentsIfcUtils.getUnitsFactor(webIfc, modelId);

      const gridsVector = webIfc.GetLineIDsWithType(modelId, WEBIFC.IFCGRID);
      const size = gridsVector.size();
      for (let i = 0; i < size; i++) {
        const id = gridsVector.get(i);

        // One malformed grid must not drop the remaining ones, so each grid
        // gets its own catch instead of failing the whole read.
        try {
          const grid = webIfc.GetLine(modelId, id);

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
            units,
            modelId
          );

          transform.premultiply(coordMatrix);

          const unsupportedAxes: NonNullable<GridData["unsupportedAxes"]> = [];

          const data: GridData = {
            id,
            // This runs inside the per-grid catch, so an unguarded read would
            // drop the whole grid. An unset GlobalId reads back as null, which
            // `guid?: string` does not admit, so normalise it to undefined and
            // let it drop out of the serialized data.
            guid: grid.GlobalId?.value ?? undefined,
            // Optional in the schema; normalised to undefined like the guid.
            name: grid.Name?.value ?? undefined,
            transform: transform.elements,
            // prettier-ignore
            uAxes: this.getGridAxes(grid, webIfc, modelId, units, "UAxes", unsupportedAxes),
            // prettier-ignore
            vAxes: this.getGridAxes(grid, webIfc, modelId, units, "VAxes", unsupportedAxes),
            // prettier-ignore
            wAxes: this.getGridAxes(grid, webIfc, modelId, units, "WAxes", unsupportedAxes),
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
    modelId: number,
    units: number,
    ifcKey: "UAxes" | "VAxes" | "WAxes",
    unsupportedAxes: NonNullable<GridData["unsupportedAxes"]>
  ): GridAxisData[] {
    if (!ifcGrid[ifcKey]) {
      return [];
    }

    const axisDataArr: GridAxisData[] = [];
    for (const axis of ifcGrid[ifcKey]) {
      const axisCurve = webIfc.GetLine(modelId, axis.value);
      const curveId = axisCurve.AxisCurve.value;
      const curve = webIfc.GetLine(modelId, curveId);
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
          const ifcPoints = webIfc.GetLine(modelId, pointId);
          if (ifcPoints.Coordinates) {
            pushPoint(ifcPoints.Coordinates);
          }
        }
      } else if (curve.Points?.value) {
        // Non-polyline curves with a point list (e.g. IFCINDEXEDPOLYCURVE).
        const ifcPoints = webIfc.GetLine(modelId, curve.Points.value);
        if (ifcPoints.CoordList) {
          const order = this.getPointOrder(
            webIfc,
            modelId,
            curve,
            ifcPoints.CoordList.length
          );
          if (!order) {
            // Joining an arc's three points with straight lines would draw a
            // plausible-looking but wrong axis, so report it as IFCCIRCLE is.
            unsupportedAxes.push({
              tag: axisData.tag,
              curveType: `${this.getCurveTypeName(webIfc, curve)} with IFCARCINDEX segments`,
            });
            continue;
          }
          for (const index of order) {
            pushPoint(ifcPoints.CoordList[index]);
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

  /**
   * The 0-based indices an indexed polycurve runs through its point list in:
   * its `Segments` when it has them, which may revisit, skip or reverse
   * points, and every point in turn when it has none. `null` when a segment
   * is an arc, which would need tessellating.
   */
  private getPointOrder(
    webIfc: WEBIFC.IfcAPI,
    modelId: number,
    curve: any,
    pointCount: number
  ): number[] | null {
    // GetLine reads a segment back without saying whether it is an
    // IFCLINEINDEX or an IFCARCINDEX, so the raw line is read for that.
    const segments: { typecode: number; value: { value: number }[] }[] | null =
      curve.type === WEBIFC.IFCINDEXEDPOLYCURVE
        ? webIfc.GetRawLineData(modelId, curve.expressID).arguments[1]
        : null;
    if (!segments) {
      return Array.from({ length: pointCount }, (_, index) => index);
    }
    const order: number[] = [];
    for (const { typecode, value } of segments) {
      if (typecode !== WEBIFC.IFCLINEINDEX) return null;
      for (const { value: index } of value) {
        // Consecutive segments share their joint point: take it once.
        if (order[order.length - 1] !== index - 1) order.push(index - 1);
      }
    }
    return order;
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
