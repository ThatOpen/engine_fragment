import { InstancedMesh } from 'three';
export class Fragment {
    constructor(geometry, materials, count) {
        this.elements = {};
        this.fragments = {};
        this.mesh = new InstancedMesh(geometry, materials, count);
        this.capacity = count;
    }
    set instances(instances) {
        const elementIDs = Object.keys(instances);
        const length = elementIDs.length;
        for (let i = 0; i < length; i++) {
            const id = elementIDs[i];
            this.elements[id] = i;
            this.mesh.setMatrixAt(i, instances[id]);
        }
    }
    addFragment(id, material = this.mesh.material) {
        this.fragments[id] = new Fragment(this.mesh.geometry, material, this.capacity);
        return this.fragments[id];
    }
}
//# sourceMappingURL=fragment.js.map