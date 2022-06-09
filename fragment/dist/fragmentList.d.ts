import { FragmentData } from './mesh/base-types';
import { Fragment } from './mesh/fragment';
export declare class FragmentList {
    private list;
    get(id: string): Fragment;
    create(data: FragmentData): Fragment;
    remove(id: string): void;
    dispose(): void;
}
