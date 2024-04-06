import { BufferGeometry } from "three/src/core/BufferGeometry";
import { Material } from "three/src/materials/Material";
import * as THREE from "three";
import { Alignment } from "./alignment";
import { CivilCurve } from "./civil-curve";

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
    this.curve = new CivilCurve(index, this, data, alignment);
  }
}
