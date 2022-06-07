import { BufferGeometry, Material, Matrix4 } from 'three';

export enum MergeMode {
  matrix,
  geometry,
  both
}

export interface FragmentTags {
  [propertyValue: string]: string;
}

export interface FragmentsByTag {
  [propertyValue: string]: string[];
}

export interface TagsMap {
  [propertyName: string]: FragmentsByTag;
}

export interface Instances {
  [elementID: string]: Matrix4;
}

export interface FragmentData {
  id: string;
  material: Material | Material[];
  geometry: BufferGeometry;
  count: number;
  instances: Instances;
}

export interface NestedFragmentData {
  id: string;
  elementIDs: number[];
  material?: Material;
  removePrevious: boolean;
}
