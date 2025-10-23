import * as WEBIFC from "web-ifc";

export type ClothoidData = {
  startPoint?: number[];
  startDirection?: number;
  segments?: number;
  startRadius?: number;
  endRadius?: number;
  segmentLength?: number;
};

export class Clothoid {
  core: WEBIFC.Clothoid;

  constructor(api: WEBIFC.IfcAPI) {
    this.core = api.CreateClothoid() as WEBIFC.Clothoid;
  }

  get(data: ClothoidData) {

    // segments: number = 12;
    // startPoint = new THREE.Vector3(0, 0, 0);
    // ifcStartDirection: number = 0.5;
    // StartRadiusOfCurvature: number = 5;
    // EndRadiusOfCurvature: number = 0;
    // SegmentLength: number = 5;

    const start = data.startPoint ?? [0, 0, 0];
    const startDir = data.startDirection ?? 0.5;
    const segments = data.segments ?? 12;
    const startRadius = data.startRadius ?? 5;
    const endRadius = data.endRadius ?? 0;
    const segmentLength = data.segmentLength ?? 5;

    const [startX, startY, startZ] = start;

    this.core.SetValues(
      segments,
      startX,
      startY,
      startZ,
      startDir,
      startRadius,
      endRadius,
      segmentLength,
    );

    return this.core.GetBuffers();
  }
}
