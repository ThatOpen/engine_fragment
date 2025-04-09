import * as THREE from "three";
import { ShellUtils } from "./shell-utils";
import { Meshes, Shell } from "../../../../../Schema";

export class ShellPointRaycaster {
  private _meshes: Meshes;
  private _tempVec = new THREE.Vector3();

  constructor(_meshes: Meshes) {
    this._meshes = _meshes;
  }

  pointRaycast(id: number, frustum: THREE.Frustum) {
    const shell = ShellUtils.getShell(this._meshes, id);
    const points: any[] = [];
    this.cast(shell, frustum, points);
    return points;
  }

  private cast(shell: Shell, frustum: THREE.Frustum, points: any[]) {
    const count = shell.pointsLength();
    for (let id = 0; id < count; id++) {
      ShellUtils.point(shell, id, this._tempVec);
      const pointFound = frustum.containsPoint(this._tempVec);
      if (!pointFound) continue;
      const point = this._tempVec.clone();
      points.push({ point });
    }
  }
}
