import * as THREE from "three";
import { VirtualMeshManager } from "./virtual-mesh-manager";
import { LodClass, AnyTileData } from "./types";
import { CurrentLod, ObjectClass } from "../../model/model-types";

import { Shell, RepresentationClass } from "../../../../Schema";
import { ShellTemplateConstructor } from "./shell/shell-template-constructor";
import {
  ShellConstructor,
  ShellFaceRaycaster,
  ShellLineRaycaster,
} from "./shell";
import { ShellUtils } from "./shell/shell-utils";
import { ShellPointRaycaster } from "./shell/shell-point-raycaster";

export class VirtualShellManager extends VirtualMeshManager {
  private readonly _lodClass = LodClass.AABB;
  private readonly _objectClass = ObjectClass.SHELL;
  private readonly _representationClass = RepresentationClass.SHELL;

  private _templates = new ShellTemplateConstructor();
  private _constructor = new ShellConstructor();

  private _faceRaycaster = new ShellFaceRaycaster(this.meshes);
  private _lineRaycaster = new ShellLineRaycaster(this.meshes);
  private _pointRaycaster = new ShellPointRaycaster(this.meshes);

  fetchMeshes(meshId: number, evenVoid: boolean) {
    const mesh = this.getMesh(meshId, CurrentLod.GEOMETRY);
    this.constructMesh(mesh, evenVoid, meshId);
    return mesh;
  }

  newMeshTemplate(shell: Shell) {
    return this._templates.newMeshTemplate(shell);
  }

  lineRaycast(id: number, ray: THREE.Ray, frustum: THREE.Frustum) {
    return this._lineRaycaster.lineRaycast(id, ray, frustum);
  }

  faceRaycast(id: number, ray: THREE.Ray) {
    return this._faceRaycaster.faceRaycast(id, ray);
  }

  raycast(id: number, ray: THREE.Ray) {
    return this._faceRaycaster.faceRaycast(id, ray);
  }

  pointRaycast(id: number, _ray: THREE.Ray, frustum: THREE.Frustum) {
    return this._pointRaycaster.pointRaycast(id, frustum);
  }

  setupTemplates() {
    for (let i = 0, l = this.meshes.shellsLength(); i < l; i++) {
      const poly = ShellUtils.getShell(this.meshes, i);
      this.useMesh(i, this.newMeshTemplate(poly), CurrentLod.GEOMETRY);
    }
  }

  getRepresentation() {
    return this._representationClass;
  }

  getObjectClass() {
    return this._objectClass;
  }

  getLodClass() {
    return this._lodClass;
  }

  private isVoidMesh(mesh: AnyTileData) {
    if (!Array.isArray(mesh)) {
      return mesh.positionBuffer === undefined;
    }
    return mesh[0].positionBuffer === undefined;
  }

  private constructMesh(mesh: AnyTileData, evenVoid: boolean, meshId: number) {
    const isVoid = this.isVoidMesh(mesh);
    if (!isVoid || !evenVoid) return;
    const shell = ShellUtils.getShell(this.meshes, meshId);
    this._constructor.construct(shell, mesh);
    this.saveMesh(meshId, mesh, CurrentLod.GEOMETRY);
  }
}
