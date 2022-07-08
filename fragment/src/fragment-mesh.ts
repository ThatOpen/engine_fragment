import { BufferGeometry, InstancedMesh } from 'three';
import { Material } from 'three/src/materials/Material';
import { BufferAttribute } from 'three/src/core/BufferAttribute';
import { IFragmentGeometry, IFragmentMesh } from './base-types';
import { BVH } from './bvh';

export class FragmentMesh extends InstancedMesh implements IFragmentMesh {
  material: Material[];
  geometry: IFragmentGeometry;
  elementCount = 0;

  constructor(geometry: BufferGeometry, material: Material | Material[], count: number) {
    super(geometry, material, count);
    BVH.apply(geometry);
    this.material = FragmentMesh.newMaterialArray(material);
    this.geometry = this.newFragmentGeometry(geometry);
  }

  private newFragmentGeometry(geometry: BufferGeometry) {
    if (!geometry.index) {
      throw new Error('The geometry must be indexed!');
    }

    if (!geometry.attributes.blockID) {
      const vertexSize = geometry.attributes.position.count;
      const array = new Uint16Array(vertexSize);
      array.fill(this.elementCount++);
      geometry.attributes.blockID = new BufferAttribute(array, 3);
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
        materialIndex: 0
      });
    }
  }

  private static newMaterialArray(material: Material | Material[]) {
    if (!Array.isArray(material)) material = [material];
    return material;
  }
}
