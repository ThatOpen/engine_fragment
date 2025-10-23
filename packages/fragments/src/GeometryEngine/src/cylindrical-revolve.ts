import * as THREE from "three";
import * as WEBIFC from "web-ifc";

export type CylindricalRevolveData = {
  transformation?: number[];
  startAngle?: number;
  endAngle?: number;
  minZ?: number;
  maxZ?: number;
  segmentCount?: number;
  radius?: number;
};

export class CylindricalRevolve {
  core: WEBIFC.CylindricalRevolve;

  constructor(api: WEBIFC.IfcAPI) {
    this.core = api.CreateCylindricalRevolution() as WEBIFC.CylindricalRevolve;
  }

  get(api: WEBIFC.IfcAPI, data: CylindricalRevolveData) {
    const transformation = new api.wasmModule.DoubleVector(); // Flat vector

    const transform =
      data.transformation ?? new THREE.Matrix4().identity().elements;

    for (const element of transform) {
      transformation.push_back(element);
    }

    const startAngle = data.startAngle ?? 0;
    const endAngle = data.endAngle ?? 180;
    const minZ = data.minZ ?? -10;
    const maxZ = data.maxZ ?? 10;
    const numRots = data.segmentCount ?? 12;
    const radius = data.radius ?? 4;

    this.core.SetValues(
      transformation,
      startAngle,
      endAngle,
      minZ,
      maxZ,
      numRots,
      radius,
    );
    return this.core.GetBuffers();
  }
}
