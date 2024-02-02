import * as THREE from "three";
import { Item } from "./base-types";
import { FragmentMesh } from "./fragment-mesh";
import { FragmentsGroup } from "./fragments-group";
import { BVH } from "./bvh";

/*
 * Fragments are just a simple wrapper around THREE.InstancedMesh.
 * Each fragments can contain Items (identified by ItemID) which
 * are mapped to one or many instances inside this THREE.InstancedMesh.
 *
 * Fragments also implement features like instance buffer resizing and
 * hiding out of the box.
 * */
export class Fragment {
  ids = new Set<number>();

  itemToInstances = new Map<number, Set<number>>();
  instanceToItem = new Map<number, number>();
  hiddenItems = new Set<number>();

  id: string;

  mesh: FragmentMesh;

  capacity = 0;
  capacityOffset = 10;

  fragments: { [id: string]: Fragment } = {};

  group?: FragmentsGroup;

  private _settingVisibility = false;

  constructor(
    geometry: THREE.BufferGeometry,
    material: THREE.Material | THREE.Material[],
    count: number
  ) {
    this.mesh = new FragmentMesh(geometry, material, count, this);
    this.id = this.mesh.uuid;
    this.capacity = count;
    this.mesh.count = 0;
    BVH.apply(geometry);
  }

