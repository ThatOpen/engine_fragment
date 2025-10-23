import * as WEBIFC from "web-ifc";
// import * as THREE from "three";
// import { ImplicitGeometry } from "./implicit-geometry";
// import { Profile } from "./profile";

export type ExtrusionData = {
  profilePoints?: number[];
  profileHoles?: number[][];
  direction?: number[];
  cuttingPlaneNormal?: number[];
  cuttingPlanePosition?: number[];
  length?: number;
  cap?: boolean;
};

export class Extrusion {
  core: WEBIFC.Extrusion;

  constructor(api: WEBIFC.IfcAPI) {
    this.core = api.CreateExtrusion() as WEBIFC.Extrusion;
  }

  get(api: WEBIFC.IfcAPI, data: ExtrusionData) {
    // Convert all data to DoubleVectors

    // prettier-ignore
    const inputProfilePoints = data.profilePoints ?? [
      0, 0, 0,
      1, 0, 0,
      1, 1, 0,
      0, 1, 0,
    ];

    const inputProfileHoles = data.profileHoles ?? [];
    const inputDirection = data.direction ?? [0, 0, 1];
    const inputCutPlaneNor = data.cuttingPlaneNormal ?? [0, 0, 0];
    const inputCutPlanePos = data.cuttingPlanePosition ?? [0, 0, 0];
    const inputLength = data.length ?? 1;
    const inputCap = data.cap ?? true;

    // Profile points

    const profilePoints = new api.wasmModule.DoubleVector(); // Flat vector
    for (const coord of inputProfilePoints) {
      profilePoints.push_back(coord);
    }

    // Profile holes

    for (const hole of inputProfileHoles) {
      const holeVector = new api.wasmModule.DoubleVector();

      for (const coord of hole) {
        holeVector.push_back(coord);
      }

      // Send the hole to the core extrusion
      this.core.SetHoles(holeVector);
    }

    // Direction

    const dirPoint = new api.wasmModule.DoubleVector();
    for (const coord of inputDirection) {
      dirPoint.push_back(coord);
    }

    // Cutting plane normal

    const cuttingPlaneNormal = new api.wasmModule.DoubleVector();
    for (const coord of inputCutPlaneNor) {
      cuttingPlaneNormal.push_back(coord);
    }

    // Cutting plane position

    const cuttingPlanePos = new api.wasmModule.DoubleVector();
    for (const coord of inputCutPlanePos) {
      cuttingPlanePos.push_back(coord);
    }

    // Apply

    this.core.SetValues(
      profilePoints,
      dirPoint,
      inputLength,
      cuttingPlaneNormal,
      cuttingPlanePos,
      inputCap,
    );

    // Get geometry buffers

    const result = this.core.GetBuffers();

    this.core.ClearHoles();

    return result;
  }
}
