import { TileData } from "../types";
import { DataSizes } from "./types";

export class ShellFace3 {
  private static readonly vertexIncrease = 3;
  private static readonly totalIncrease = 9;

  static create(
    indices: Uint16Array,
    data: Float32Array,
    normals: Int16Array,
    mesh: TileData,
    sizes: DataSizes,
  ) {
    this.setIndices(mesh, sizes);
    this.setPoints(indices, mesh, sizes, data);
    this.setNormals(mesh, sizes, normals);
    this.updateData(sizes);
  }

  private static setNormals(
    mesh: TileData,
    sizes: DataSizes,
    normals: Int16Array,
  ) {
    const normal = mesh.normalBuffer!;
    for (let i = 0; i < this.totalIncrease; i++) {
      normal[sizes.normalsAmount + i] = normals[i];
    }
  }

  private static setPoints(
    indices: Uint16Array,
    mesh: TileData,
    sizes: DataSizes,
    data: Float32Array,
  ) {
    let counter = 0;
    const points = mesh.positionBuffer!;
    for (let i = 0; i < this.vertexIncrease; i++) {
      const index = indices[i] * this.vertexIncrease;
      for (let j = 0; j < this.vertexIncrease; j++) {
        points[sizes.verticesAmount + counter] = data[index + j];
        counter++;
      }
    }
  }

  private static setIndices(mesh: TileData, sizes: DataSizes) {
    const index = mesh.indexBuffer!;
    for (let i = 0; i < this.vertexIncrease; i++) {
      index[sizes.indices + i] = sizes.vertices + i;
    }
    sizes.indices += this.vertexIncrease;
  }

  private static updateData(sizes: DataSizes) {
    sizes.normalsAmount += ShellFace3.totalIncrease;
    sizes.vertices += ShellFace3.vertexIncrease;
    sizes.verticesAmount += ShellFace3.totalIncrease;
  }
}
