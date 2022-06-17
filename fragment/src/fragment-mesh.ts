import { BufferGeometry, InstancedMesh } from 'three';
import { Material } from 'three/src/materials/Material';
import { BufferAttribute } from 'three/src/core/BufferAttribute';
import { FragmentGeometry } from './base-types';

export class FragmentMesh extends InstancedMesh {
  material: Material[];
  geometry: FragmentGeometry;
  elementCount = 0;

  constructor(geometry: BufferGeometry, material: Material | Material[], count: number) {
    super(geometry, material, count);
    this.material = FragmentMesh.newMaterialArray(material);
    this.geometry = this.newFragmentGeometry(geometry);
  }

  private newFragmentGeometry(geometry: BufferGeometry) {
    const size = geometry.attributes.position.count;
    const array = new Uint16Array(size);
    array.fill(this.elementCount++);
    geometry.attributes.blockId = new BufferAttribute(array, 3);
    FragmentMesh.initializeGroups(geometry, size);
    return geometry as FragmentGeometry;
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
