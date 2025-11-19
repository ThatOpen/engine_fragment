import * as WEBIFC from "web-ifc";
import * as THREE from "three";

export class FragmentsIfcUtils {
  static getAbsolutePlacement(
    webIfc: WEBIFC.IfcAPI,
    item: any,
    // We can pass predefined units factor to avoid recalculating it
    unitsFactor = this.getUnitsFactor(webIfc),
  ) {
    const placementId = item.ObjectPlacement.value;
    const placement = webIfc.GetLine(0, placementId);
    const ifcResult = new THREE.Matrix4();
    ifcResult.identity();
    this.getAbsolutePlacementRecursively(
      webIfc,
      placement,
      ifcResult,
      unitsFactor,
    );

    // Transforms ifc coord system to three.js coord system
    // z = -y
    // y = z

    const tempMatrix = new THREE.Matrix4();
    tempMatrix.makeRotationX(-Math.PI / 2);
    ifcResult.premultiply(tempMatrix);

    return ifcResult;
  }

  static getUnitsFactor(ifcApi: WEBIFC.IfcAPI) {
    const unitAssignmentIds = ifcApi.GetLineIDsWithType(
      0,
      WEBIFC.IFCUNITASSIGNMENT,
    );

    let result = 1;

    if (unitAssignmentIds.size() === 0) return result;

    for (let i = 0; i < unitAssignmentIds.size(); i++) {
      const assignmentId = unitAssignmentIds.get(i);
      const assignmentAttrs = ifcApi.GetLine(0, assignmentId);

      for (const unitHandle of assignmentAttrs.Units) {
        const unit = ifcApi.GetLine(0, unitHandle.value);

        const value = unit.UnitType?.value;
        if (value !== "LENGTHUNIT") continue;

        let factor = 1;
        let unitValue = 1;
        if (unit.Name.value === "METRE") unitValue = 1;
        if (unit.Name.value === "FOOT") unitValue = 0.3048;

        if (unit.Prefix?.value === "MILLI") {
          factor = 0.001;
        } else if (unit.Prefix?.value === "CENTI") {
          factor = 0.01;
        } else if (unit.Prefix?.value === "DECI") {
          factor = 0.1;
        }

        result = unitValue * factor;
      }
    }

    return result;
  }

  private static getAbsolutePlacementRecursively(
    webIfc: WEBIFC.IfcAPI,
    placement: any,
    result: THREE.Matrix4,
    unitsFactor: number,
  ) {
    // Current relative placement
    const relativePlacementId = placement.RelativePlacement.value;
    const relativePlacement = webIfc.GetLine(0, relativePlacementId);

    const locationId = relativePlacement.Location.value;
    const zAxisRef = relativePlacement.Axis;
    const xAxisRef = relativePlacement.RefDirection;

    const pos = new THREE.Vector3(0, 0, 0);
    const zAxis = new THREE.Vector3(0, 0, 1);
    const xAxis = new THREE.Vector3(1, 0, 0);

    const locationData = webIfc.GetLine(0, locationId);
    if (locationData) {
      const [x, y, z] = locationData.Coordinates;
      pos.x = x.value * unitsFactor;
      pos.y = y.value * unitsFactor;
      pos.z = z.value * unitsFactor;
    }

    if (zAxisRef) {
      const zAxisData = webIfc.GetLine(0, zAxisRef.value);
      const [z1, z2, z3] = zAxisData.DirectionRatios;
      zAxis.x = z1.value;
      zAxis.y = z2.value;
      zAxis.z = z3.value;
    }

    if (xAxisRef) {
      const xAxisData = webIfc.GetLine(0, xAxisRef.value);
      const [x1, x2, x3] = xAxisData.DirectionRatios;
      xAxis.x = x1.value;
      xAxis.y = x2.value;
      xAxis.z = x3.value;
    }

    const yAxis = zAxis.clone().cross(xAxis);

    const tempMatrix = new THREE.Matrix4();

    // Transforms ifc coord system to three.js coord system
    // z = -y
    // y = z

    // prettier-ignore
    tempMatrix.fromArray([
      xAxis.x, xAxis.y, xAxis.z, 0,
      yAxis.x, yAxis.y, yAxis.z, 0,
      zAxis.x, zAxis.y, zAxis.z, 0,
      pos.x,   pos.y,   pos.z,   1,
    ]);

    result.premultiply(tempMatrix);

    // console.log(relativePlacement);

    // Parent placement
    if (!placement.PlacementRelTo || !placement.PlacementRelTo.value) return;
    const parentPlacementId = placement.PlacementRelTo.value;
    const parentPlacement = webIfc.GetLine(0, parentPlacementId);
    this.getAbsolutePlacementRecursively(
      webIfc,
      parentPlacement,
      result,
      unitsFactor,
    );
  }
}
