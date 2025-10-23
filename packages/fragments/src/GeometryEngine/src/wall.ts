import * as WEBIFC from "web-ifc";
import * as THREE from "three";

export type WallData = {
  start?: number[];
  end?: number[];
  elevation?: number;
  height?: number;
  offset?: number;
  thickness?: number;
  direction?: number[];
  cuttingPlaneNormal?: number[];
  cuttingPlanePosition?: number[];
};

export class Wall {
  core: WEBIFC.Extrusion;

  constructor(api: WEBIFC.IfcAPI) {
    this.core = api.CreateExtrusion() as WEBIFC.Extrusion;
  }

  get(api: WEBIFC.IfcAPI, data: WallData) {
    // Convert all data to DoubleVectors

    const start = data.start ?? [0, 0, 0];
    const end = data.end ?? [1, 0, 0];
    const elevation = data.elevation ?? 0;
    const offset = data.offset ?? 0;
    const thickness = data.thickness ?? 0.1;
    const direction = data.direction ?? [0, 1, 0];
    const inputCuttingPlaneNormal = data.cuttingPlaneNormal ?? [0, 0, 0];
    const inputCuttingPlanePosition = data.cuttingPlanePosition ?? [0, 0, 0];
    const height = data.height ?? 3;

    const [startX, , startZ] = start;
    const [endX, , endZ] = end;

    const endVec = new THREE.Vector3(endX, elevation, endZ);
    const startVec = new THREE.Vector3(startX, elevation, startZ);

    const horizontalVec = new THREE.Vector3(
      endX - startX,
      elevation,
      endZ - startZ,
    );

    const yAxis = new THREE.Vector3(0, 1, 0);
    const thicknessDir = new THREE.Vector3()
      .crossVectors(horizontalVec, yAxis)
      .normalize();

    const offsetVec = thicknessDir.clone().multiplyScalar(offset);
    endVec.add(offsetVec);
    startVec.add(offsetVec);

    const delta = thicknessDir.clone().multiplyScalar(thickness / 2);
    const rectanglePoints = [
      startVec.clone().add(delta),
      endVec.clone().add(delta),
      endVec.clone().sub(delta),
      startVec.clone().sub(delta),
    ];

    rectanglePoints.push(rectanglePoints[0]); // Close the loop

    const profilePoints = new api.wasmModule.DoubleVector(); // Flat vector

    for (const p of rectanglePoints) {
      profilePoints.push_back(p.x);
      profilePoints.push_back(p.y);
      profilePoints.push_back(p.z);
    }

    const dirPoint = new api.wasmModule.DoubleVector();
    for (const p of direction) {
      dirPoint.push_back(p);
    }

    const cuttingPlaneNormal = new api.wasmModule.DoubleVector();
    for (const p of inputCuttingPlaneNormal) {
      cuttingPlaneNormal.push_back(p);
    }

    // ✅ Convert `cuttingPlanePos` to a `DoubleVector`
    const cuttingPlanePos = new api.wasmModule.DoubleVector();
    for (const p of inputCuttingPlanePosition) {
      cuttingPlanePos.push_back(p);
    }

    this.core.SetValues(
      profilePoints,
      dirPoint,
      height,
      cuttingPlaneNormal,
      cuttingPlanePos,
      true,
    );

    const result = this.core.GetBuffers();

    this.core.ClearHoles();

    return result;
  }
}
