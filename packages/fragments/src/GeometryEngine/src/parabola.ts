import * as WEBIFC from "web-ifc";

export type ParabolaData = {
  segmentCount?: number;
  start?: number[];
  horizontalLength?: number;
  startHeight?: number;
  startGradient?: number;
  endGradient?: number;
};

export class Parabola {
  core: WEBIFC.Parabola;

  constructor(api: WEBIFC.IfcAPI) {
    this.core = api.CreateParabola() as WEBIFC.Parabola;
  }

  get(data: ParabolaData) {
    const segments = data.segmentCount ?? 12;
    const [x, y, z] = data.start ?? [0, 0, 0];
    const horLen = data.horizontalLength ?? 10;
    const startHeight = data.startHeight ?? 2;
    const startGrad = data.startGradient ?? 5;
    const endGrad = data.endGradient ?? 0;

    this.core.SetValues(
      segments,
      x,
      y,
      z,
      horLen,
      startHeight,
      startGrad,
      endGrad,
    );

    return this.core.GetBuffers();
  }
}
