import * as WEBIFC from "web-ifc";

export type SweepData = {
  profilePoints?: number[];
  curvePoints?: number[];
  startNormal?: number[];
  scale?: number;
  close?: boolean;
  rotate90?: boolean;
  optimize?: boolean;
};

export class Sweep {
  core: WEBIFC.Sweep;

  constructor(api: WEBIFC.IfcAPI) {
    this.core = api.CreateSweep() as WEBIFC.Sweep;
  }

  get(api: WEBIFC.IfcAPI, data: SweepData) {
    const inputProfilePoints = data.profilePoints ?? [];
    const inputCurvePoints = data.curvePoints ?? [];
    const inputStartNormal = data.startNormal ?? [0, 0, 0];
    const scale = data.scale ?? 1;
    const close = data.close ?? false;
    const rotate90 = data.rotate90 ?? false;
    const optimize = data.optimize ?? false;

    const profilePoints = new api.wasmModule.DoubleVector(); // Flat vector

    for (const p of inputProfilePoints) {
      profilePoints.push_back(p);
    }

    const dirPoint = new api.wasmModule.DoubleVector();
    for (const p of inputCurvePoints) {
      dirPoint.push_back(p);
    }

    const iniNormal = new api.wasmModule.DoubleVector();

    for (const p of inputStartNormal) {
      iniNormal.push_back(p);
    }

    this.core.SetValues(
      scale,
      close,
      profilePoints,
      dirPoint,
      iniNormal,
      rotate90,
      optimize,
    );

    // Get geometry buffers

    const result = this.core.GetBuffers();

    return result;
  }
}
