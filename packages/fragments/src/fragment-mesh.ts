import * as THREE from "three";
import { Fragment } from "./fragment";
import { IndexedGeometry } from "./base-types";

export class FragmentMesh extends THREE.InstancedMesh {
  fragment: Fragment;
  material: THREE.Material[];
  geometry: IndexedGeometry;

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

  exportData() {
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
