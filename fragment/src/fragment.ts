import { BufferGeometry, InstancedMesh, Material, Matrix4 } from 'three';

export interface Elements {
  [elementID: string]: Matrix4;
}

export interface ElementInstanceMap {
  [elementID: string]: number;
}

export class Fragment {
  mesh: InstancedMesh;
  capacity: number;
  elements: ElementInstanceMap = {};
  fragments: { [id: string]: Fragment } = {};

  constructor(geometry: BufferGeometry, materials: Material | Material[], count: number) {
    this.mesh = new InstancedMesh(geometry, materials, count);
    this.capacity = count;
  }

  set instances(instances: Elements) {
    const elementIDs = Object.keys(instances);
    const length = elementIDs.length;
    for (let i = 0; i < length; i++) {
      const id = elementIDs[i];
      this.elements[id] = i;
      this.mesh.setMatrixAt(i, instances[id]);
    }
  }

  addFragment(id: string, material = this.mesh.material) {
    this.fragments[id] = new Fragment(this.mesh.geometry, material, this.capacity);
    return this.fragments[id];
  }
}
