import * as WEBIFC from "web-ifc";
import * as THREE from "three";

export type RevolveData = {
  transform?: number[];
  profile?: number[];
  start?: number;
  end?: number;
  segmentCount?: number;
};

export class Revolve {
  core: WEBIFC.Revolution;

  constructor(api: WEBIFC.IfcAPI) {
    this.core = api.CreateRevolution() as WEBIFC.Revolution;
  }

  get(api: WEBIFC.IfcAPI, data: RevolveData) {
    const doubleProfile = new api.wasmModule.DoubleVector(); // Flat vector
    const profile = data.profile ?? [];
    for (const p of profile) {
      doubleProfile.push_back(p);
    }

    const doubleTrans = new api.wasmModule.DoubleVector(); // Flat vector
    const transform = data.transform ?? new THREE.Matrix4().identity().elements;
    for (const p of transform) {
      doubleTrans.push_back(p);
    }

    const start = data.start ?? 0;
    const end = data.end ?? 180;
    const count = data.segmentCount ?? 12;

    this.core.SetValues(doubleProfile, doubleTrans, start, end, count);

    return this.core.GetBuffers();
  }
}
