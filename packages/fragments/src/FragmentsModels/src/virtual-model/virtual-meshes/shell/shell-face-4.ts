import * as THREE from "three";
import { TileData } from "../types";
import { DataSizes } from "./types";
import { ShellFaceX } from "./shell-face-x";

export class ShellFace4 {
  private static a = new THREE.Vector3();
  private static b = new THREE.Vector3();
  private static c = new THREE.Vector3();
  private static d = new THREE.Vector3();
  private static e = new THREE.Vector3();
  private static f = new THREE.Vector3();
  private static g = new THREE.Vector3();
  private static h = new THREE.Vector3();
  private static i = new THREE.Vector3();

  private static _vecs = [this.a, this.b, this.c, this.d];
  private static _convexIndices = [0, 1, 3, 3, 1, 2];
  private static readonly totalIncrease = 12;
  private static readonly indexIncrease = 6;
  private static readonly vertexIncrease = 4;

  static create(
    indices: Uint16Array | Uint32Array,
    data: Float32Array,
    normals: Int16Array,
    id: number,
    mesh: TileData,
    sizes: DataSizes,
    faceId: number,
  ) {
    this.setAllVectors(indices, data);
    const isConvex = this.getIsConvex();
    if (isConvex) {
      this.processConvexFace4(mesh, sizes, normals, faceId);
      return;
    }
    ShellFaceX.create(
      indices,
      data,
      normals,
      id,
      mesh,
      undefined as any,
      sizes,
      faceId,
    );
  }

  private static setAllVectors(
    indices: Uint16Array | Uint32Array,
    data: Float32Array,
  ) {
    this.setVector(indices, data, this.a, 0);
    this.setVector(indices, data, this.b, 1);
    this.setVector(indices, data, this.c, 2);
    this.setVector(indices, data, this.d, 3);
    this.getCrossVectors();
  }

  private static processConvexFace4(
    mesh: TileData,
    sizes: DataSizes,
    normals: Int16Array,
    faceId: number,
  ) {
    this.processIndices(mesh, sizes);
    this.processPoints(mesh, sizes);
    this.processNormal(mesh, sizes, normals);
    this.setFaceId(mesh, sizes, faceId);
    this.updateData(sizes);
  }

  private static setFaceId(mesh: TileData, sizes: DataSizes, faceId: number) {
    // Add face id to next 4 vertices
    const faceIds = mesh.faceIdBuffer!;
    for (let i = sizes.vertices; i < sizes.vertices + 4; i++) {
      faceIds[i] = faceId;
    }
  }

  private static getIsConvex() {
    return this.h.dot(this.i) > 0;
  }

  private static getCrossVectors() {
    this.e.copy(this.b);
    this.f.copy(this.c);
    this.g.copy(this.d);
    this.e.sub(this.a);
    this.f.sub(this.a);
    this.g.sub(this.a);
    this.h.crossVectors(this.e, this.f);
    this.i.crossVectors(this.f, this.g);
  }

  private static updateData(sizes: DataSizes) {
    sizes.normalsAmount += this.totalIncrease;
    sizes.vertices += this.vertexIncrease;
    sizes.verticesAmount += this.totalIncrease;
  }

  private static processPoints(mesh: TileData, sizes: DataSizes) {
    let counter = 0;
    const position = mesh.positionBuffer!;
    const amount = sizes.verticesAmount;
    for (let i = 0; i < this.vertexIncrease; i++) {
      const vec = this._vecs[i];
      position[amount + counter++] = vec.x;
      position[amount + counter++] = vec.y;
      position[amount + counter++] = vec.z;
    }
  }

  private static setVector(
    indices: Uint16Array | Uint32Array,
    data: Float32Array,
    vector: THREE.Vector3,
    offset: number,
  ) {
    const index = indices[offset] * 3;
    const x = data[index];
    const y = data[index + 1];
    const z = data[index + 2];
    vector.set(x, y, z);
  }

  private static processNormal(
    mesh: TileData,
    sizes: DataSizes,
    normals: Int16Array,
  ) {
    const normal = mesh.normalBuffer!;
    const amount = sizes.normalsAmount;
    for (let i = 0; i < this.totalIncrease; i++) {
      normal[amount + i] = normals[i];
    }
  }

  private static processIndices(mesh: TileData, sizes: DataSizes) {
    const indices = mesh.indexBuffer!;
    for (let i = 0; i < this.indexIncrease; i++) {
      const offset = this._convexIndices[i];
      indices[sizes.indices + i] = sizes.vertices + offset;
    }
    sizes.indices += this.indexIncrease;
  }
}
