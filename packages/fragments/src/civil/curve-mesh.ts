import * as THREE from "three";
import { Alignment } from "./alignment";
import { CivilCurve } from "./civil-curve";

/**
 * Represents an alignment 3D curve mesh with additional civil engineering properties.
 * Extends THREE.LineSegments to provide geometry and material for the curve.
 *
 * @template TGeometry - The type of geometry for the curve mesh. Default is THREE.BufferGeometry.
 * @template TMaterial - The type of material(s) for the curve mesh. Default is THREE.Material or THREE.Material[].
 */
export class CurveMesh<
  TGeometry extends THREE.BufferGeometry = THREE.BufferGeometry,
  TMaterial extends THREE.Material | THREE.Material[] =
    | THREE.Material
    | THREE.Material[],
> extends THREE.LineSegments<TGeometry, TMaterial> {
  /**
   * The civil curve associated with this curve mesh.
   */
  curve: CivilCurve;

  /**
   * Constructs a new instance of CurveMesh.
   *
   * @param index - The index of the curve mesh.
   * @param data - The data associated with the curve mesh.
   * @param alignment - The alignment of the curve mesh.
   * @param geometry - The geometry for the curve mesh. Optional.
   * @param material - The material(s) for the curve mesh. Optional.
   */
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
