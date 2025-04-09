import * as THREE from "three";
import { ObjectClass, CurrentLod } from "../../model/model-types";
import { CRC, MiscHelper } from "../../utils";
import { Meshes, RepresentationClass } from "../../../../Schema";
import { LodClass, AnyTileData, AnyTileBasicData } from "./types";
import {
  VirtualMemoryController,
  VirtualTemplateController,
} from "../virtual-controllers";

export abstract class VirtualMeshManager {
  protected readonly meshes: Meshes;

  private readonly _templateController = new VirtualTemplateController();
  private readonly _meshIds = new Set<number>();
  private readonly _idGenerator = new CRC();
  private readonly _modelCode: number;

  constructor(modelId: string, meshes: Meshes) {
    this.meshes = meshes;
    this._modelCode = this.getModelCode(modelId);
  }

  abstract setupTemplates(): void;

  abstract fetchMeshes(meshId: number, evenVoid: boolean): AnyTileData;

  abstract lineRaycast(
    id: number,
    ray: THREE.Ray,
    frustum: THREE.Frustum,
  ): any[];

  abstract pointRaycast(
    id: number,
    ray: THREE.Ray,
    frustum: THREE.Frustum,
  ): any[];

  abstract raycast(id: number, ray: THREE.Ray, frustum: THREE.Frustum): any[];

  abstract faceRaycast(
    id: number,
    ray: THREE.Ray,
    frustum: THREE.Frustum,
  ): any[];

  abstract getRepresentation(): RepresentationClass;

  abstract getObjectClass(): ObjectClass;

  abstract getLodClass(): LodClass;

  dispose() {
    VirtualMemoryController.delete(this._meshIds);
  }

  protected useMesh(id: number, mesh: AnyTileBasicData, lod: CurrentLod) {
    const code = this.meshCode(id, lod);
    VirtualMemoryController.lockIn(mesh);
    this._templateController.add(code, mesh);
  }

  protected getMesh(id: number, lod: CurrentLod) {
    const code = this.meshCode(id, lod);
    const geometry = VirtualMemoryController.get(code);
    return geometry ?? this._templateController.get(code);
  }

  protected saveMesh(id: number, mesh: AnyTileData, lod: CurrentLod) {
    MiscHelper.forEach(mesh, VirtualMemoryController.updateMeshMemory);
    const code = this.meshCode(id, lod);
    VirtualMemoryController.add(code, mesh);
    this._meshIds.add(code);
  }

  private meshCode(index: number, lod: CurrentLod): number {
    const code = this._modelCode;
    const repr = this.getRepresentation();
    const data = [code, repr, lod, index];
    return this._idGenerator.generate(data);
  }

  private getModelCode(modelId: string) {
    return this._idGenerator.generate([modelId]);
  }
}
