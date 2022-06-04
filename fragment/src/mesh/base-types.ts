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

export interface FragmentData {
  geometry: BufferGeometry;
  material: Material | Material[];
  count: number;
  tags: FragmentTags;
  instances?: { [elementID: string]: Matrix4 };
}

export interface SubsetData {
  name: string;
  elementIDs: number[];
  material?: Material;
  removePrevious: boolean;
}
