import * as THREE from "three";

export interface Item {
  id: number;

  transforms: THREE.Matrix4[];

  colors?: THREE.Color[];
}

export interface IfcProperties {
  [expressID: number]: {
    [attribute: string]: any;
  };
}

export type IfcSchema = "IFC2X3" | "IFC4" | "IFC4X3";

export interface IfcMetadata {
  name: string;

  description: string;

  schema: IfcSchema;

  maxExpressID: number;
}

export interface FragmentIdMap {
  [fragmentID: string]: Set<number>;
}

export type StreamedGeometries = Map<
  number,
  { position: Float32Array; normal: Float32Array; index: Uint32Array }
>;

export interface IndexedGeometry extends THREE.BufferGeometry {
  index: THREE.BufferAttribute;
}
