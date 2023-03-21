import { BufferGeometry, Material, Matrix4 } from "three";
import { BufferAttribute } from "three/src/core/BufferAttribute";
import { InterleavedBufferAttribute } from "three/src/core/InterleavedBufferAttribute";
import { FragmentMesh } from "./fragment-mesh";

// The number array has the meaning: [start, end, start, end, start, end...]
export interface Indices {
  [materialID: number]: number[];
}

export interface VertexGroup {
  start: number;
  count: number;
  materialIndex?: number;
}

export interface IndicesMap {
  indexCache: Uint32Array;
  map: Map<number, Indices>;
}

export interface Items {
  ids?: string[];
  transform: Matrix4;
}

export interface IFragmentGeometry extends BufferGeometry {
  attributes: {
    [name: string]: BufferAttribute | InterleavedBufferAttribute;
    blockID: BufferAttribute;
  };
  index: BufferAttribute;
}

export interface IFragmentMesh {
  material: Material[];
  geometry: IFragmentGeometry;
  elementCount: number;
}

export interface IFragment {
  mesh: FragmentMesh;
  capacity: number;
  fragments: { [id: string]: IFragment };
  id: string;
}

export interface ExportedFragment {
  ids: string[];
  matrices: number[];
  id: string;
}
