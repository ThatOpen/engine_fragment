import * as WEBIFC from "web-ifc";

export type CircularSweepData = {
  profilePoints?: number[];
  directrix?: number[];
  initNormal?: number[];
  scale?: number;
  closed?: boolean;
  radius?: number;
  rotate?: boolean; // Rotate 90º
};

export class CircularSweep {
  core: WEBIFC.CircularSweep;

  constructor(api: WEBIFC.IfcAPI) {
    this.core = api.CreateCircularSweep() as WEBIFC.CircularSweep;
  }

  get(api: WEBIFC.IfcAPI, data: CircularSweepData) {
    const doubleProfilePoints = new api.wasmModule.DoubleVector(); // Flat vector
    const profilePoints = data.profilePoints ?? [];
    for (const p of profilePoints) {
      doubleProfilePoints.push_back(p);
    }

    const doubleDirPoint = new api.wasmModule.DoubleVector();
    const directrix = data.directrix ?? [];
    for (const p of directrix) {
      doubleDirPoint.push_back(p);
    }

    const doubleInitNormal = new api.wasmModule.DoubleVector();
    const initNormal = data.initNormal ?? [0, 0, 0];
    for (const p of initNormal) {
      doubleInitNormal.push_back(p);
    }

    const scale = data.scale ?? 1;
    const closed = data.closed ?? false;
    const radius = data.radius ?? 10;
    const rotate = data.rotate ?? false;

    this.core.SetValues(
      scale,
      closed,
      doubleProfilePoints,
      radius,
      doubleDirPoint,
      doubleInitNormal,
      rotate
    );

    return this.core.GetBuffers();
  }
}
