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
    elements: ElementInstanceMap;
    fragments: {
        [id: string]: Fragment;
    };
    constructor(geometry: BufferGeometry, materials: Material | Material[], count: number);
    set instances(instances: Elements);
    addFragment(id: string, material?: Material | Material[]): Fragment;
}
