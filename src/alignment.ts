import { IifcAlignmentData } from "./base-types";

export class IfcAlignmentData implements IifcAlignmentData {
  Coordinates: Float32Array = new Float32Array(0);
  CurveLenght: number[] = [];
  SegmentLenght: number[] = [];

  exportData() {
    const coordinates = this.Coordinates;
    const curveLenght = this.CurveLenght;
    const segmentLenght = this.SegmentLenght;
    return { coordinates, curveLenght, segmentLenght };
  }
}
