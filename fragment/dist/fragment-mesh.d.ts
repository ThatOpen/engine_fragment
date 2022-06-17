import { BufferGeometry, InstancedMesh } from 'three';
import { Material } from 'three/src/materials/Material';
import { FragmentGeometry } from './base-types';
export declare class FragmentMesh extends InstancedMesh {
    material: Material[];
    geometry: FragmentGeometry;
    elementCount: number;
    constructor(geometry: BufferGeometry, material: Material | Material[], count: number);
    private newFragmentGeometry;
    private static initializeGroups;
    private static newMaterialArray;
}
