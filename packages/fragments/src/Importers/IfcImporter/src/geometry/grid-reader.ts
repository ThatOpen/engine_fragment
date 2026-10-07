import * as THREE from "three";
import * as WEBIFC from "web-ifc";
import { GridAxisData, GridData } from "../../../../FragmentsModels";
import { FragmentsIfcUtils } from "../../../../Utils";

/** An axis a grid was read without, because its curve is not supported. */
type UnsupportedAxis = NonNullable<GridData["unsupportedAxes"]>[number];

/** Something {@link GridReader.read} skipped, or worked around, in a model. */
export type GridReadError =
  /** The grid has no ObjectPlacement; it was read at the identity placement. */
  | { kind: "noPlacement"; gridId: number }
  /** Axes the grid was read without; they are also its `unsupportedAxes`. */
  | { kind: "unsupportedAxes"; gridId: number; axes: UnsupportedAxis[] }
  /** The grid could not be read, and is left out. */
  | { kind: "unreadableGrid"; gridId: number; cause: unknown }
  /** The model's grids could not be listed, so none were read. */
  | { kind: "unreadableModel"; cause: unknown };

export class GridReader {
  private readonly _webIfc: WEBIFC.IfcAPI;
  private readonly _modelId;

  constructor(webIfc: WEBIFC.IfcAPI, modelId: number) {
    this._webIfc = webIfc;
    this._modelId = modelId;
  }

  /**
   * Reads every IFCGRID of the model. A grid or an axis that cannot be read is
   * left out and returned in `errors`, for the caller to report its own way;
   * it never fails the read.
   */
  read(): { value: GridData[]; errors: GridReadError[] } {
    const errors: GridReadError[] = [];
    try {
      const result: GridData[] = [];

      const coordMatrixValues = this._webIfc.GetCoordinationMatrix(
        this._modelId,
      );
      const coordMatrix = new THREE.Matrix4();
      coordMatrix.fromArray(coordMatrixValues);

      const units = FragmentsIfcUtils.getUnitsFactor(
        this._webIfc,
        this._modelId,
      );

      const gridsVector = this._webIfc.GetLineIDsWithType(
        this._modelId,
        WEBIFC.IFCGRID,
      );
      const size = gridsVector.size();
      for (let i = 0; i < size; i++) {
        const id = gridsVector.get(i);

        // One malformed grid must not drop the remaining ones, so each grid
        // gets its own catch instead of failing the whole read.
        try {
          const grid: WEBIFC.IFC4.IfcGrid = this._webIfc.GetLine(
            this._modelId,
            id,
          );

          // ObjectPlacement is optional for IFCGRID; getAbsolutePlacement
          // falls back to the identity placement, but let the user know.
          if (!grid.ObjectPlacement) {
            errors.push({ kind: "noPlacement", gridId: id });
          }

          const transform = FragmentsIfcUtils.getAbsolutePlacement(
            this._webIfc,
            grid,
            units,
            this._modelId,
          );

          transform.premultiply(coordMatrix);

          const uAxes = this.getGridAxes(grid, units, "UAxes");
          const vAxes = this.getGridAxes(grid, units, "VAxes");
          const wAxes = this.getGridAxes(grid, units, "WAxes");

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
            uAxes: uAxes.value,
            vAxes: vAxes.value,
            wAxes: wAxes.value,
          };

          const unsupportedAxes = [
            ...uAxes.errors,
            ...vAxes.errors,
            ...wAxes.errors,
          ];
          if (unsupportedAxes.length > 0) {
            data.unsupportedAxes = unsupportedAxes;
            errors.push({
              kind: "unsupportedAxes",
              gridId: id,
              axes: unsupportedAxes,
            });
          }

          result.push(data);
        } catch (error) {
          errors.push({ kind: "unreadableGrid", gridId: id, cause: error });
        }
      }

      return { value: result, errors };
    } catch (error) {
      errors.push({ kind: "unreadableModel", cause: error });
      return { value: [], errors };
    }
  }

  /**
   * The axes of `ifcGrid` under `ifcKey`, and in `errors` those whose curve it
   * cannot represent.
   */
  private getGridAxes(
    ifcGrid: WEBIFC.IFC4.IfcGrid,
    units: number,
    ifcKey: "UAxes" | "VAxes" | "WAxes",
  ): { value: GridAxisData[]; errors: UnsupportedAxis[] } {
    const axisDataArr: GridAxisData[] = [];
    const errors: UnsupportedAxis[] = [];
    for (const axis of ifcGrid[ifcKey] ?? []) {
      // GetLine reads the grid unflattened, so its axes are handles.
      const { value: axisId } = axis as WEBIFC.Handle<WEBIFC.IFC4.IfcGridAxis>;
      const axisCurve = this._webIfc.GetLine(this._modelId, axisId);
      const curveId = axisCurve.AxisCurve.value;
      const curve = this._webIfc.GetLine(this._modelId, curveId);
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
          const ifcPoints = this._webIfc.GetLine(this._modelId, pointId);
          if (ifcPoints.Coordinates) {
            pushPoint(ifcPoints.Coordinates);
          }
        }
      } else if (curve.Points?.value) {
        // Non-polyline curves with a point list (e.g. IFCINDEXEDPOLYCURVE).
        const ifcPoints = this._webIfc.GetLine(
          this._modelId,
          curve.Points.value,
        );
        if (ifcPoints.CoordList) {
          const order = this.getPointOrder(curve, ifcPoints.CoordList.length);
          if (!order) {
            // Joining an arc's three points with straight lines would draw a
            // plausible-looking but wrong axis, so report it as IFCCIRCLE is.
            errors.push({
              tag: axisData.tag,
              curveType: `${this.getCurveTypeName(curve)} with IFCARCINDEX segments`,
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
        errors.push({
          tag: axisData.tag,
          curveType: this.getCurveTypeName(curve),
        });
        continue;
      }

      axisDataArr.push(axisData);
    }
    return { value: axisDataArr, errors };
  }

  /**
   * The 0-based indices an indexed polycurve runs through its point list in:
   * its `Segments` when it has them, which may revisit, skip or reverse
   * points, and every point in turn when it has none. `null` when a segment
   * is an arc, which would need tessellating.
   */
  private getPointOrder(curve: any, pointCount: number): number[] | null {
    // GetLine reads a segment back without saying whether it is an
    // IFCLINEINDEX or an IFCARCINDEX, so the raw line is read for that.
    const segments: { typecode: number; value: { value: number }[] }[] | null =
      curve.type === WEBIFC.IFCINDEXEDPOLYCURVE
        ? this._webIfc.GetRawLineData(this._modelId, curve.expressID)
            .arguments[1]
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

  private getCurveTypeName(curve: any) {
    try {
      // Uppercase to match the STEP spelling used in IFC files (IFCCIRCLE...).
      const name = this._webIfc.GetNameFromTypeCode(curve.type);
      if (name) return name.toUpperCase();
    } catch {
      // Fall through to the numeric type code below.
    }
    return `IFC type ${curve.type}`;
  }
}
