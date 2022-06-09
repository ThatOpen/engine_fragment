import { BufferGeometry, InstancedMesh, Material, Matrix4 } from 'three';
export interface Elements {
    [elementID: string]: Matrix4;
}
export interface ElementInstanceMap {
    [elementID: string]: number;
}
export declare class Fragment {
    mesh: InstancedMesh;
    capacity: number;
    fragments: {
        [id: string]: Fragment;
    };
    private elements;
    set instances(instances: Elements);
    constructor(geometry: BufferGeometry, materials: Material | Material[], count: number);
    dispose(): void;
    getInstance(index: number, transformation: Matrix4): void;
    setInstance(index: number, transformation: Matrix4): void;
    addInstances(elements: Elements): void;
    removeInstances(ids: string[]): void;
    addFragment(id: string, material?: Material | Material[]): Fragment;
    removeFragment(id: string): void;
    resize(size: number): void;
    private resizeCapacityIfNeeded;
    private createNewInstances;
    private createNewMesh;
    private disposeFragment;
    private disposeMesh;
    private disposeNestedFragments;
    private disposeMaterials;
    private checkIfIndexExist;
    private deleteAndRearrangeInstances;
}
