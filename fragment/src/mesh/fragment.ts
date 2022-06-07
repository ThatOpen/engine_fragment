import { InstancedMesh, Matrix4 } from 'three';
import { FragmentData, Instances, NestedFragmentData } from './base-types';
import { FragmentList } from '../fragmentList';

export class Fragment {
  id: string;

  // If the fragment contains multiple elements
  composed = false;

  private mesh: InstancedMesh;

  private instances: { [elementID: string]: { index: number; matrix: Matrix4 } } = {};
  private instanceCapacity: number;

  private nestedFragments = new FragmentList();

  private tempMatrix = new Matrix4();

  get capacity() {
    return this.instanceCapacity;
  }

  set capacity(newCapacity: number) {
    const newMesh = new InstancedMesh(this.mesh.geometry, this.mesh.material, newCapacity);

    this.mesh.geometry = null as any;
    this.mesh.material = null as any;
    this.mesh.dispose();

    this.mesh = newMesh;
    this.instanceCapacity = newCapacity;
  }

  constructor(data: FragmentData) {
    this.id = data.id;
    this.mesh = new InstancedMesh(data.geometry, data.material, data.count);
    this.instanceCapacity = data.count;
    this.addInstances(data.instances);
  }

  remove() {}

  addInstances(instances: Instances) {
    this.extendCapacityIfNeeded(instances);
    let index = Object.keys(this.instances).length;

    Object.keys(instances).forEach((elementID) => {
      const matrix = instances[elementID];
      this.instances[elementID] = { index, matrix };
      this.mesh.setMatrixAt(index, matrix);
      index++;
    });
  }

  removeInstances(elementIDs: number[]) {
    const indices = new Set();

    for (const id of elementIDs) {
      if (this.instances[id]) {
        indices.add(this.instances[id].index);
        delete this.instances[id];
      }
    }

    this.removeInstancesAndRearrangeTheRest(indices);
    this.mesh.count -= indices.size;
  }

  clearInstances() {
    this.mesh.clear();
  }

  addGeometry() {}

  removeGeometry() {}

  addFragment(data: NestedFragmentData) {
    const instances = this.getInstances(data);
    this.initializeFragment(data);
    const fragment = this.nestedFragments.get(data.id);
    if (data.removePrevious) {
      fragment.clearInstances();
    }

    fragment.addInstances(instances);
  }

  removeFragment(id: string) {
    this.nestedFragments.remove(id);
  }

  private getInstances(data: NestedFragmentData) {
    const instances: Instances = {};
    for (const elementID of data.elementIDs) {
      if (this.instances[elementID]) {
        instances[elementID] = this.instances[elementID].matrix;
      }
    }
    return instances;
  }

  private initializeFragment(data: NestedFragmentData) {
    if (!this.nestedFragments.get(data.id)) {
      this.nestedFragments.create({
        id: data.id,
        geometry: this.mesh.geometry,
        count: this.capacity,
        instances: {},
        material: data.material || this.mesh.material
      });
    }
  }

  private extendCapacityIfNeeded(instances: Instances) {
    const count = Object.keys(instances).length;
    const isCapacityExceded = this.mesh.count + count > this.instanceCapacity;
    if (isCapacityExceded) {
      this.capacity += count;
    }
  }

  private removeInstancesAndRearrangeTheRest(indices: Set<any>) {
    let accumulator = 0;
    for (let i = 0; i < this.mesh.count; i++) {
      if (indices.has(i)) {
        accumulator++;
      } else if (accumulator > 0) {
        this.mesh.getMatrixAt(i, this.tempMatrix);
        this.mesh.setMatrixAt(i - accumulator, this.tempMatrix);
      }
    }
  }
}
