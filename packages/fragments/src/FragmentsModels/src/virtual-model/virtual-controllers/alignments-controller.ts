import { Alignment, Model } from "../../../../Schema";
import { AlignmentData } from "../../model/model-types";

export class AlignmentsController {
  private _model: Model;

  constructor(model: Model) {
    this._model = model;
  }

  async getAlignments() {
    const allAlignments: AlignmentData[] = [];

    const alignmentsSize = this._model.alignmentsLength();
    for (let i = 0; i < alignmentsSize; i++) {
      const alignment = this._model.alignments(i)!;

      const current: AlignmentData = {
        absolute: [],
        horizontal: [],
        vertical: [],
      };
      allAlignments.push(current);

      this.constructAlignment(alignment, current, "absolute");
      this.constructAlignment(alignment, current, "horizontal");
      this.constructAlignment(alignment, current, "vertical");
    }

    return allAlignments;
  }

  private constructAlignment(
    alignment: Alignment,
    current: AlignmentData,
    type: "absolute" | "horizontal" | "vertical",
  ) {
    const lengthIds = {
      absolute: "absoluteLength",
      horizontal: "horizontalLength",
      vertical: "verticalLength",
    };

    const lengthId = lengthIds[type] as
      | "absoluteLength"
      | "horizontalLength"
      | "verticalLength";

    const curveSize = alignment[lengthId]();

    const geometries = this._model.geometries()!;

    for (let j = 0; j < curveSize; j++) {
      const sampleId = alignment[type](j)!;
      const sample = geometries.samples(sampleId)!;

      const reprIndex = sample.id();

      const representation = geometries.representations(reprIndex)!;
      const geomIndex = representation.id();
      const geometryClass = representation.geometryClass()!;

      // TODO: For now, all alignments are lines
      // in the future, we will have to handle other geometry classes
      const curveBuffer: number[] = [];
      const lines = geometries.lines(geomIndex)!;
      const coords = lines.pointsArray()!;
      for (const coord of coords) {
        curveBuffer.push(coord);
      }

      current[type].push({
        points: new Float32Array(curveBuffer),
        type: geometryClass,
      });
    }
  }
}
