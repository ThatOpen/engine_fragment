export enum PolygonSize {
  four = 4,
  three = 3,
}

export interface ShellHoleData {
  indices: number[];
  points: number[];
  normals?: number[];
}

export interface DataSizes {
  indices: number;
  vertices: number;
  verticesAmount: number;
  normals: number;
  normalsAmount: number;
}
