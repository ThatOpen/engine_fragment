/* eslint no-use-before-define: 0 */

// eslint-disable-next-line max-classes-per-file
import * as THREE from "three";
import { BufferGeometry } from "three/src/core/BufferGeometry";
import { Material } from "three/src/materials/Material";

export class CurveMesh<
  TGeometry extends BufferGeometry = BufferGeometry,
  TMaterial extends Material | Material[] = Material | Material[]
> extends THREE.LineSegments<TGeometry, TMaterial> {
  curve: CivilCurve;

  constructor(
    index: number,
    data: { [name: string]: any },
    alignment: Alignment,
    geometry?: TGeometry,
    material?: TMaterial
  ) {
    super(geometry, material);
    this.curve = {
      index,
      data,
      alignment,
      mesh: this,
    };
  }
}

export interface CivilCurve {
  index: number;
  mesh: CurveMesh;
  data: { [name: string]: any };
  alignment: Alignment;
}

export class Alignment {
  vertical: CivilCurve[] = [];
  horizontal: CivilCurve[] = [];
  absolute: CivilCurve[] = [];
  initialKP = 0;
}
