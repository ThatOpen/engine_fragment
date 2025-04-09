import * as THREE from "three";
import { TileData } from "../types";
import { DataSizes, ShellHoleData } from "./types";
import { earcut } from "../../../utils/geometry/earcut";
import { DataBuffer } from "../../../model/model-types";

export class ShellFaceX {
  private static _tempVec = new THREE.Vector3();

  static create(
    indices: Uint16Array,
    data: Float32Array,
    normals: Int16Array,
    current: number,
    mesh: TileData,
    holes: Map<number, ShellHoleData>,
    sizes: DataSizes,
  ) {
    const size = indices.length;
    const amount = sizes.verticesAmount;
    ShellFaceX.processBuffers(size, indices, mesh, sizes, data, normals);
    const position = mesh.positionBuffer!;
    const pointsDiff = sizes.verticesAmount - amount;
    const normalDims = pointsDiff / 3;
    this.processNormals(position, this._tempVec, normalDims, amount);
    this.triangulate(holes, current, size, mesh, sizes, amount);
  }

  private static getVertices(mesh: TileData, amount: number, sizes: DataSizes) {
    const points = mesh.positionBuffer!;
    const buffer = points.buffer;
    const position = amount * 4;
    const size = sizes.verticesAmount - amount;
    return new Float32Array(buffer, position, size);
  }

  private static getEvent(mesh: TileData, sizes: DataSizes, amount: number) {
    return (first: number, second: number, third: number) => {
      const position = mesh.indexBuffer!;
      position[sizes.indices++] = first + amount / 3;
      position[sizes.indices++] = second + amount / 3;
      position[sizes.indices++] = third + amount / 3;
    };
  }

  private static processBuffers(
    size: number,
    indices: Uint16Array,
    mesh: TileData,
    sizes: DataSizes,
    data: Float32Array,
    normals: Int16Array,
  ) {
    for (let id = 0; id < size; id++) {
      this.processPositionBuffer(mesh, indices, id, sizes, data);
      this.processNormalbuffer(mesh, normals, id, sizes);
      this.updateBufferData(sizes);
    }
  }

  private static getHoles(
    shellHoles: Map<number, ShellHoleData>,
    index: number,
    size: number,
    mesh: TileData,
    sizes: DataSizes,
  ) {
    if (!shellHoles) {
      return undefined;
    }
    const isHole = shellHoles.has(index);
    if (isHole) {
      const currentHole = shellHoles.get(index)!;
      const holesData: number[] = [];
      for (const index of currentHole.indices) {
        holesData.push(index + size);
      }
      this.setHolesBuffers(mesh, currentHole, sizes);
      return holesData;
    }
    return undefined;
  }

  private static setHolesBuffers(
    mesh: TileData,
    shellHole: ShellHoleData,
    sizes: DataSizes,
  ) {
    const position = mesh.positionBuffer!;
    const normal = mesh.normalBuffer!;
    position.set(shellHole.points, sizes.verticesAmount);
    const holePoints = shellHole.points.length;
    sizes.verticesAmount += holePoints;
    sizes.vertices += holePoints / 3;
    normal.set(shellHole.normals!, sizes.normalsAmount);
    sizes.normalsAmount += holePoints;
  }

  private static updateBufferData(sizes: DataSizes) {
    sizes.vertices += 1;
    sizes.verticesAmount += 3;
    sizes.normalsAmount += 3;
  }

  private static processPositionBuffer(
    mesh: TileData,
    indices: Uint16Array,
    id: number,
    sizes: DataSizes,
    data: Float32Array,
  ) {
    const position = mesh.positionBuffer!;
    for (let j = 0; j < 3; j++) {
      const current = indices[id] * 3;
      position[sizes.verticesAmount + j] = data[current + j];
    }
  }

  private static triangulate(
    holes: Map<number, ShellHoleData>,
    current: number,
    size: number,
    mesh: TileData,
    sizes: DataSizes,
    amount: number,
  ) {
    const tri = 3;
    const holesData = this.getHoles(holes, current, size, mesh, sizes);
    const vertices = ShellFaceX.getVertices(mesh, amount, sizes);
    const dims = this.getEarcutDimensions(this._tempVec);
    const onCreateGeometry = this.getEvent(mesh, sizes, amount);
    const firstDim = dims[0];
    const secondDim = dims[1];
    earcut(vertices, holesData!, tri, firstDim, secondDim, onCreateGeometry);
  }

  private static getEarcutDimensions(normal: THREE.Vector3) {
    // Project points in 2D for earcut algorithm, which only works in 2D

    const absX = Math.abs(normal.x);
    const absY = Math.abs(normal.y);
    const absZ = Math.abs(normal.z);

    const xDim = 0;
    const yDim = 1;
    const zDim = 2;

    const isMostlyHorizontal = absZ > absX && absZ > absY;
    if (isMostlyHorizontal) {
      const lookingUp = normal.z > 0;
      if (lookingUp) {
        return [xDim, yDim];
      }
      return [yDim, xDim];
    }

    const isMostlyLookingToY = absY > absX && absY > absZ;
    if (isMostlyLookingToY) {
      const isLookingYPositive = normal.y > 0;
      if (isLookingYPositive) {
        return [zDim, xDim];
      }
      return [xDim, zDim];
    }

    // At this point, we know that the normal is mostly looking to the X axis

    const isLookingXPositive = normal.x > 0;
    if (isLookingXPositive) {
      return [yDim, zDim];
    }

    return [zDim, yDim];
  }

  private static processNormals(
    input: DataBuffer,
    result: THREE.Vector3,
    size: number,
    position = 0,
  ) {
    result.set(0, 0, 0);
    for (let i = 0; i < size; i++) {
      const counter = (i + 1) % size;
      const i1 = position + i * 3;
      const i2 = position + counter * 3;
      const x1 = input[i1 + 0];
      const x2 = input[i2 + 0];
      const y1 = input[i1 + 1];
      const y2 = input[i2 + 1];
      const z1 = input[i1 + 2];
      const z2 = input[i2 + 2];
      result.x += (y1 - y2) * (z1 + z2);
      result.y += (z1 - z2) * (x1 + x2);
      result.z += (x1 - x2) * (y1 + y2);
    }
    result.normalize();
  }

  private static processNormalbuffer(
    mesh: TileData,
    normals: Int16Array,
    id: number,
    sizes: DataSizes,
  ) {
    const normal = mesh.normalBuffer!;
    const current = id * 3;
    const nx = normals[current];
    const ny = normals[current + 1];
    const nz = normals[current + 2];
    normal.set([nx, ny, nz], sizes.normalsAmount);
  }
}
