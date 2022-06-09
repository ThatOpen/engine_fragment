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
  fragments: { [id: string]: Fragment } = {};

  private elements: ElementInstanceMap = {};

  set instances(instances: Elements) {
    const elementIDs = Object.keys(instances);
    const length = elementIDs.length;
    for (let i = 0; i < length; i++) {
      const id = elementIDs[i];
      this.elements[id] = i;
      this.mesh.setMatrixAt(i, instances[id]);
    }
  }

  constructor(geometry: BufferGeometry, materials: Material | Material[], count: number) {
    this.mesh = new InstancedMesh(geometry, materials, count);
    this.capacity = count;
  }

  dispose() {
    this.elements = {};
    this.disposeFragment();
    this.disposeNestedFragments();
  }

  getInstance(index: number, transformation: Matrix4) {
    this.mesh.getMatrixAt(index, transformation);
  }

  setInstance(index: number, transformation: Matrix4) {
    this.checkIfIndexExist(index);
    this.mesh.setMatrixAt(index, transformation);
  }

  addInstances(elements: Elements) {
    const ids = Object.keys(elements);
    this.resizeCapacityIfNeeded(ids);
    this.createNewInstances(ids, elements);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  removeInstances(ids: string[]) {
    if (this.mesh.count === 0) return;
    if (this.mesh.count === 1) {
      this.mesh.clear();
      this.mesh.count = 0;
      return;
    }

    this.deleteAndRearrangeInstances(ids);
    this.mesh.count -= ids.length;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  addFragment(id: string, material = this.mesh.material) {
    this.fragments[id] = new Fragment(this.mesh.geometry, material, this.capacity);
    return this.fragments[id];
  }

  removeFragment(id: string) {
    const fragment = this.fragments[id];
    if (fragment) {
      fragment.dispose();
      delete this.fragments[id];
    }
  }

  resize(size: number) {
    const newMesh = this.createNewMesh(size);
    this.capacity = size;
    const oldMesh = this.mesh;
    oldMesh.parent?.add(newMesh);
    oldMesh.removeFromParent();
    this.mesh = newMesh;
    this.disposeMesh(oldMesh);
  }

  private resizeCapacityIfNeeded(ids: string[]) {
    const necessaryCapacity = ids.length + this.mesh.count;
    if (necessaryCapacity > this.capacity) {
      this.resize(necessaryCapacity);
    }
  }

  private createNewInstances(ids: string[], elements: Elements) {
    const start = this.mesh.count;
    this.mesh.count += ids.length;

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const transformation = elements[id];
      this.setInstance(start + i, transformation);
    }
  }

  private createNewMesh(necessaryCapacity: number) {
    const newMesh = new InstancedMesh(this.mesh.geometry, this.mesh.material, necessaryCapacity);
    newMesh.count = this.mesh.count;
    const transform = new Matrix4();
    for (let i = 0; i < this.mesh.count; i++) {
      this.getInstance(i, transform);
      newMesh.setMatrixAt(i, transform);
    }

    return newMesh;
  }

  private disposeFragment() {
    this.mesh.geometry.dispose();
    this.disposeMaterials();
    this.disposeMesh(this.mesh);
    (this.mesh as any) = null;
  }

  private disposeMesh(mesh: InstancedMesh) {
    (mesh.geometry as any) = null;
    (mesh.material as any) = null;
    (mesh.instanceMatrix as any) = null;
  }

  private disposeNestedFragments() {
    const fragments = Object.values(this.fragments);
    for (let i = 0; i < fragments.length; i++) {
      fragments[i].dispose();
    }
    this.fragments = {};
  }

  private disposeMaterials() {
    const mats = this.mesh.material;
    if (Array.isArray(mats)) {
      mats.forEach((mat) => mat.dispose());
    } else {
      mats.dispose();
    }
  }

  private checkIfIndexExist(index: number) {
    if (index > this.mesh.count) {
      throw new Error(
        `The given index (${index}) exceeds the instances in this fragment (${this.mesh.count})`
      );
    }
  }

  // Assigns the index of the removed instance to the last instance
  // F.e. let there be 6 instances: (1) (2) (3) (4) (5) (6)
  // If instance (3) is removed: -> (1) (2) (4) (5) (3)
  private deleteAndRearrangeInstances(ids: string[]) {
    let inverseIndex = this.mesh.count;
    const tempMatrix = new Matrix4();
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const index = this.elements[id];
      if (index !== undefined) {
        this.mesh.getMatrixAt(i - inverseIndex, tempMatrix);
        this.mesh.setMatrixAt(index, tempMatrix);
        inverseIndex--;
      }
    }
  }
}
