import * as THREE from "three";
import { Fragment } from "./fragment";
import { IndexedGeometry } from "./base-types";

/**
 * A class representing a THREE.InstancedMesh with additional properties for fragment data.
 *
 * @extends THREE.InstancedMesh
 */
export class FragmentMesh extends THREE.InstancedMesh {
  /**
   * The fragment associated with this mesh.
   */
  fragment: Fragment;

  /**
   * The materials used by this mesh.
   * If a single material is provided, it will be wrapped in an array.
   */
  material: THREE.Material[];

  /**
   * The geometry used by this mesh.
   * It must be an IndexedGeometry.
   */
  geometry: IndexedGeometry;

  /**
   * Constructs a new FragmentMesh.
   *
   * @param geometry - The geometry for the mesh. Must be indexed.
   * @param material - The material(s) for the mesh. If a single material is provided, it will be wrapped in an array.
   * @param count - The number of instances to create.
   * @param fragment - The fragment associated with this mesh.
   */
  constructor(
    geometry: THREE.BufferGeometry,
    material: THREE.Material | THREE.Material[],
    count: number,
    fragment: Fragment,
  ) {
    super(geometry, material, count);

    if (!Array.isArray(material)) {
      material = [material];
    }

    this.material = material;

    if (!geometry.index) {
      throw new Error("The geometry for fragments must be indexed!");
    }

    this.geometry = geometry as IndexedGeometry;
    this.fragment = fragment;

    const size = geometry.index.count;
    if (!geometry.groups.length) {
      geometry.groups.push({
        start: 0,
        count: size,
        materialIndex: 0,
      });
    }
  }

  /**
   * Exports the data of the fragment mesh to a serializable format.
   *
   * @returns An object containing the position, normal, index, groups, materials, matrices, and colors of the fragment mesh.
   */
  exportData(): {
    position: Float32Array;
    normal: Float32Array;
    index: number[];
    groups: number[];
    materials: number[];
    matrices: number[];
    colors: number[];
  } {
    const position = this.geometry.attributes.position.array as Float32Array;
    const normal = this.geometry.attributes.normal.array as Float32Array;
    const index = Array.from(this.geometry.index.array as Uint32Array);

    const groups: number[] = [];
    for (const group of this.geometry.groups) {
      const index = group.materialIndex || 0;
      const { start, count } = group;
      groups.push(start, count, index);
    }

    const materials: number[] = [];
    if (Array.isArray(this.material)) {
      for (const material of this.material as THREE.MeshLambertMaterial[]) {
        const opacity = material.opacity;
        const transparent = material.transparent ? 1 : 0;
        const color = new THREE.Color(material.color).toArray();
        materials.push(opacity, transparent, ...color);
      }
    }

    const matrices = Array.from(this.instanceMatrix.array);

    let colors: number[];
    if (this.instanceColor !== null) {
      colors = Array.from(this.instanceColor.array);
    } else {
      colors = [];
    }

    return {
      position,
      normal,
      index,
      groups,
      materials,
      matrices,
      colors,
    };
  }
}
