import * as THREE from "three";
import { LineMaterialParameters } from "three/examples/jsm/lines/LineMaterial.js";
import {
  ObjectClass,
  MaterialDefinition,
  CurrentLod,
  BIMMesh,
  BIMMaterial,
  MaterialData,
  ModelUid,
} from "./model-types";
import { CRC } from "../utils";
import { LodMaterial } from "../lod";
import { DataMap } from "../../../Utils";
import type { Cloned } from "../multithreading/cloned";

export class MaterialManager {
  readonly list = new DataMap<number, BIMMaterial>();

  private readonly _modelMaterialMapping = new Map<ModelUid, Set<number>>();
  private readonly _definitions = new Map<ModelUid, MaterialDefinition[]>();
  private readonly _idGenerator = new CRC();
  private readonly white = 0xffffffff;

  // Definitions reach the main thread as copies without their prototypes, so
  // their color is no longer a THREE.Color, though it keeps `isColor`. Its
  // components are already linear: the worker converted them from sRGB.
  static restoreColor(
    definition: Cloned<MaterialDefinition>,
  ): MaterialDefinition {
    // Items without a highlight have no definition, and a highlight that only
    // changes the opacity has no color: there is nothing to restore.
    if (!definition?.color) return definition as MaterialDefinition;
    const { r, g, b } = definition.color;
    return { ...definition, color: new THREE.Color(r, g, b) };
  }

  dispose(uid: ModelUid) {
    this._definitions.delete(uid);
    const ids = this._modelMaterialMapping.get(uid);
    if (!ids) return;
    for (const id of ids) {
      const material = this.list.get(id);
      if (!material) continue;
      material.dispose();
      this.list.delete(id);
    }
    this._modelMaterialMapping.delete(uid);
  }

  get(data: MaterialDefinition, request: any) {
    const { uid, objectClass, currentLod, templateId } = request;
    if (
      uid === undefined ||
      objectClass === undefined ||
      currentLod === undefined
    ) {
      throw new Error(
        "Fragments: material definition information is missing to create the material."
      );
    }

    this._idGenerator.fromMaterialData({
      uid,
      objectClass,
      currentLod,
      templateId,
      ...data,
    });

    const { value: id } = this._idGenerator;

    const material = this.getUniqueMaterial(id, data, request);
    return material;
  }

  /**
   * Appends material definitions for a model. `firstId`, when given, is the
   * id the worker assigned to `materials[0]`; definitions at or above it are
   * ones the worker has reclaimed (see #299) and are replaced.
   */
  addDefinitions(
    uid: ModelUid,
    materials: MaterialDefinition[],
    firstId?: number,
  ) {
    const definitions = this._definitions.get(uid);
    if (definitions) {
      if (firstId !== undefined && firstId < definitions.length) {
        definitions.length = firstId;
      }
      definitions.push(...materials);
    } else {
      this._definitions.set(uid, materials);
    }
  }

  createHighlights(mesh: BIMMesh, request: any) {
    const {
      tileData: { highlightData, highlightIds },
      uid,
      material: index,
    } = request;

    const { geometry } = mesh;
    const materials = (mesh.material as THREE.Material[]).slice(0, 2);
    const localMap = new Map<number, number>();

    const materialDefinitions = this._definitions.get(uid);
    if (!materialDefinitions) return materials;

    for (let i = 0; i < highlightData.position.length; i++) {
      const highlightIndex = highlightIds[i];
      this.processHighlight(
        localMap,
        highlightIndex,
        materialDefinitions,
        index,
        request,
        materials
      );
      const first = highlightData.position[i];
      const value = highlightData.size[i];
      const isWhite = value === this.white;
      const size = isWhite ? Infinity : value;
      geometry.addGroup(first, size, localMap.get(highlightIds[i])!);
    }

    return materials;
  }

  getHighlightProps(
    highlightIndex: number,
    originalIndex: number,
    uid: ModelUid,
  ) {
    const materialDefinitions = this._definitions.get(uid);
    if (!materialDefinitions) return undefined;
    const originalDefinition = materialDefinitions[originalIndex];
    const newDefinition = materialDefinitions[highlightIndex];
    if (!newDefinition || !originalDefinition) return undefined;
    const {
      preserveOriginalMaterial,
      _explicitProps,
      ...highlightDefinition
    } = newDefinition;
    const combined: MaterialDefinition = { ...originalDefinition };
    if (preserveOriginalMaterial) {
      for (const prop of _explicitProps ?? []) {
        if ((highlightDefinition as any)[prop] !== undefined) {
          (combined as any)[prop] = (highlightDefinition as any)[prop];
        }
      }
    } else {
      Object.assign(combined, highlightDefinition);
    }
    return combined;
  }

  getFromRequest(request: any) {
    const { material: index, uid } = request;
    const modelMaterials = this._definitions.get(uid);
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
        polygonOffset:
          (data.polygonOffsetFactor ?? 0) !== 0 ||
          (data.polygonOffsetUnits ?? 0) !== 0,
        polygonOffsetFactor: data.polygonOffsetFactor ?? 0,
        polygonOffsetUnits: data.polygonOffsetUnits ?? 0,
        side: data.renderedFaces === 1 ? THREE.DoubleSide : THREE.FrontSide,
      });
    } else if (objectClass === ObjectClass.LINE) {
      material = this.newLODMaterial(
        { data, instancing: templateId !== undefined },
        request
      );
    } else {
      throw new Error("Fragments: Unsupported object class");
    }

    return material;
  }

  private addMaterialToModel(uid: ModelUid, id: number) {
    let modelMaterials = this._modelMaterialMapping.get(uid);
    if (!modelMaterials) {
      modelMaterials = new Set();
      this._modelMaterialMapping.set(uid, modelMaterials);
    }
    modelMaterials.add(id);
  }

  private processHighlight(
    localMap: Map<number, number>,
    highlightIndex: any,
    materialDefinitions: MaterialDefinition[],
    index: any,
    request: any,
    materials: THREE.Material[]
  ) {
    if (!localMap.has(highlightIndex)) {
      const originalDefinition = materialDefinitions[index];
      const newDefinition = materialDefinitions[highlightIndex];
      const { preserveOriginalMaterial, _explicitProps, ...highlightDefinition } = newDefinition;
      const combinedDefinition: MaterialDefinition = { ...originalDefinition };
      if (preserveOriginalMaterial) {
        for (const prop of _explicitProps ?? []) {
          if ((highlightDefinition as any)[prop] !== undefined) {
            (combinedDefinition as any)[prop] = (highlightDefinition as any)[prop];
          }
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
    request: any
  ) {
    const uid = request.uid;
    const material = this.list.get(id);
    if (material) return material;
    const newMaterial = this.new(data, request);
    this.list.set(id, newMaterial);
    this.addMaterialToModel(uid, id);
    return this.list.get(id)!;
  }
}
