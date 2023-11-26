import { IifcAlignmentData } from "./base-types";

export class IfcAlignmentData implements IifcAlignmentData {
  coordinates: Float32Array = new Float32Array(0);
  alignmentIndex: number[] = [];
  curveIndex: number[] = [];

  exportData() {
    const { coordinates, alignmentIndex, curveIndex } = this;
    return { coordinates, alignmentIndex, curveIndex };
  }
}
