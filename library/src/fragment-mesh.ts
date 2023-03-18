import {
  BufferGeometry,
  InstancedMesh,
  Color,
  MeshLambertMaterial,
} from "three";
import { Material } from "three/src/materials/Material";
import { BufferAttribute } from "three/src/core/BufferAttribute";
import { IFragmentGeometry, IFragmentMesh } from "./base-types";

export class FragmentMesh extends InstancedMesh implements IFragmentMesh {
  material: Material[];
  geometry: IFragmentGeometry;
  elementCount = 0;

  constructor(
    geometry: BufferGeometry,
    material: Material | Material[],
    count: number
  ) {
    super(geometry, material, count);
    this.material = FragmentMesh.newMaterialArray(material);
    this.geometry = this.newFragmentGeometry(geometry);
  }

  export() {
    const position = Array.from(this.geometry.attributes.position.array);
    const normal = Array.from(this.geometry.attributes.normal.array);
    const blockID = Array.from(this.geometry.attributes.blockID.array);

    const groups: number[] = [];
    for (const group of this.geometry.groups) {
      const index = group.materialIndex || 0;
      const { start, count } = group;
      groups.push(start, count, index);
    }

    const materials: number[] = [];
    if (Array.isArray(this.material)) {
      for (const material of this.material as MeshLambertMaterial[]) {
        const opacity = material.opacity;
        const transparent = material.transparent ? 1 : 0;
        const color = new Color(material.color).toArray();
        materials.push(opacity, transparent, ...color);
      }
    }

    const matrices = Array.from(this.instanceMatrix.array);

    return { position, normal, blockID, groups, materials, matrices };
  }

  private newFragmentGeometry(geometry: BufferGeometry) {
    if (!geometry.index) {
      throw new Error("The geometry must be indexed!");
    }

    if (!geometry.attributes.blockID) {
      const vertexSize = geometry.attributes.position.count;
      const array = new Uint16Array(vertexSize);
      array.fill(this.elementCount++);
      geometry.attributes.blockID = new BufferAttribute(array, 1);
    }

    const size = geometry.index.count;
    FragmentMesh.initializeGroups(geometry, size);
    return geometry as IFragmentGeometry;
  }

  private static initializeGroups(geometry: BufferGeometry, size: number) {
    if (!geometry.groups.length) {
      geometry.groups.push({
        start: 0,
        count: size,
        materialIndex: 0,
      });
    }
  }

  private static newMaterialArray(material: Material | Material[]) {
    if (!Array.isArray(material)) material = [material];
    return material;
  }
}
