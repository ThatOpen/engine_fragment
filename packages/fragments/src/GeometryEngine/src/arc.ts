import * as THREE from "three";
import * as WEBIFC from "web-ifc";

export type ArcData = {
  startPosition?: THREE.Vector3;
  radiusX?: number;
  radiusY?: number;
  numSegments?: number;
  placement?: THREE.Matrix3; // 3x3 matrix equivalent of glm::dmat3
  start?: number;
  end?: number;
  swap?: boolean;
  endingNormalToCenter?: boolean;
};

export class Arc {
  core: WEBIFC.Arc;

  constructor(api: WEBIFC.IfcAPI) {
    this.core = api.CreateArc() as WEBIFC.Arc;
  }

  get(api: WEBIFC.IfcAPI, data: ArcData) {
    const placement = data.placement ?? new THREE.Matrix3();

    // Create a flat vector for the matrix values
    const placementValues = new api.wasmModule.DoubleVector();

    // THREE.Matrix3 stores values in a flat 1D array
    placement.elements.forEach((value) => {
      placementValues.push_back(value);
    });

    const radiusX = data.radiusX ?? 1;
    const radiusY = data.radiusY ?? 1;
    const numSegments = data.numSegments ?? 12;
    const startRad = data.start ?? 0;
    const endRad = data.end ?? Math.PI;
    const swap = data.swap ?? false;
    const normalToCenterEnding = data.endingNormalToCenter ?? false;

    this.core.SetValues(
      radiusX,
      radiusY,
      numSegments,
      placementValues,
      startRad,
      endRad,
      swap,
      normalToCenterEnding,
    );

    return this.core.GetBuffers();
  }
}