  dispose(disposeResources = true) {
    this.clear();

    this.group = undefined;

    if (this.mesh) {
      if (disposeResources) {
        for (const mat of this.mesh.material) {
          mat.dispose();
        }
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

    for (const key in this.fragments) {
      const frag = this.fragments[key];
      frag.dispose(disposeResources);
    }

    this.fragments = {};
  }

  get(itemID: number) {
    const instanceIDs = this.getInstancesIDs(itemID);
    if (!instanceIDs) {
      throw new Error("Item not found!");
    }
    const transforms: THREE.Matrix4[] = [];
    const colorsArray: THREE.Color[] = [];
    for (const id of instanceIDs) {
      const matrix = new THREE.Matrix4();
      this.mesh.getMatrixAt(id, matrix);
      transforms.push(matrix);
      if (this.mesh.instanceColor) {
        const color = new THREE.Color();
        this.mesh.getColorAt(id, color);
      }
    }
    const colors = colorsArray.length ? colorsArray : undefined;
    return { id: itemID, transforms, colors } as Item;
  }

  getItemID(instanceID: number) {
    return this.instanceToItem.get(instanceID) || null;
  }

  getInstancesIDs(itemID: number) {
    return this.itemToInstances.get(itemID) || null;
  }

  update() {
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  add(items: Item[]) {
    let size = 0;
    for (const item of items) {
      size += item.transforms.length;
    }

    const necessaryCapacity = this.mesh.count + size;

    if (necessaryCapacity > this.capacity) {
      const newMesh = new FragmentMesh(
        this.mesh.geometry,
        this.mesh.material,
        necessaryCapacity + this.capacityOffset,
        this
      );

      newMesh.count = this.mesh.count;

      this.capacity = size;
      const oldMesh = this.mesh;
      oldMesh.parent?.add(newMesh);
      oldMesh.removeFromParent();
      this.mesh = newMesh;
      oldMesh.dispose();
    }

    for (let i = 0; i < items.length; i++) {
      const { transforms, colors, id } = items[i];
      const instances = new Set<number>();

      this.ids.add(id);

      for (let j = 0; j < transforms.length; j++) {
        const transform = transforms[j];
        const newInstanceID = this.mesh.count;
        this.mesh.setMatrixAt(newInstanceID, transform);

        if (colors) {
          const color = colors[j];
          this.mesh.setColorAt(newInstanceID, color);
        }

        instances.add(newInstanceID);
        this.instanceToItem.set(newInstanceID, id);

        this.mesh.count++;
      }

      this.itemToInstances.set(id, instances);
    }

    this.update();
  }

  remove(itemsIDs: Iterable<number>) {
    if (this.mesh.count === 0) {
      return;
    }

    for (const itemID of itemsIDs) {
      const instancesToDelete = this.itemToInstances.get(itemID);
      if (instancesToDelete === undefined) {
        throw new Error("Instances not found!");
      }

      for (const instanceID of instancesToDelete) {
        if (this.mesh.count === 0) throw new Error("Errow with mesh count!");
        this.putLast(instanceID);
        this.instanceToItem.delete(instanceID);
        this.mesh.count--;
      }

      this.itemToInstances.delete(itemID);
      this.ids.delete(itemID);
    }

    this.update();
  }

  clear() {
    this.hiddenItems.clear();
    this.ids.clear();
    this.instanceToItem.clear();
    this.itemToInstances.clear();
    this.mesh.count = 0;
  }

  addFragment(id: string, material = this.mesh.material) {
    const newGeometry = new THREE.BufferGeometry();
    const attrs = this.mesh.geometry.attributes;

    newGeometry.setAttribute("position", attrs.position);
    newGeometry.setAttribute("normal", attrs.normal);
    newGeometry.setIndex(Array.from(this.mesh.geometry.index.array));

    const newFragment = new Fragment(newGeometry, material, this.capacity);

    const items: Item[] = [];
    for (const id of this.ids) {
      const item = this.get(id);
      items.push(item);
    }
    newFragment.add(items);

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

  setVisibility(visible: boolean, itemIDs = this.ids) {
    if (this._settingVisibility) return;
    this._settingVisibility = true;
    if (visible) {
      for (const itemID of itemIDs) {
        if (!this.hiddenItems.has(itemID)) {
          continue;
        }
        const instances = this.itemToInstances.get(itemID);
        if (!instances) throw new Error("Instances not found!");
        for (const instance of new Set(instances)) {
          this.mesh.count++;
          this.putLast(instance);
        }
        this.hiddenItems.delete(itemID);
      }
    } else {
      for (const itemID of itemIDs) {
        if (this.hiddenItems.has(itemID)) {
          continue;
        }
        const instances = this.itemToInstances.get(itemID);
        if (!instances) throw new Error("Instances not found!");
        for (const instance of new Set(instances)) {
          this.putLast(instance);
          this.mesh.count--;
        }
        this.hiddenItems.add(itemID);
      }
    }
    this.update();
    this._settingVisibility = false;
  }

  exportData() {
    const geometry = this.mesh.exportData();
    const ids = Array.from(this.ids);
    const id = this.id;
    return { ...geometry, ids, id };
  }

  private putLast(instanceID: number) {
    if (this.mesh.count === 0) return;

    const id1 = this.instanceToItem.get(instanceID);

    const instanceID2 = this.mesh.count - 1;
    if (instanceID2 === instanceID) {
      return;
    }

    const id2 = this.instanceToItem.get(instanceID2);

    if (id1 === undefined || id2 === undefined) {
      throw new Error("Keys not found");
    }

    const instances1 = this.itemToInstances.get(id1);
    const instances2 = this.itemToInstances.get(id2);

    if (!instances1 || !instances2) {
      throw new Error("Instances not found");
    }

    if (!instances1.has(instanceID) || !instances2.has(instanceID2)) {
      throw new Error("Malformed fragment structure");
    }

    instances1.delete(instanceID);
    instances2.delete(instanceID2);

    instances1.add(instanceID2);
    instances2.add(instanceID);

    this.instanceToItem.set(instanceID, id2);
    this.instanceToItem.set(instanceID2, id1);

    const transform1 = new THREE.Matrix4();
    const transform2 = new THREE.Matrix4();

    this.mesh.getMatrixAt(instanceID, transform1);
    this.mesh.getMatrixAt(instanceID2, transform2);
    this.mesh.setMatrixAt(instanceID, transform2);
    this.mesh.setMatrixAt(instanceID2, transform1);

    if (this.mesh.instanceColor !== null) {
      const color1 = new THREE.Color();
      const color2 = new THREE.Color();
      this.mesh.getColorAt(instanceID, color1);
      this.mesh.getColorAt(instanceID2, color2);
      this.mesh.setColorAt(instanceID, color2);
      this.mesh.setColorAt(instanceID2, color1);
    }
  }
}
