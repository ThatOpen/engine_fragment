import { InstancedMesh, Matrix4 } from 'three';
import { FragmentList } from '../fragmentList';
export class Fragment {
    constructor(data) {
        // If the fragment contains multiple elements
        this.composed = false;
        this.instances = {};
        this.nestedFragments = new FragmentList();
        this.tempMatrix = new Matrix4();
        this.id = data.id;
        this.mesh = new InstancedMesh(data.geometry, data.material, data.count);
        this.instanceCapacity = data.count;
        this.addInstances(data.instances);
    }
    get capacity() {
        return this.instanceCapacity;
    }
    set capacity(newCapacity) {
        const newMesh = new InstancedMesh(this.mesh.geometry, this.mesh.material, newCapacity);
        this.mesh.geometry = null;
        this.mesh.material = null;
        this.mesh.dispose();
        this.mesh = newMesh;
        this.instanceCapacity = newCapacity;
    }
    dispose() {
        this.nestedFragments.dispose();
        this.nestedFragments = null;
        this.mesh.clear();
        this.mesh.geometry.dispose();
        this.mesh.geometry = null;
        this.disposeMaterials();
        this.mesh.material = null;
        this.mesh = null;
        this.instances = {};
        this.instanceCapacity = 0;
    }
    setInstance(elementID, transformation) {
        const instance = this.instances[elementID];
        if (instance !== undefined) {
            this.mesh.setMatrixAt(instance, transformation);
            this.mesh.instanceMatrix.needsUpdate = true;
        }
    }
    addInstances(instances) {
        this.extendCapacityIfNeeded(instances);
        let index = Object.keys(this.instances).length;
        Object.keys(instances).forEach((elementID) => {
            const matrix = instances[elementID];
            this.instances[elementID] = index;
            this.mesh.setMatrixAt(index, matrix);
            index++;
        });
    }
    removeInstances(elementIDs) {
        const indices = new Set();
        for (const id of elementIDs) {
            if (this.instances[id]) {
                indices.add(this.instances[id]);
                delete this.instances[id];
            }
        }
        this.removeInstancesAndRearrangeTheRest(indices);
        this.mesh.count -= indices.size;
    }
    clearInstances() {
        this.mesh.clear();
    }
    // addGeometry() {}
    // removeGeometry() {}
    addFragment(data) {
        const instances = this.getInstances(data);
        this.initializeFragment(data);
        const fragment = this.nestedFragments.get(data.id);
        if (data.removePrevious) {
            fragment.clearInstances();
        }
        fragment.addInstances(instances);
        return fragment;
    }
    removeFragment(id) {
        this.nestedFragments.remove(id);
    }
    getInstances(data) {
        const instances = {};
        for (const elementID of data.elementIDs) {
            if (this.instances[elementID]) {
                const index = this.instances[elementID];
                this.mesh.getMatrixAt(index, this.tempMatrix);
                instances[elementID] = this.tempMatrix.clone();
            }
        }
        return instances;
    }
    initializeFragment(data) {
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
    extendCapacityIfNeeded(instances) {
        const count = Object.keys(instances).length;
        const necessaryCapacity = this.mesh.count + count;
        const isCapacityExceded = necessaryCapacity > this.instanceCapacity;
        if (isCapacityExceded) {
            this.capacity += count;
        }
    }
    removeInstancesAndRearrangeTheRest(indices) {
        let accumulator = 0;
        for (let i = 0; i < this.mesh.count; i++) {
            if (indices.has(i)) {
                accumulator++;
            }
            else if (accumulator > 0) {
                this.mesh.getMatrixAt(i, this.tempMatrix);
                this.mesh.setMatrixAt(i - accumulator, this.tempMatrix);
            }
        }
    }
    disposeMaterials() {
        const mats = this.mesh.material;
        if (Array.isArray(mats)) {
            mats.forEach((mat) => mat.dispose());
        }
        else {
            mats.dispose();
        }
    }
}
//# sourceMappingURL=fragment.js.map