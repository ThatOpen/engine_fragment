import * as THREE from "three";
import { Alignment } from "./alignment";
import { CivilCurve } from "./civil-curve";

export class CurveMesh<
  TGeometry extends THREE.BufferGeometry = THREE.BufferGeometry,
  TMaterial extends THREE.Material | THREE.Material[] =
    | THREE.Material
    | THREE.Material[],
> extends THREE.LineSegments<TGeometry, TMaterial> {
  curve: CivilCurve;

  constructor(
    index: number,
    data: { [name: string]: any },
    alignment: Alignment,
    geometry?: TGeometry,
    material?: TMaterial,
  ) {
    super(geometry, material);
    this.curve = new CivilCurve(index, this, data, alignment);
  }
}
