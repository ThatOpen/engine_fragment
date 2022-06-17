import { BufferGeometry, Matrix4 } from 'three';
import { FragmentMesh } from './fragment-mesh';
/*
 * Fragments can contain one or multiple Instances of one or multiple Blocks
 * Each Instance is identified by an instanceId (property of THREE.InstancedMesh)
 * Each Block identified by a blockId (custom bufferAttribute per vertex)
 * Both instanceId and blockId are unsigned integers starting at 0 and going up sequentially
 * A specific Block of a specific Instance is an Item, identified by an itemId
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
export class Fragment {
    constructor(geometry, material, count) {
        this.fragments = {};
        this.blockCount = 1;
        this.itemsMap = [];
        this.mesh = new FragmentMesh(geometry, material, count);
        this.capacity = count;
    }
    dispose(disposeResources = true) {
        this.itemsMap = null;
        if (disposeResources) {
            this.mesh.material.forEach((mat) => mat.dispose());
            this.mesh.geometry.dispose();
        }
        this.mesh.dispose();
        this.mesh = null;
        this.disposeNestedFragments();
    }
    getItem(instanceId, blockId) {
        const index = this.getItemIndex(instanceId, blockId);
        return this.itemsMap[index];
    }
    getInstance(instanceId, matrix) {
        return this.mesh.getMatrixAt(instanceId, matrix);
    }
    setInstance(instanceId, items) {
        this.checkIfInstanceExist(instanceId);
        this.mesh.setMatrixAt(instanceId, items.transform);
        this.mesh.instanceMatrix.needsUpdate = true;
        if (items.ids) {
            this.saveItemsInMap(items.ids, instanceId);
        }
    }
    addInstances(items) {
        this.resizeCapacityIfNeeded(items.length);
        const start = this.mesh.count;
        this.mesh.count += items.length;
        for (let i = 0; i < items.length; i++) {
            this.setInstance(start + i, items[i]);
        }
    }
    removeInstances(ids) {
        if (this.mesh.count <= 1) {
            this.clear();
            return;
        }
        this.deleteAndRearrangeInstances(ids);
        this.mesh.count -= ids.length;
        this.mesh.instanceMatrix.needsUpdate = true;
    }
    clear() {
        this.mesh.clear();
        this.mesh.count = 0;
        this.itemsMap = [];
    }
    addFragment(id, material = this.mesh.material) {
        const newGeometry = new BufferGeometry();
        newGeometry.attributes = this.mesh.geometry.attributes;
        newGeometry.setIndex(this.mesh.geometry.index);
        this.fragments[id] = new Fragment(newGeometry, material, this.capacity);
        return this.fragments[id];
    }
    removeFragment(id) {
        const fragment = this.fragments[id];
        if (fragment) {
            fragment.dispose(false);
            delete this.fragments[id];
        }
    }
    resize(size) {
        var _a;
        const newMesh = this.createFragmentMeshWithNewSize(size);
        this.capacity = size;
        const oldMesh = this.mesh;
        (_a = oldMesh.parent) === null || _a === void 0 ? void 0 : _a.add(newMesh);
        oldMesh.removeFromParent();
        this.mesh = newMesh;
        oldMesh.dispose();
    }
    saveItemsInMap(ids, instanceId) {
        this.checkBlockNumberValid(ids);
        let counter = 0;
        for (const id of ids) {
            const index = this.getItemIndex(instanceId, counter);
            this.itemsMap[index] = id;
            counter++;
        }
    }
    resizeCapacityIfNeeded(newSize) {
        const necessaryCapacity = newSize + this.mesh.count;
        if (necessaryCapacity > this.capacity) {
            this.resize(necessaryCapacity);
        }
    }
    createFragmentMeshWithNewSize(capacity) {
        const newMesh = new FragmentMesh(this.mesh.geometry, this.mesh.material, capacity);
        newMesh.count = this.mesh.count;
        return newMesh;
    }
    disposeNestedFragments() {
        const fragments = Object.values(this.fragments);
        for (let i = 0; i < fragments.length; i++) {
            fragments[i].dispose();
        }
        this.fragments = {};
    }
    checkBlockNumberValid(ids) {
        if (ids.length > this.blockCount) {
            throw new Error(`You passed more items (${ids.length}) than blocks in this instance (${this.blockCount})`);
        }
    }
    checkIfInstanceExist(index) {
        if (index > this.mesh.count) {
            throw new Error(`The given index (${index}) exceeds the instances in this fragment (${this.mesh.count})`);
        }
    }
    // Assigns the index of the removed instance to the last instance
    // F.e. let there be 6 instances: (A) (B) (C) (D) (E) (F)
    // If instance (C) is removed: -> (A) (B) (F) (D) (E)
    deleteAndRearrangeInstances(ids) {
        for (const id of ids) {
            this.deleteAndRearrange(id);
        }
    }
    deleteAndRearrange(id) {
        const index = this.itemsMap.indexOf(id);
        if (index === -1)
            return;
        this.mesh.count--;
        const lastElement = this.mesh.count;
        this.itemsMap[index] = this.itemsMap[lastElement];
        this.itemsMap.pop();
        const instanceId = this.getInstanceId(id);
        const tempMatrix = new Matrix4();
        this.mesh.getMatrixAt(lastElement, tempMatrix);
        this.mesh.setMatrixAt(instanceId, tempMatrix);
    }
    getItemIndex(instanceId, blockId) {
        return instanceId * this.blockCount + blockId;
    }
    getInstanceId(itemIndex) {
        return Math.trunc(itemIndex / this.blockCount);
    }
}
//# sourceMappingURL=fragment.js.map