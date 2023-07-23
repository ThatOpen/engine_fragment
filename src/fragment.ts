import { BufferGeometry, Material, Matrix4 } from "three";
import { BufferAttribute } from "three/src/core/BufferAttribute";
import { Items, IFragment } from "./base-types";
import { FragmentMesh } from "./fragment-mesh";
import { Blocks } from "./blocks";
import { BVH } from "./bvh";
import { FragmentsGroup } from "./fragments-group";

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
 * The items will look like this:
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
  id: string;
  blocks: Blocks;

  items: string[] = [];
  hiddenInstances: { [id: string]: Items } = {};
  group?: FragmentsGroup;

  // When multiple instances represent the same object
  // this allows to create a composite ID for each instance
  // E.g. all the steps in a stair are a single thing
  // so if the ID of the stair is asdf, then each step could be
  // asdf.1, asdf.2, asdf.3, etc
  // the value is the number of instances
  composites: { [id: string]: number } = {};

  get ids() {
    const ids = new Set<string>();
    for (const id of this.items) {
      ids.add(id);
    }
    for (const id in this.hiddenInstances) {
      ids.add(id);
    }
    return ids;
  }

  constructor(
    geometry: BufferGeometry,
    material: Material | Material[],
    count: number
  ) {
    this.mesh = new FragmentMesh(geometry, material, count, this);
    this.id = this.mesh.uuid;
    this.capacity = count;
    this.blocks = new Blocks(this);
    BVH.apply(geometry);
  }

  dispose(disposeResources = true) {
    (this.items as any) = null;
    this.group = undefined;

    if (this.mesh) {
      if (disposeResources) {
        this.mesh.material.forEach((mat) => mat.dispose());
        this.mesh.material = [];
        BVH.dispose(this.mesh.geometry);
        this.mesh.geometry.dispose();
        (this.mesh.geometry as any) = null;
      }

      this.mesh.removeFromParent();
      this.mesh.dispose();

      (this.mesh.fragment as any) = null;
      (this.mesh as any) = null;
    }

    this.disposeNestedFragments();
  }

  getItemID(instanceID: number, blockID: number) {
    const index = this.getItemIndex(instanceID, blockID);
    return this.items[index];
  }

  getInstanceAndBlockID(itemID: string) {
    const index = this.items.indexOf(itemID);
    const instanceID = this.getInstanceIDFromIndex(index);
    const blockID = index % this.blocks.count;
    return { instanceID, blockID };
  }

  getVertexBlockID(geometry: BufferGeometry, index: number) {
    const blocks = geometry.attributes.blockID as BufferAttribute;
    return blocks.array[index];
  }

  getItemData(itemID: string) {
    const index = this.items.indexOf(itemID);
    const instanceID = Math.ceil(index / this.blocks.count);
    const blockID = index % this.blocks.count;
    return { instanceID, blockID };
  }

  getInstance(instanceID: number, matrix: Matrix4) {
    return this.mesh.getMatrixAt(instanceID, matrix);
  }

  setInstance(instanceID: number, items: Items) {
    this.checkIfInstanceExist(instanceID);
    this.mesh.setMatrixAt(instanceID, items.transform);
    this.mesh.instanceMatrix.needsUpdate = true;

    if (items.ids) {
      this.saveItemsInMap(items.ids, instanceID);
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

  removeInstances(itemsIDs: string[]) {
    if (this.mesh.count <= 1) {
      this.clear();
      return;
    }

    this.deleteAndRearrangeInstances(itemsIDs);
    this.mesh.count -= itemsIDs.length;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear() {
    this.mesh.clear();
    this.mesh.count = 0;
    this.items = [];
  }

  addFragment(id: string, material = this.mesh.material) {
    const newGeometry = this.initializeGeometry();
    if (material === this.mesh.material) {
      this.copyGroups(newGeometry);
    }

    const newFragment = new Fragment(newGeometry, material, this.capacity);
    newFragment.mesh.applyMatrix4(this.mesh.matrix);
    newFragment.mesh.updateMatrix();
    this.fragments[id] = newFragment;
    return this.fragments[id];
  }

  removeFragment(id: string) {
    const fragment = this.fragments[id];
    if (fragment) {
      fragment.dispose(false);
      delete this.fragments[id];
    }
  }

  resetVisibility() {
    if (this.blocks.count > 1) {
      this.blocks.reset();
    } else {
      const hiddenInstances = Object.keys(this.hiddenInstances);
      this.makeInstancesVisible(hiddenInstances);
      this.hiddenInstances = {};
    }
  }

  setVisibility(visible: boolean, itemIDs = this.ids as Iterable<string>) {
    if (this.blocks.count > 1) {
      this.toggleBlockVisibility(visible, itemIDs);
      this.mesh.geometry.disposeBoundsTree();
      BVH.apply(this.mesh.geometry);
    } else {
      this.toggleInstanceVisibility(visible, itemIDs);
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

  exportData() {
    const geometry = this.mesh.exportData();
    const ids = this.items.join("|");
    const id = this.id;
    return { ...geometry, ids, id };
  }

  private copyGroups(newGeometry: BufferGeometry) {
    newGeometry.groups = [];
    for (const group of this.mesh.geometry.groups) {
      newGeometry.groups.push({ ...group });
    }
  }

  private initializeGeometry() {
    const newGeometry = new BufferGeometry();
    newGeometry.setAttribute(
      "position",
      this.mesh.geometry.attributes.position
    );
    newGeometry.setAttribute("normal", this.mesh.geometry.attributes.normal);
    newGeometry.setAttribute("blockID", this.mesh.geometry.attributes.blockID);
    newGeometry.setIndex(Array.from(this.mesh.geometry.index.array));
    return newGeometry;
  }

  private saveItemsInMap(ids: string[], instanceId: number) {
    this.checkBlockNumberValid(ids);
    let counter = 0;
    for (const id of ids) {
      const index = this.getItemIndex(instanceId, counter);
      this.items[index] = id;
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
    const newMesh = new FragmentMesh(
      this.mesh.geometry,
      this.mesh.material,
      capacity,
      this
    );
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

  private checkBlockNumberValid(ids: string[]) {
    if (ids.length > this.blocks.count) {
      throw new Error(
        `You passed more items (${ids.length}) than blocks in this instance (${this.blocks.count})`
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
  private deleteAndRearrangeInstances(ids: Iterable<string>) {
    const deletedItems: Items[] = [];

    for (const id of ids) {
      const deleted = this.deleteAndRearrange(id);
      if (deleted) {
        deletedItems.push(deleted);
      }
    }

    for (const id of ids) {
      delete this.hiddenInstances[id];
    }

    return deletedItems;
  }

  private deleteAndRearrange(id: string) {
    const index = this.items.indexOf(id);
    if (index === -1) return null;

    this.mesh.count--;
    const isLastElement = index === this.mesh.count;

    const instanceId = this.getInstanceIDFromIndex(index);
    const tempMatrix = new Matrix4();

    const transform = new Matrix4();
    this.mesh.getMatrixAt(instanceId, transform);

    if (isLastElement) {
      this.items.pop();
      return { ids: [id], transform } as Items;
    }

    const lastElement = this.mesh.count;

    this.items[index] = this.items[lastElement];
    this.items.pop();

    this.mesh.getMatrixAt(lastElement, tempMatrix);
    this.mesh.setMatrixAt(instanceId, tempMatrix);
    this.mesh.instanceMatrix.needsUpdate = true;

    return { ids: [id], transform } as Items;
  }

  private getItemIndex(instanceId: number, blockId: number) {
    return instanceId * this.blocks.count + blockId;
  }

  private getInstanceIDFromIndex(itemIndex: number) {
    return Math.trunc(itemIndex / this.blocks.count);
  }

  private toggleInstanceVisibility(
    visible: boolean,
    itemIDs: Iterable<string>
  ) {
    if (visible) {
      this.makeInstancesVisible(itemIDs);
    } else {
      this.makeInstancesInvisible(itemIDs);
    }
  }

  private makeInstancesInvisible(itemIDs: Iterable<string>) {
    itemIDs = this.filterHiddenItems(itemIDs, false);
    const deletedItems = this.deleteAndRearrangeInstances(itemIDs);
    for (const item of deletedItems) {
      if (item.ids) {
        this.hiddenInstances[item.ids[0]] = item;
      }
    }
  }

  private makeInstancesVisible(itemIDs: Iterable<string>) {
    const items: Items[] = [];
    itemIDs = this.filterHiddenItems(itemIDs, true);
    for (const id of itemIDs) {
      const found = this.hiddenInstances[id];
      if (found !== undefined) {
        items.push(found);
        delete this.hiddenInstances[id];
      }
    }
    this.addInstances(items);
  }

  private filterHiddenItems(itemIDs: Iterable<string>, hidden: boolean) {
    const hiddenItems = Object.keys(this.hiddenInstances);
    const result: string[] = [];
    for (const id of itemIDs) {
      const isHidden = hidden && hiddenItems.includes(id);
      const isNotHidden = !hidden && !hiddenItems.includes(id);
      if (isHidden || isNotHidden) {
        result.push(id);
      }
    }
    return result;
  }

  private toggleBlockVisibility(visible: boolean, itemIDs: Iterable<string>) {
    const blockIDs: number[] = [];
    for (const id of itemIDs) {
      const blockID = this.getInstanceAndBlockID(id).blockID;
      blockIDs.push(blockID);
    }
    if (visible) {
      this.blocks.add(blockIDs, false);
    } else {
      this.blocks.remove(blockIDs);
    }
  }
}
