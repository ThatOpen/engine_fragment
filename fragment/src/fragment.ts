import { BufferGeometry, Intersection, Material, Matrix4, Mesh } from 'three';
import { Items, IFragment } from './base-types';
import { FragmentMesh } from './fragment-mesh';
import { SubsetManager } from './subsets/subset-manager';
import { BVH } from './subsets/bvh';

/*
 * Fragments can contain one or multiple Instances of one or multiple Blocks
 * Each Instance is identified by an instanceID (property of THREE.InstancedMesh)
 * Each Block identified by a blockID (custom bufferAttribute per vertex)
 * Both instanceId and blockId are unsigned integers starting at 0 and going up sequentially
 * A specific Block of a specific Instance is an Item, identified by an itemID
 *
 * For example:
 * Imagine a fragment mesh with 8 instances and 2 elements (16 items, identified from A to P)
 * It will have instanceIds from 0 to 8, and blockIds from 0 to 2
 * If we raycast it, we will get an instanceId and the index of the found triangle
 * We can use the index to get the blockId for that triangle
 * Combining instanceId and blockId using the elementMap will give us the itemId
 * The itemsMap will look like this:
 *
 *    [ A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P ]
 *
 *  Where the criteria to sort the items is the following (Y-axis is instance, X-axis is block):
 *
 *        A  C  E  G  I  K  M  O
 *        B  D  F  H  J  L  N  P
 * */

export class Fragment implements IFragment {
  mesh: FragmentMesh;
  capacity: number;
  fragments: { [id: string]: Fragment } = {};
  blockCount = 1;
  id: string;

  subsets: SubsetManager;

  private itemsMap: number[] = [];

  constructor(geometry: BufferGeometry, material: Material | Material[], count: number) {
    this.mesh = new FragmentMesh(geometry, material, count);
    this.id = this.mesh.uuid;
    this.capacity = count;
    this.subsets = new SubsetManager(this);
  }

  dispose(disposeResources = true) {
    (this.itemsMap as any) = null;

    if (disposeResources) {
      this.mesh.material.forEach((mat) => mat.dispose());
      BVH.dispose(this.mesh.geometry);
      this.mesh.geometry.dispose();
    }

    this.mesh.dispose();
    (this.mesh as any) = null;

    this.disposeNestedFragments();
  }

  getItem(instanceId: number, blockId: number) {
    const index = this.getItemIndex(instanceId, blockId);
    return this.itemsMap[index];
  }

  getInstance(instanceId: number, matrix: Matrix4) {
    return this.mesh.getMatrixAt(instanceId, matrix);
  }

  setInstance(instanceId: number, items: Items) {
    this.checkIfInstanceExist(instanceId);
    this.mesh.setMatrixAt(instanceId, items.transform);
    this.mesh.instanceMatrix.needsUpdate = true;

    if (items.ids) {
      this.saveItemsInMap(items.ids, instanceId);
    }
  }

  addInstances(items: Items[]) {
    this.resizeCapacityIfNeeded(items.length);
    const start = this.mesh.count;
    this.mesh.count += items.length;
    for (let i = 0; i < items.length; i++) {
      this.setInstance(start + i, items[i]);
    }
  }

  removeInstances(ids: number[]) {
    if (this.mesh.count <= 1) {
      this.clear();
      return;
    }

    this.deleteAndRearrangeInstances(ids);
    this.mesh.count -= ids.length;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  getBlockID(intersection: Intersection) {
    const mesh = intersection.object as Mesh;

    if (!mesh.geometry || !intersection.face) {
      return null;
    }

    return mesh.geometry.attributes.blockID.array[intersection.face.a];
  }

  setVisibleBlocks(blockIDs: number[]) {
    this.subsets.createSubset({
      fragment: this,
      ids: blockIDs,
      removePrevious: true
    });
  }

  clear() {
    this.mesh.clear();
    this.mesh.count = 0;
    this.itemsMap = [];
  }

  addFragment(id: string, material = this.mesh.material) {
    const newGeometry = new BufferGeometry();
    newGeometry.setAttribute('position', this.mesh.geometry.attributes.position);
    newGeometry.setAttribute('normal', this.mesh.geometry.attributes.normal);
    newGeometry.setAttribute('blockID', this.mesh.geometry.attributes.blockID);
    newGeometry.setIndex(Array.from(this.mesh.geometry.index.array));
    this.fragments[id] = new Fragment(newGeometry, material, this.capacity);
    return this.fragments[id];
  }

  removeFragment(id: string) {
    const fragment = this.fragments[id];
    if (fragment) {
      fragment.dispose(false);
      delete this.fragments[id];
    }
  }

  resize(size: number) {
    const newMesh = this.createFragmentMeshWithNewSize(size);
    this.capacity = size;
    const oldMesh = this.mesh;
    oldMesh.parent?.add(newMesh);
    oldMesh.removeFromParent();
    this.mesh = newMesh;
    oldMesh.dispose();
  }

  private saveItemsInMap(ids: number[], instanceId: number) {
    this.checkBlockNumberValid(ids);
    let counter = 0;
    for (const id of ids) {
      const index = this.getItemIndex(instanceId, counter);
      this.itemsMap[index] = id;
      counter++;
    }
  }

  private resizeCapacityIfNeeded(newSize: number) {
    const necessaryCapacity = newSize + this.mesh.count;
    if (necessaryCapacity > this.capacity) {
      this.resize(necessaryCapacity);
    }
  }

  private createFragmentMeshWithNewSize(capacity: number) {
    const newMesh = new FragmentMesh(this.mesh.geometry, this.mesh.material, capacity);
    newMesh.count = this.mesh.count;
    return newMesh;
  }

  private disposeNestedFragments() {
    const fragments = Object.values(this.fragments);
    for (let i = 0; i < fragments.length; i++) {
      fragments[i].dispose();
    }
    this.fragments = {};
  }

  private checkBlockNumberValid(ids: number[]) {
    if (ids.length > this.blockCount) {
      throw new Error(
        `You passed more items (${ids.length}) than blocks in this instance (${this.blockCount})`
      );
    }
  }

  private checkIfInstanceExist(index: number) {
    if (index > this.mesh.count) {
      throw new Error(
        `The given index (${index}) exceeds the instances in this fragment (${this.mesh.count})`
      );
    }
  }

  // Assigns the index of the removed instance to the last instance
  // F.e. let there be 6 instances: (A) (B) (C) (D) (E) (F)
  // If instance (C) is removed: -> (A) (B) (F) (D) (E)
  private deleteAndRearrangeInstances(ids: number[]) {
    for (const id of ids) {
      this.deleteAndRearrange(id);
    }
  }

  private deleteAndRearrange(id: number) {
    const index = this.itemsMap.indexOf(id);
    if (index === -1) return;

    this.mesh.count--;
    const lastElement = this.mesh.count;

    this.itemsMap[index] = this.itemsMap[lastElement];
    this.itemsMap.pop();

    const instanceId = this.getInstanceId(id);
    const tempMatrix = new Matrix4();
    this.mesh.getMatrixAt(lastElement, tempMatrix);
    this.mesh.setMatrixAt(instanceId, tempMatrix);
  }

  private getItemIndex(instanceId: number, blockId: number) {
    return instanceId * this.blockCount + blockId;
  }

  private getInstanceId(itemIndex: number) {
    return Math.trunc(itemIndex / this.blockCount);
  }
}
