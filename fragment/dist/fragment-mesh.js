import { InstancedMesh } from 'three';
import { BufferAttribute } from 'three/src/core/BufferAttribute';
export class FragmentMesh extends InstancedMesh {
    constructor(geometry, material, count) {
        super(geometry, material, count);
        this.elementCount = 0;
        this.material = FragmentMesh.newMaterialArray(material);
        this.geometry = this.newFragmentGeometry(geometry);
    }
    newFragmentGeometry(geometry) {
        const size = geometry.attributes.position.count;
        const array = new Uint16Array(size);
        array.fill(this.elementCount++);
        geometry.attributes.blockId = new BufferAttribute(array, 3);
        FragmentMesh.initializeGroups(geometry, size);
        return geometry;
    }
    static initializeGroups(geometry, size) {
        if (!geometry.groups.length) {
            geometry.groups.push({
                start: 0,
                count: size,
                materialIndex: 0
            });
        }
    }
    static newMaterialArray(material) {
        if (!Array.isArray(material))
            material = [material];
        return material;
    }
}
//# sourceMappingURL=fragment-mesh.js.map