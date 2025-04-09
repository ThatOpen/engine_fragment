import * as THREE from "three";
import {
  Shell,
  ShellHole,
  ShellProfile,
  FloatVector,
} from "../../../../../Schema";
import { AnyTileData, TileData } from "../types";
import { DataSizes, PolygonSize, ShellHoleData } from "./types";
import { ShellUtils } from "./shell-utils";
import { limitOf2Bytes } from "../../../model/model-types";
import { ShellFaceX } from "./shell-face-x";
import { ShellFace4 } from "./shell-face-4";
import { ShellFace3 } from "./shell-face-3";

export class ShellConstructor {
  private point = new FloatVector();
  private shellHole = new ShellHole();
  private interiorProfiles = new Map<number, ShellHoleData>();
  private normalsAvgInterior = new Int16Array();
  private _pointsPerProfile = new Map<number, number[]>();
  private _shellProfile = new ShellProfile();
  private _normalsAvg = new Int16Array();
  private _normals: THREE.Vector3[] = [];
  private _indices = 0;
  private _sizes: DataSizes = {
    vertices: 0,
    indices: 0,
    verticesAmount: 0,
    normalsAmount: 0,
    normals: 0,
  };

  private _tileData!: TileData;

  construct(shell: Shell, meshData: TileData | TileData[]) {
    this.resetConstructData(meshData);
    this.getPointsPerWire(shell);
    const data = ShellUtils.getBuffer(shell);
    this.newShellInteriorProfiles(shell);
    this.constructShell(shell, data, meshData);
    this._tileData = undefined as any;
  }

  private getIntProfileNormalsAvg(id: number) {
    const indices = this.shellHole.indicesArray()!;
    this.normalsAvgInterior = ShellUtils.computeNormalsAvg(
      indices,
      id,
      this._normals,
      this._pointsPerProfile,
    );
  }

  private saveInteriorProfile() {
    const id = this.shellHole.profileId();
    if (this.interiorProfiles.has(id)) {
      this.saveExistingInteriorProfile(id);
      return id;
    }
    const data = this.getNewIntProfileData();
    this.interiorProfiles.set(id, data);
    return id;
  }

  private computeNormalsAvg(shell: Shell, indices: Uint16Array, id: number) {
    const isShell = this.isShell(shell);
    if (!isShell) return;
    const n = this._normals;
    const ppp = this._pointsPerProfile;
    this._normalsAvg = ShellUtils.computeNormalsAvg(indices, id, n, ppp);
  }

  private isShell(shell: Shell) {
    return shell instanceof Shell;
  }

  private getPointsPerWire(shell: Shell) {
    const isShell = this.isShell(shell);
    if (!isShell) return;
    ShellUtils.getNormalsOfShellProfile(shell, this._normals);
    this._pointsPerProfile = ShellUtils.getPointsShell(shell);
  }

  private getIndices(shell: Shell, id: number) {
    shell.profiles(id, this._shellProfile);
    return this._shellProfile.indicesArray()!;
  }

  private resetConstructData(meshData: AnyTileData) {
    this._indices = 0;
    this._tileData = undefined as any;
    this.nextBuffer(meshData);
    this._normals.length = 0;
  }

  private initializeIndices() {
    const size = this._tileData.indexCount!;
    this._tileData.indexBuffer = new Uint16Array(size);
  }

  private constructFace4(indices: Uint16Array, data: Float32Array, id: number) {
    ShellFace4.create(
      indices,
      data,
      this._normalsAvg,
      id,
      this._tileData,
      this._sizes,
    );
  }

  private initializeSizes() {
    this._sizes.vertices = 0;
    this._sizes.indices = 0;
    this._sizes.verticesAmount = 0;
    this._sizes.normalsAmount = 0;
    this._sizes.normals = 0;
  }

  private getInteriorProfileBuffer(shell: Shell, intProfile: ShellHoleData) {
    const count = this.shellHole.indicesLength();
    const isShell = this.isShell(shell);
    if (!isShell) return;
    for (let id = 0; id < count; id++) {
      this.getIntProfilePoints(id, shell, intProfile);
      this.getIntProfileNormals(intProfile, id);
    }
  }

