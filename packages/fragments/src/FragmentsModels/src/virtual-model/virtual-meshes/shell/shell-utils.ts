import * as THREE from "three";
import { normalizationValue } from "../types";
import {
  ShellProfile,
  Shell,
  FloatVector,
  ShellHole,
  Meshes,
} from "../../../../../Schema";

export class ShellUtils {
  private static _faceThreshold = Math.cos(Math.PI / 8);
  private static _shell = new Shell();
  private static _normalBuffer = new Int16Array();
  private static _tempNormal = new THREE.Vector3();
  private static _tempPoint = new FloatVector();
  private static _profile = new ShellProfile();
  private static _hole = new ShellHole();
  private static _pointsByProfile = new Map<number, number[]>();
  private static _v1 = new THREE.Vector3();
  private static _v2 = new THREE.Vector3();
  private static _v3 = new THREE.Vector3();

  static getShell(meshes: Meshes, id: number) {
    return meshes.shells(id, this._shell) as Shell;
  }

  static point(shell: Shell, id: number, result: THREE.Vector3) {
    if (shell instanceof Shell) {
      shell.points(id, this._tempPoint);
    }
    const x = this._tempPoint.x();
    const y = this._tempPoint.y();
    const z = this._tempPoint.z();
    result.set(x, y, z);
  }

  static getNormalsOfShellProfile(shell: Shell, result: THREE.Vector3[]) {
    const count = shell.profilesLength();
    for (let id = 0; id < count; id++) {
      const profile = shell.profiles(id) as ShellProfile;
      const normals = this.fetchNormalsOfProfile(shell, profile);
      result.push(normals);
    }
    return result;
  }

  static computeNormalsAvg(
    indices: Uint16Array,
    faceId: number,
    faceNormals: THREE.Vector3[],
    pointsFaces: Map<number, number[]>,
  ) {
    this.setupNormalBuffer(indices);
    const profileNormal = faceNormals[faceId];
    for (let id = 0; id < indices.length; id++) {
      const current = indices[id];
      const pointsByProfile = pointsFaces.get(current);
      this.aggregateNormals(pointsByProfile, faceNormals, profileNormal);
      this.computeAvgNormal(id);
    }
    return this._normalBuffer;
  }

  static getBuffer(shell: Shell) {
    const data = shell.bb!;
    const distance = 8;
    const shellOffset = data.__offset(shell.bb_pos, distance);
    const length = shell.pointsLength() * 3;
    const offset = data.__vector(shell.bb_pos + shellOffset);
    const rawBytes = data.bytes();
    const rawBuffer = rawBytes.buffer;
    return new Float32Array(rawBuffer, offset, length);
  }

  static getPointsShell(shell: Shell) {
    this._pointsByProfile.clear();
    this.fetchAllPointsByProfile(shell);
    ShellUtils.fetchAllPointsByHole(shell);
    return this._pointsByProfile;
  }

  private static addNormals(
    pointsByProfile: number[],
    faceNormals: THREE.Vector3[],
    profileNormal: THREE.Vector3,
  ) {
    for (const id of pointsByProfile) {
      const normal = faceNormals[id];
      const dot = profileNormal.dot(normal);
      const isValid = dot > this._faceThreshold;
      if (!isValid) continue;
      this._tempNormal.add(normal);
    }
  }

  private static setupNormalBuffer(indices: Uint16Array) {
    const neededSize = indices.length * 3;
    const currentSize = this._normalBuffer.length;
    const insufficientSize = currentSize < neededSize;
    if (insufficientSize) {
      this._normalBuffer = new Int16Array(neededSize);
    }
  }

  private static fetchNormalsOfProfile(shell: Shell, profile: ShellProfile) {
    const length = profile.indicesLength();
    const tooSmall = this.isTooSmall(shell, length);
    if (tooSmall) {
      return new THREE.Vector3(1, 0, 0);
    }
    return this.computeProfileNormal(length, profile, shell);
  }

  private static fetchAllPointsByHole(shell: Shell) {
    const holesCount = shell.holesLength();
    for (let holeId = 0; holeId < holesCount; holeId++) {
      const id = shell.holes(holeId)!.profileId();
      shell.holes(holeId, this._hole);
      const indicesCount = this._hole.indicesLength();
      for (let i = 0; i < indicesCount; i++) {
        const index = this._hole.indices(i)!;
        ShellUtils.savePointByProfile(index, id);
      }
    }
  }

  private static computeProfileNormal(
    length: number,
    profile: ShellProfile,
    shell: Shell,
  ) {
    this._v3.set(0, 0, 0);
    for (let id = 0; id < length; id++) {
      this.fetchPointsForNormal(id, length, profile, shell);
      this.computeProfilePointNormal();
    }
    const result = this._v3.clone();
    result.normalize();
    return result;
  }

  private static computeProfilePointNormal() {
    const dx = this._v1.x - this._v2.x;
    const dy = this._v1.y - this._v2.y;
    const dz = this._v1.z - this._v2.z;
    const sumX = this._v1.x + this._v2.x;
    const sumY = this._v1.y + this._v2.y;
    const sumZ = this._v1.z + this._v2.z;
    this._v3.x += dy * sumZ;
    this._v3.y += dz * sumX;
    this._v3.z += dx * sumY;
  }

  private static aggregateNormals(
    pointsByProfile: number[] | undefined,
    faceNormals: THREE.Vector3[],
    profileNormal: THREE.Vector3,
  ) {
    this._tempNormal.set(0, 0, 0);

    const isZero = !pointsByProfile || !pointsByProfile.length;
    if (isZero) {
      this._tempNormal.set(1, 0, 0);
      return;
    }

    const isJustOne = pointsByProfile.length === 1;
    if (isJustOne) {
      const first = pointsByProfile[0];
      this._tempNormal = faceNormals[first].clone();
      return;
    }

    ShellUtils.addNormals(pointsByProfile, faceNormals, profileNormal);
  }

  private static fetchPointsForNormal(
    id: number,
    length: number,
    profile: ShellProfile,
    shell: Shell,
  ) {
    const next = id + 1;
    const id2 = next % length;

    const profile1 = profile.indices(id)!;
    const profile2 = profile.indices(id2)!;
    this.point(shell, profile1, this._v1);
    this.point(shell, profile2, this._v2);
  }

  private static savePointByProfile(index: number, id: number) {
    if (!this._pointsByProfile.has(index)) {
      this._pointsByProfile.set(index, []);
    }
    this._pointsByProfile.get(index)!.push(id);
  }

  private static isTooSmall(shell: Shell, length: number) {
    const notEnoughPoints = shell.pointsLength() <= 2;
    const notEnoughIndices = length <= 2;
    return notEnoughPoints || notEnoughIndices;
  }

  private static fetchAllPointsByProfile(shell: Shell) {
    const count = shell.profilesLength();
    for (let id = 0; id < count; id++) {
      shell.profiles(id, this._profile);
      const indicesCount = this._profile.indicesLength();
      for (let i = 0; i < indicesCount; i++) {
        const index = this._profile.indices(i)!;
        ShellUtils.savePointByProfile(index, id);
      }
    }
  }

  private static computeAvgNormal(id: number) {
    this._tempNormal.normalize();
    this._tempNormal.multiplyScalar(normalizationValue);
    this._tempNormal.toArray(this._normalBuffer, id * 3);
  }
}
