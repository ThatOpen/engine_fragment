import { Matrix4 } from 'three';
import { FragmentData, Instances, NestedFragmentData } from './base-types';
export declare class Fragment {
    id: string;
    composed: boolean;
    private mesh;
    private instances;
    private instanceCapacity;
    private nestedFragments;
    private tempMatrix;
    get capacity(): number;
    set capacity(newCapacity: number);
    constructor(data: FragmentData);
    dispose(): void;
    setInstance(elementID: string, transformation: Matrix4): void;
    addInstances(instances: Instances): void;
    removeInstances(elementIDs: number[]): void;
    clearInstances(): void;
    addFragment(data: NestedFragmentData): Fragment;
    removeFragment(id: string): void;
    private getInstances;
    private initializeFragment;
    private extendCapacityIfNeeded;
    private removeInstancesAndRearrangeTheRest;
    private disposeMaterials;
}
