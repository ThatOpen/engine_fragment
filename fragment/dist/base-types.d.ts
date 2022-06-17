import { BufferGeometry, Matrix4 } from 'three';
import { BufferAttribute } from 'three/src/core/BufferAttribute';
import { InterleavedBufferAttribute } from 'three/src/core/InterleavedBufferAttribute';
export interface Items {
    ids?: number[];
    transform: Matrix4;
}
export interface ItemInstanceMap {
    [elementID: string]: number;
}
export interface FragmentGeometry extends BufferGeometry {
    attributes: {
        [name: string]: BufferAttribute | InterleavedBufferAttribute;
        blockId: BufferAttribute;
    };
}
