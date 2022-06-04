import { BufferGeometry, InstancedMesh, Matrix4 } from 'three';
import { FragmentData, SubsetData } from './base-types';

export class Fragment {
  mesh: InstancedMesh;
  instances: { [elementID: string]: { index: number; matrix: Matrix4 } } = {};
  subsets: { [name: string]: InstancedMesh } = {};

  // If the fragment contains multiple elements
  multiple = false;

  private tempMatrix = new Matrix4();

  get id() {
    return this.mesh.uuid;
  }

  constructor(data: FragmentData) {
    this.mesh = new InstancedMesh(data.geometry, data.material, data.count);
    this.createInstances(data);
  }

  remove() {}

  addInstance() {}

  removeInstance() {}

  addGeometry() {}

  removeGeometry() {}

  getSubset() {}

  createSubset(data: SubsetData) {
    const ids = data.elementIDs.map((id) => this.instances[id].index);
    this.createSubsetifDoesntExist(data);
    const subset = this.subsets[data.name];
    const offset = this.getSubsetOffset(data, ids);

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      this.mesh.getMatrixAt(id, this.tempMatrix);
      subset.setMatrixAt(id + offset, this.tempMatrix);
    }
  }

  removeFromSubset() {}

  clearSubsets() {}

  private createInstances(data: FragmentData) {
    if (data.instances) {
      let i = 0;
      Object.keys(data.instances).forEach((id) => {
        this.instances[id].index = i++;
        const matrix = data.instances![id];
        this.mesh.setMatrixAt(i, matrix);
      });
    }
  }

  private createSubsetifDoesntExist(data: SubsetData) {
    if (!this.subsets[data.name]) {
      this.subsets[data.name] = new InstancedMesh(
        new BufferGeometry(),
        data.material,
        this.mesh.count
      );
    }
  }

  private getSubsetOffset(data: SubsetData, ids: number[]) {
    const subset = this.subsets[data.name];
    const previousSize = subset.count;
    const baseSize = data.removePrevious ? 0 : subset.count;
    subset.count = baseSize + ids.length;
    return data.removePrevious ? 0 : previousSize;
  }
}
