import * as THREE from "three";
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
  transform: THREE.Matrix4;
}

export interface IFragmentGeometry extends THREE.BufferGeometry {
  attributes: {
    [name: string]: BufferAttribute | InterleavedBufferAttribute;
    blockID: BufferAttribute;
  };
  index: BufferAttribute;
}

export interface IFragmentMesh {
  material: THREE.Material[];
  geometry: IFragmentGeometry;
  elementCount: number;
}

export interface IFragment {
  mesh: FragmentMesh;
  capacity: number;
  fragments: { [id: string]: IFragment };
  id: string;
}

export interface IfcProperties {
  [expressID: number]: { [attribute: string]: any }
};

export type IfcSchema = "IFC2X3" | "IFC4" | "IFC4X3";

export interface IfcMetadata {
  name: string;
  description: string;
  schema: IfcSchema;
  maxExpressID: number;
}

export interface FragmentMap {
  [fragmentID: string]: Set<number>
};
