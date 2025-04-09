import { Model } from "../../../../Schema";
import { AlignmentData } from "../../model/model-types";

export class AlignmentsController {
  private _model: Model;

  constructor(model: Model) {
    this._model = model;
  }

  async getAlignments() {
    const allAlignments: AlignmentData[] = [];

    const geometries = this._model.geometries()!;

    const alignmentsSize = this._model.alignmentsLength();
    for (let i = 0; i < alignmentsSize; i++) {
      const alignment = this._model.alignments(i)!;
      const absoluteCurveSize = alignment.absoluteLength();

      const currentAlignment: AlignmentData = {
        absolute: [],
      };
      allAlignments.push(currentAlignment);

      for (let j = 0; j < absoluteCurveSize; j++) {
        const sampleId = alignment.absolute(j)!;
        const sample = geometries.samples(sampleId)!;

        const geometryClass = sample.geometryClass();
        const geomId = sample.id();

        // TODO: For now, all alignments are lines
        // in the future, we will have to handle other geometry classes

        const curveBuffer: number[] = [];
        const lines = geometries.lines(geomId)!;
        for (let k = 0; k < lines.pointsLength(); k++) {
          const point = lines.points(k)!;
          const x = point.x();
          const y = point.y();
          const z = point.z();
          curveBuffer.push(x, y, z);
        }

        currentAlignment.absolute.push({
          points: new Float32Array(curveBuffer),
          type: geometryClass,
        });
      }
    }

    return allAlignments;
  }
}
