import * as THREE from "three";
import { TileData, TileBasicData, LodClass } from "./types";
import { ObjectClass, CurrentLod } from "../../model/model-types";

import { RepresentationClass } from "../../../../Schema";

import { VirtualMeshManager } from "./virtual-mesh-manager";

import {
  VceConstructor,
  VceLineRaycaster,
  VceLodConstructor,
  VcePointRaycaster,
  VceRaycaster,
  VceUtils,
} from "./circle-extrusion";

export class VirtualCircleExtrusionManager extends VirtualMeshManager {
  private _vceConstructor = new VceConstructor();
  private _lodConstructor = new VceLodConstructor();
  private _vceRaycaster = new VceRaycaster(this.meshes);
  private _vceLineRaycaster = new VceLineRaycaster(this.meshes);
  private _vcePointRaycaster = new VcePointRaycaster(this.meshes);
  private _representationClass = RepresentationClass.CIRCLE_EXTRUSION;
  private _objectClass = ObjectClass.LINE;
  private lodClass = LodClass.CUSTOM;

  setupTemplates() {
    const count = this.meshes.circleExtrusionsLength();
    for (let id = 0; id < count; id++) {
      this.newCircleExtrusionTemplate(id);
    }
  }

  fetchLod(meshId: number, evenVoid: boolean) {
    const lod = this.getMesh(meshId, CurrentLod.WIRES) as TileData;
    this.generateLodIfNeeded(meshId, evenVoid, lod);
    return lod;
  }

  fetchMeshes(meshId: number, evenVoid: boolean) {
    const meshes = this.getMesh(meshId, CurrentLod.GEOMETRY) as TileData[];
    this.generateMeshesIfNeeded(meshId, evenVoid, meshes);
    return meshes;
  }

  raycast(id: number, ray: THREE.Ray) {
    return this._vceRaycaster.raycast(id, ray);
  }

  faceRaycast() {
    // Rebars don't have face snap
    return [];
  }

  pointRaycast(id: number, ray: THREE.Ray) {
    return this._vcePointRaycaster.pointRaycast(id, ray);
  }

  lineRaycast(id: number, ray: THREE.Ray) {
    return this._vceLineRaycaster.lineRaycast(id, ray);
  }

  getObjectClass() {
    return this._objectClass;
  }

  getRepresentation() {
    return this._representationClass;
  }

  getLodClass() {
    return this.lodClass;
  }

  private newMeshes(meshId: number, meshes: TileData[]) {
    this.meshes.circleExtrusions(meshId, VceUtils.temp.circleExtrusion);
    const circleExtrusion = VceUtils.temp.circleExtrusion;
    this._vceConstructor.construct(circleExtrusion, meshes);
    this.saveMesh(meshId, meshes, CurrentLod.GEOMETRY);
  }

  private generateMeshesIfNeeded(
    meshId: number,
    createIfVoid: boolean,
    meshes: TileData[],
  ) {
    if (meshes.length === 0) {
      return;
    }
    const meshesExist = Boolean(meshes.length);
    const isVoid = !meshes[0].positionBuffer;
    const shouldCreate = createIfVoid && isVoid && meshesExist;
    if (shouldCreate) {
      this.newMeshes(meshId, meshes);
    }
  }

  private newCircleExtrusionTemplate(id: number) {
    const meshTemplate = [] as TileBasicData[];
    this.meshes.circleExtrusions(id, VceUtils.temp.circleExtrusion);
    const circleExtrusion = VceUtils.temp.circleExtrusion;
    const count = circleExtrusion.axesLength();
    for (let i = 0; i < count; i++) {
      this._vceConstructor.newTemplate(circleExtrusion, i, meshTemplate);
    }
    const lodTemplate = this._lodConstructor.newTemplate();
    this.useMesh(id, meshTemplate, CurrentLod.GEOMETRY);
    this.useMesh(id, lodTemplate, CurrentLod.WIRES);
  }

  private generateLodIfNeeded(
    meshId: number,
    evenVoid: boolean,
    mesh: TileData,
  ) {
    const isVoid = !mesh.positionBuffer;
    if (!isVoid || !evenVoid) return;
    this.meshes.circleExtrusions(meshId, VceUtils.temp.circleExtrusion);
    this._lodConstructor.construct(VceUtils.temp.circleExtrusion, mesh);
    this.saveMesh(meshId, mesh, CurrentLod.WIRES);
  }
}
