import * as THREE from "three";
import {
  BigShellProfile,
  Meshes,
  Shell,
  ShellProfile,
  ShellType,
} from "../../../../../Schema";

import { ShellUtils } from "./shell-utils";

export class ShellLineRaycaster {
  private readonly _meshes: Meshes;
  private _minAngle = Math.PI / 32;
  private _shellProfile = new ShellProfile();
  private _bigShellProfile = new BigShellProfile();
  private _tempV1 = new THREE.Vector3();
  private _tempV2 = new THREE.Vector3();
  private _tempPoint = new THREE.Vector3();
  private _normals: THREE.Vector3[] = [];
  private _pointsByProfile = new Map<number, number[]>();
  private _shell = new Shell();
  private _result: any[] = [];

  constructor(meshes: Meshes) {
    this._meshes = meshes;
  }

  lineRaycast(id: number, ray: THREE.Ray, frustum: THREE.Frustum) {
    this.resetData(id);
    this.lineRaycastItems(ray, frustum);
    return this._result;
  }

  private lineRaycastItems(ray: THREE.Ray, frustum: THREE.Frustum) {
    const profilesCount = ShellUtils.getProfilesLength(this._shell);
    for (let id = 0; id < profilesCount; id++) {
      const profile = this.getTempProfile(this._shell);
      ShellUtils.getProfile(this._shell, id, profile);
      this.lineRaycastProfile(ray, frustum, id);
    }
  }

  private resetData(id: number) {
    this._shell = ShellUtils.getShell(this._meshes, id);
    this._normals.length = 0;
    ShellUtils.getNormalsOfShellProfile(this._shell, this._normals);
    this._pointsByProfile = ShellUtils.getPointsShell(this._shell);
    this._result = [];
  }

  private lineRaycastProfile(
    ray: THREE.Ray,
    frustum: THREE.Frustum,
    id: number,
  ) {
    const profile = this.getTempProfile(this._shell);
    const indicesCount = profile.indicesLength();
    for (let i = 0; i < indicesCount; i++) {
      const i1 = profile.indices(i)!;
      const i2 = this.getSecondIndex(i, indicesCount);
      const success = this.cast(i1, i2, ray, frustum, id);
      if (success) {
        this.saveResult(id);
      }
    }
  }

  private isInvalidAngle(firstIndex: number, secondIndex: number, id: number) {
    const profile = this.getProfile(firstIndex, secondIndex, id);
    if (!profile.length) {
      return true;
    }
    const normal1 = this._normals[profile[0]];
    const normal2 = this._normals[id];
    const angle = normal1.dot(normal2);
    return angle > Math.cos(this._minAngle);
  }

  private getProfile(firstIndex: number, secondIndex: number, id: number) {
    const profile1 = this._pointsByProfile.get(firstIndex)!;
    const profile2 = this._pointsByProfile.get(secondIndex)!;
    const result: number[] = [];
    for (const index of profile1) {
      if (profile2.indexOf(index) === -1) continue;
      if (index === id) continue;
      result.push(index);
    }
    return result;
  }

  private cast(
    i1: number,
    i2: number,
    ray: THREE.Ray,
    frustum: THREE.Frustum,
    id: number,
  ) {
    ShellUtils.point(this._shell, i1, this._tempV1);
    ShellUtils.point(this._shell, i2, this._tempV2);

    this.raycastSegment(ray);

    const pointFound = frustum.containsPoint(this._tempPoint);
    if (!pointFound) {
      return false;
    }

    const invalidAngle = this.isInvalidAngle(i1, i2, id);
    if (invalidAngle) {
      return false;
    }

    return true;
  }

  private saveResult(id: number) {
    const snappedEdgeP1 = this._tempV1.clone();
    const snappedEdgeP2 = this._tempV2.clone();
    const normal = this._normals[id];
    const point = this._tempPoint.clone();
    this._result.push({ point, normal, snappedEdgeP1, snappedEdgeP2 });
  }

  private getSecondIndex(id: number, count: number) {
    const isLast = id === count - 1;
    const profile = this.getTempProfile(this._shell);
    if (isLast) {
      return profile.indices(0)!;
    }
    return profile.indices(id + 1)!;
  }

  private raycastSegment(ray: THREE.Ray) {
    ray.distanceSqToSegment(
      this._tempV1,
      this._tempV2,
      undefined,
      this._tempPoint,
    );
  }

  private getTempProfile(shell: Shell) {
    if (shell.type() === ShellType.BIG) {
      return this._bigShellProfile;
    }
    return this._shellProfile;
  }
}
