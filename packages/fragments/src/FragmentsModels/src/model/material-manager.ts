import * as THREE from "three";
import { LineMaterialParameters } from "three/examples/jsm/lines/LineMaterial.js";
import {
  ObjectClass,
  MaterialDefinition,
  CurrentLod,
  BIMMesh,
  BIMMaterial,
  MaterialData,
} from "./model-types";
import { CRC } from "../utils";
import { LodMaterial } from "../lod";
import { DataMap } from "../../../Utils";

export class MaterialManager {
  readonly list = new DataMap<number, BIMMaterial>();

  private readonly _modelMaterialMapping = new Map<string, Set<number>>();
  private readonly _definitions = new Map<string, MaterialDefinition[]>();
  private readonly _idGenerator = new CRC();
  private readonly white = 0xffffffff;

  static resetColors(definitions: MaterialDefinition[]) {
    for (const definition of definitions) {
      if (!(definition && definition.color)) continue;
      const { color } = definition;
      if (color.isColor) continue;
      const { r, g, b } = color;
      definition.color = new THREE.Color(r, g, b);
    }
  }

  dispose(modelId: string) {
    this._definitions.delete(modelId);
    const ids = this._modelMaterialMapping.get(modelId);
    if (!ids) return;
    for (const id of ids) {
      const material = this.list.get(id);
      if (!material) continue;
      material.dispose();
      this.list.delete(id);
    }
    this._modelMaterialMapping.delete(modelId);
  }

  get(data: MaterialDefinition, request: any) {
    const { modelId, objectClass, currentLod, templateId } = request;
    if (!(modelId && objectClass !== undefined && currentLod !== undefined)) {
      throw new Error(
        "Fragments: material definition information is missing to create the material.",
      );
    }

    this._idGenerator.fromMaterialData({
      modelId,
      objectClass,
      currentLod,
      templateId,
      ...data,
    });

    const { value: id } = this._idGenerator;

    const material = this.getUniqueMaterial(id, data, request);
    return material;
  }

  addDefinitions(modelID: string, materials: MaterialDefinition[]) {
    const definitions = this._definitions.get(modelID);
    if (definitions) {
      definitions.push(...materials);
    } else {
      this._definitions.set(modelID, materials);
    }
  }

  createHighlights(mesh: BIMMesh, request: any) {
    const {
      tileData: { highlightData, highlightIds },
      modelId,
      material: index,
    } = request;

    const { geometry } = mesh;
    const materials = (mesh.material as THREE.Material[]).slice(0, 2);
    const localMap = new Map<number, number>();

    const materialDefinitions = this._definitions.get(modelId);
    if (!materialDefinitions) return materials;

    for (let i = 0; i < highlightData.position.length; i++) {
      const highlightIndex = highlightIds[i];
      this.processHighlight(
        localMap,
        highlightIndex,
        materialDefinitions,
        index,
        request,
        materials,
      );
      const first = highlightData.position[i];
      const value = highlightData.size[i];
      const isWhite = value === this.white;
      const size = isWhite ? Infinity : value;
      geometry.addGroup(first, size, localMap.get(highlightIds[i])!);
    }

    return materials;
  }

  getFromRequest(request: any) {
    const { material: index, modelId } = request;
    const modelMaterials = this._definitions.get(modelId);
    const definition = modelMaterials?.[index];
    if (!definition) {
      throw new Error(`Fragments: Missing mesh material for index ${index}`);
    }
    const material = this.get(definition, request);
    return material;
  }

  private newLODMaterial(data: MaterialData, request: any) {
    const { data: definition } = data;
    const color = new THREE.Color(definition.color);
    if (request.currentLod === CurrentLod.WIRES) {
      color.multiplyScalar(0.85);
    }

    const parameters: LineMaterialParameters = {
      color,
      ...this.getParameters(definition),
    };

    const material = new LodMaterial(parameters);
    material.userData = { customId: definition.customId };
    return material;
  }

  private getParameters(data: MaterialDefinition) {
    const { opacity, transparent } = data;
    const isTranslucent = opacity < 1;
    const parameters: THREE.MaterialParameters = {
      opacity,
      transparent: transparent || isTranslucent,
      clipIntersection: false,
    };
    return parameters;
  }

  private new(data: MaterialDefinition, request: any) {
    const { objectClass, templateId } = request;
    let material: BIMMaterial;

    if (objectClass === ObjectClass.SHELL) {
      material = new THREE.MeshLambertMaterial({
        color: data.color,
        transparent: data.opacity < 1,
        opacity: data.opacity,
        userData: { customId: data.customId, localId: data.localId },
        depthTest: data.depthTest ?? true,
        depthWrite: data.depthWrite ?? true,
        side: data.renderedFaces === 1 ? THREE.DoubleSide : THREE.FrontSide,
      });
    } else if (objectClass === ObjectClass.LINE) {
      material = this.newLODMaterial(
        { data, instancing: templateId !== undefined },
        request,
      );
    } else {
      throw new Error("Fragments: Unsupported object class");
    }

    return material;
  }

  private addMaterialToModel(modelId: string, id: number) {
    let modelMaterials = this._modelMaterialMapping.get(modelId);
    if (!modelMaterials) {
      modelMaterials = new Set();
      this._modelMaterialMapping.set(modelId, modelMaterials);
    }
    modelMaterials.add(id);
  }

  private processHighlight(
    localMap: Map<number, number>,
    highlightIndex: any,
    materialDefinitions: MaterialDefinition[],
    index: any,
    request: any,
    materials: THREE.Material[],
  ) {
    if (!localMap.has(highlightIndex)) {
      const originalDefinition = materialDefinitions[index];
      const newDefinition = materialDefinitions[highlightIndex];
      const { preserveOriginalMaterial, ...highlightDefinition } = newDefinition;
      const combinedDefinition: MaterialDefinition = { ...originalDefinition };
      if (preserveOriginalMaterial) {
        combinedDefinition.color = highlightDefinition.color;
        if (highlightDefinition.renderedFaces !== undefined) {
          combinedDefinition.renderedFaces = highlightDefinition.renderedFaces;
        }

        if (highlightDefinition.depthTest !== undefined) {
          combinedDefinition.depthTest = highlightDefinition.depthTest;
        }
        if (highlightDefinition.depthWrite !== undefined) {
          combinedDefinition.depthWrite = highlightDefinition.depthWrite;
        }
      } else {
        Object.assign(combinedDefinition, highlightDefinition);
      }
      const material = this.get(combinedDefinition, request);
      materials.push(material);
      localMap.set(highlightIndex, materials.length - 1);
    }
  }

  private getUniqueMaterial(
    id: number,
    data: MaterialDefinition,
    request: any,
  ) {
    const modelId = request.modelId;
    const material = this.list.get(id);
    if (material) return material;
    const newMaterial = this.new(data, request);
    this.list.set(id, newMaterial);
    this.addMaterialToModel(modelId, id);
    return this.list.get(id)!;
  }
}
