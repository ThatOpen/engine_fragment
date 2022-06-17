import { BufferGeometry, Material, Matrix4 } from 'three';
import { Items } from './base-types';
import { FragmentMesh } from './fragment-mesh';
export declare class Fragment {
    mesh: FragmentMesh;
    capacity: number;
    fragments: {
        [id: string]: Fragment;
    };
    blockCount: number;
    private itemsMap;
    constructor(geometry: BufferGeometry, material: Material | Material[], count: number);
    dispose(disposeResources?: boolean): void;
    getItem(instanceId: number, blockId: number): number;
    getInstance(instanceId: number, matrix: Matrix4): void;
    setInstance(instanceId: number, items: Items): void;
    addInstances(items: Items[]): void;
    removeInstances(ids: number[]): void;
    clear(): void;
    addFragment(id: string, material?: Material[]): Fragment;
    removeFragment(id: string): void;
    resize(size: number): void;
    private saveItemsInMap;
    private resizeCapacityIfNeeded;
    private createFragmentMeshWithNewSize;
    private disposeNestedFragments;
    private checkBlockNumberValid;
    private checkIfInstanceExist;
    private deleteAndRearrangeInstances;
    private deleteAndRearrange;
    private getItemIndex;
    private getInstanceId;
}