  private constructProfile(
    id: number,
    indices: Uint16Array,
    data: Float32Array,
  ) {
    const indexAmount = this._shellProfile.indicesLength();
    const notAHole = !this.interiorProfiles.has(id);
    const isFace3 = indexAmount === PolygonSize.three;
    if (isFace3 && notAHole) {
      this.constructFace3(indices, data);
      return;
    }
    const isFace4 = indexAmount === PolygonSize.four;
    if (isFace4 && notAHole) {
      this.constructFace4(indices, data, id);
      return;
    }
    this.constructFaceX(indices, data, id);
  }

  private getIntProfileNormals(hole: ShellHoleData, id: number) {
    const index = id * 3;
    const nx = this.normalsAvgInterior[index];
    const ny = this.normalsAvgInterior[index + 1];
    const nz = this.normalsAvgInterior[index + 2];
    hole.normals!.push(nx, ny, nz);
  }

  private saveExistingInteriorProfile(id: number) {
    const found = this.interiorProfiles.get(id)!;
    const pointCount = found.points.length;
    const indexCount = pointCount / 3;
    found.indices.push(indexCount);
    this.interiorProfiles.set(id, found);
  }

  private getNewIntProfileData() {
    const indices = [0];
    const points = [] as number[];
    const normals = [] as number[];
    return { indices, points, normals };
  }

  private constructFace3(indices: Uint16Array, data: Float32Array) {
    ShellFace3.create(
      indices,
      data,
      this._normalsAvg,
      this._tileData,
      this._sizes,
    );
  }

  private getIntProfilePoints(i: number, shell: Shell, hole: ShellHoleData) {
    const shellIndex = this.shellHole.indices(i) as number;
    shell.points(shellIndex, this.point);
    const px = this.point.x();
    const py = this.point.y();
    const pz = this.point.z();
    hole.points.push(px, py, pz);
  }

  private manageMemory(meshData: TileData | TileData[]) {
    const indexAmount = this._shellProfile.indicesLength();
    const vertexAmount = this._sizes.verticesAmount / 3;
    const memoryConsumed = vertexAmount + indexAmount;
    const memoryOverflow = memoryConsumed > limitOf2Bytes;
    if (memoryOverflow) {
      this.nextBuffer(meshData);
    }
  }

  private nextBuffer = (bufferGeometries: TileData | TileData[]) => {
    this.setTileData(bufferGeometries);
    this.initializeIndices();
    this.initializePositions();
    this.initializeNormals();
    this.initializeSizes();
    this._indices++;
  };

  private newShellInteriorProfiles(shell: Shell) {
    this.interiorProfiles.clear();
    const count = shell.holesLength();
    for (let i = 0; i < count; i++) {
      shell.holes(i, this.shellHole);
      const id = this.saveInteriorProfile();
      const intProfile = this.interiorProfiles.get(id)!;
      this.getIntProfileNormalsAvg(id);
      this.getInteriorProfileBuffer(shell, intProfile);
    }
    return this.interiorProfiles;
  }

  private initializePositions() {
    const size = this._tileData.positionCount!;
    this._tileData.positionBuffer = new Float32Array(size);
  }

  private initializeNormals() {
    const size = this._tileData.normalCount!;
    this._tileData.normalBuffer = new Int16Array(size);
  }

  private setTileData(bufferGeometries: AnyTileData) {
    if (Array.isArray(bufferGeometries)) {
      this._tileData = bufferGeometries[this._indices];
      return;
    }
    this._tileData = bufferGeometries;
  }

  private constructShell(
    shell: Shell,
    data: Float32Array,
    meshData: AnyTileData,
  ) {
    const count = shell.profilesLength();
    for (let id = 0; id < count; id++) {
      const indices = this.getIndices(shell, id);
      this.computeNormalsAvg(shell, indices, id);
      this.constructProfile(id, indices, data);
      this.manageMemory(meshData);
    }
  }

  private constructFaceX(indices: Uint16Array, data: Float32Array, id: number) {
    ShellFaceX.create(
      indices,
      data,
      this._normalsAvg,
      id,
      this._tileData,
      this.interiorProfiles,
      this._sizes,
    );
  }
}
