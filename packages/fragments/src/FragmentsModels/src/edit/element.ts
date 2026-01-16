import * as THREE from "three";
import {
  CreateSampleRequest,
  EditRequest,
  EditRequestType,
  ElementData,
  RawGlobalTransformData,
  RawMaterial,
  RawRepresentation,
  RawSample,
  RawTransformData,
} from "../../../Utils";
import { GeomsFbUtils } from "../../../Utils/shells";
import { FragmentsModel, MeshData } from "../model";
import * as TFB from "../../../Schema";

export type ElementConfig = {
  data: {
    attributesDefault: true;
    relations: {
      [name: string]: { attributes: boolean; relations: boolean };
    };
  };
};

export class Element {
  readonly localId: number;
  readonly model: FragmentsModel;
  readonly core: ElementData;

  config: ElementConfig = {
    data: {
      attributesDefault: true,
      relations: {
        IsDefinedBy: { attributes: true, relations: true },
        DefinesOcurrence: { attributes: false, relations: false },
      },
    },
  };

  private updateRequests: {
    [localId: number]: EditRequest;
  } = {};

  private createRequests: {
    [localId: number]: EditRequest;
  } = {};

  private removeRequests: {
    [localId: number]: EditRequest;
  } = {};

  private _elementChanged = false;

  get elementChanged() {
    return this._elementChanged;
  }

  constructor(id: number, data: ElementData, model: FragmentsModel) {
    this.localId = id;
    this.core = data;
    this.model = model;
  }

  getRequests() {
    const createRequests = Object.values(this.createRequests);
    this.createRequests = {};

    const updateRequests = Object.values(this.updateRequests);
    this.updateRequests = {};

    const removeRequests = Object.values(this.removeRequests);
    this.removeRequests = {};

    const requests = [...removeRequests, ...createRequests, ...updateRequests];

    if (requests.length > 0) {
      return requests;
    }

    return null;
  }

  // Deletes all samples, global transform, item and relationships in related items
  delete() {
    // When something is in create requests, it means that it wasn't created in fragments
    // yet, so just remove it from here. Otherwise, it means that it was created in fragments
    // and we need create a proper request to delete it.
    if (this.createRequests[this.localId]) {
      delete this.createRequests[this.localId];
    } else {
      this.removeRequests[this.localId] = {
        type: EditRequestType.DELETE_ITEM,
        localId: this.localId,
      };
    }

    for (const sampleIdStr in this.core.samples) {
      const sample = this.core.samples[sampleIdStr];
      const sampleId = parseInt(sampleIdStr, 10);

      if (this.createRequests[sample.localTransform]) {
        delete this.createRequests[sample.localTransform];
      } else {
        this.removeRequests[sample.localTransform] = {
          type: EditRequestType.DELETE_LOCAL_TRANSFORM,
          localId: sample.localTransform,
        };
      }

      if (this.createRequests[sample.representation]) {
        delete this.createRequests[sample.representation];
      } else {
        this.removeRequests[sample.representation] = {
          type: EditRequestType.DELETE_REPRESENTATION,
          localId: sample.representation,
        };
      }

      if (this.createRequests[sample.material]) {
        delete this.createRequests[sample.material];
      } else {
        this.removeRequests[sample.material] = {
          type: EditRequestType.DELETE_MATERIAL,
          localId: sample.material,
        };
      }

      if (this.createRequests[sample.item]) {
        delete this.createRequests[sample.item];
      } else {
        this.removeRequests[sample.item] = {
          type: EditRequestType.DELETE_GLOBAL_TRANSFORM,
          localId: sample.item,
        };
      }

      if (this.createRequests[sampleId]) {
        delete this.createRequests[sampleId];
      } else {
        this.removeRequests[sampleId] = {
          type: EditRequestType.DELETE_SAMPLE,
          localId: sampleId,
        };
      }
    }
  }

  async getData() {
    const result = await this.model.getItemsData(
      [this.localId],
      this.config.data
    );
    return result[0];
  }

  getGlobalTransformId() {
    return parseInt(Object.keys(this.core.globalTransforms)[0], 10);
  }

  disposeMeshes(
    meshes: THREE.Group,
    config?: {
      disposeGeometry?: boolean;
      disposeMaterial?: boolean;
    }
  ) {
    const disposeGeometry = config?.disposeGeometry ?? true;
    const disposeMaterial = config?.disposeMaterial ?? true;
    meshes.removeFromParent();
    meshes.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (disposeGeometry) {
          child.geometry.dispose();
        }
        if (disposeMaterial) {
          child.material.dispose();
        }
      }
    });
  }

  async getMeshes() {
    // Global transform
    const meshes = new THREE.Group();

    const firstGt = Object.values(this.core.globalTransforms)[0];
    const globalTransform = GeomsFbUtils.matrixFromTransform(firstGt);
    meshes.applyMatrix4(globalTransform);

    const materialList = new Map<number, THREE.MeshLambertMaterial>();
    const geometryList = new Map<number, THREE.BufferGeometry>();

    const repsIds = Object.keys(this.core.representations).map(Number);
    const geometries = await this.model.getGeometries(repsIds);

    const geometriesByReprId = new Map<number, MeshData>();
    for (const geometry of geometries) {
      const reprId = geometry.representationId!;
      geometriesByReprId.set(reprId, geometry);
    }

    for (const sampleIdStr in this.core.samples) {
      const sampleId = parseInt(sampleIdStr, 10);
      const sample = this.core.samples[sampleId];
      const meshData = geometriesByReprId.get(sample.representation);

      if (!meshData) {
        throw new Error(
          `No geometry found for representation ${sample.representation}`
        );
      }

      const { indices, positions, normals } = meshData;
      if (!indices || !positions || !normals) {
        continue;
      }

      // Material
      if (!materialList.has(sample.material)) {
        const { r, g, b, a } = this.core.materials[sample.material];
        const color = new THREE.Color().setRGB(
          r / 255,
          g / 255,
          b / 255,
          THREE.SRGBColorSpace
        );
        const material = new THREE.MeshLambertMaterial({
          color,
          transparent: true,
          opacity: a / 255,
        });
        material.userData.localId = sample.material;
        materialList.set(sample.material, material);
      }

      const material = materialList.get(sample.material);

      // Local transform
      const lt = this.core.localTransforms[sample.localTransform];
      const localTransform = GeomsFbUtils.matrixFromTransform(lt);

      // Representation
      if (!geometryList.has(sample.representation)) {
        const geometry = new THREE.BufferGeometry();
        geometry.setIndex(Array.from(indices));
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(positions, 3)
        );
        geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
        geometry.userData.localId = sample.representation;
        geometryList.set(sample.representation, geometry);
      }

      const geometry = geometryList.get(sample.representation);

      // Local transform
      const group = new THREE.Group();
      group.userData.localId = sample.localTransform;
      meshes.add(group);
      group.applyMatrix4(localTransform);

      // Sample
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.sampleId = sampleId;
      group.add(mesh);
    }

    return meshes;
  }

  async setMeshes(meshes: THREE.Group) {
    // Compare new meshes with original meshes and generate requests
    const pastMeshes = await this.getMeshes();

    // Global transform

    let sameGlobalTransform = true;

    meshes.updateMatrix();
    const p = 1000;
    for (let i = 0; i < meshes.matrix.elements.length; i++) {
      const element = Math.trunc(meshes.matrix.elements[i] * p) / p;
      const pastElement = Math.trunc(pastMeshes.matrix.elements[i] * p) / p;
      if (element !== pastElement) {
        sameGlobalTransform = false;
        break;
      }
    }

    if (!sameGlobalTransform) {
      const gtId = parseInt(Object.keys(this.core.globalTransforms)[0], 10);
      const gt = this.core.globalTransforms[gtId];
      GeomsFbUtils.transformFromMatrix(meshes.matrix, gt);
      this._elementChanged = true;
      this.updateRequests[gtId] = {
        type: EditRequestType.UPDATE_GLOBAL_TRANSFORM,
        localId: gtId,
        data: gt,
      };
    }

    // Materials

    const oldMaterials = new Map<number, THREE.MeshLambertMaterial>();
    const newMaterials = new Map<number, THREE.MeshLambertMaterial>();

    pastMeshes.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        oldMaterials.set(object.material.userData.localId, object.material);
      }
    });

    meshes.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        newMaterials.set(object.material.userData.localId, object.material);
      }
    });

    for (const [localId, oldMat] of oldMaterials) {
      const newMat = newMaterials.get(localId);
      if (!newMat) {
        continue;
      }

      const oldR = oldMat.color.r;
      const oldG = oldMat.color.g;
      const oldB = oldMat.color.b;
      const oldA = oldMat.opacity;
      const newR = newMat.color.r;
      const newG = newMat.color.g;
      const newB = newMat.color.b;
      const newA = newMat.opacity;

      const matData = this.core.materials[localId];
      matData.r = newR * 255;
      matData.g = newG * 255;
      matData.b = newB * 255;
      matData.a = newA * 255;

      if (oldR !== newR || oldG !== newG || oldB !== newB || oldA !== newA) {
        this._elementChanged = true;

        this.updateRequests[localId] = {
          type: EditRequestType.UPDATE_MATERIAL,
          localId,
          data: matData,
        };
      }
    }

    oldMaterials.clear();
    newMaterials.clear();

    // Local transforms

    const oldLocalTransforms = new Map<number, THREE.Matrix4>();
    const newLocalTransforms = new Map<number, THREE.Matrix4>();

    for (const group of meshes.children) {
      group.updateMatrix();
      newLocalTransforms.set(group.userData.localId, group.matrix);
    }

    for (const group of pastMeshes.children) {
      oldLocalTransforms.set(group.userData.localId, group.matrix);
    }

    for (const [localId, oldLocalTransform] of oldLocalTransforms) {
      const newLocalTransform = newLocalTransforms.get(localId);
      if (!newLocalTransform) {
        continue;
      }
      if (!oldLocalTransform.equals(newLocalTransform)) {
        const lt = this.core.localTransforms[localId];
        GeomsFbUtils.transformFromMatrix(newLocalTransform, lt);
        this._elementChanged = true;
        this.updateRequests[localId] = {
          type: EditRequestType.UPDATE_LOCAL_TRANSFORM,
          localId,
          data: lt,
        };
      }
    }

    oldLocalTransforms.clear();
    newLocalTransforms.clear();

    // Representations

    const oldGeoms = new Map<number, THREE.BufferGeometry>();
    const newGeoms = new Map<number, THREE.BufferGeometry>();

    meshes.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const geometry = object.geometry;
        newGeoms.set(geometry.userData.localId, geometry);
      }
    });

    pastMeshes.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const geometry = object.geometry;
        oldGeoms.set(geometry.userData.localId, geometry);
      }
    });

    for (const [localId, oldGeom] of oldGeoms) {
      const repr = this.core.representations[localId];

      // The element API doesn't automatically update circle extrusions representations
      // that has to be done manually
      if (
        repr.representationClass === TFB.RepresentationClass.CIRCLE_EXTRUSION
      ) {
        continue;
      }

      const newGeom = newGeoms.get(localId);
      if (!newGeom) {
        continue;
      }
      let sameVertices = true;
      const oldPosAttribute = oldGeom.getAttribute("position");
      const newPosAttribute = newGeom.getAttribute("position");
      if (oldPosAttribute && newPosAttribute) {
        if (oldPosAttribute.count === newPosAttribute.count) {
          for (let i = 0; i < oldPosAttribute.array.length; i++) {
            if (oldPosAttribute.array[i] !== newPosAttribute.array[i]) {
              sameVertices = false;
              break;
            }
          }
        } else {
          sameVertices = false;
        }
      }
      if (!sameVertices) {
        GeomsFbUtils.representationFromGeometry(newGeom, repr);

        this._elementChanged = true;

        this.updateRequests[localId] = {
          type: EditRequestType.UPDATE_REPRESENTATION,
          localId,
          data: repr,
        };
      }
    }
  }

  createSamples(samples: RawSample[]) {
    for (const sample of samples) {
      const tempId = Math.trunc(performance.now());
      this.core.samples[tempId] = sample;
      this.createRequests[tempId] = {
        type: EditRequestType.CREATE_SAMPLE,
        data: sample,
      };
    }
  }

  deleteSamples(ids: number[]) {
    this._elementChanged = true;
    for (const id of ids) {
      const count = Object.keys(this.core.samples).length;
      if (count === 1) {
        // Can't delete all samples of an item
        continue;
      }
      delete this.core.samples[id];
      delete this.updateRequests[id];
      if (this.createRequests[id]) {
        // Sample not created yet in fragments, so just remove it from here
        delete this.createRequests[id];
      } else {
        // Sample already created, so delete it
        this.removeRequests[id] = {
          type: EditRequestType.DELETE_SAMPLE,
          localId: id,
        };
      }
    }
  }

  async updateSamples() {
    // Update the core data to have just the data referenced by the samples

    const matsToDelete = new Set<number>(
      Object.keys(this.core.materials).map(Number)
    );

    const ltsToDelete = new Set<number>(
      Object.keys(this.core.localTransforms).map(Number)
    );

    const gtsToDelete = new Set<number>(
      Object.keys(this.core.globalTransforms).map(Number)
    );

    const repsToDelete = new Set<number>(
      Object.keys(this.core.representations).map(Number)
    );

    const materialsToGet = new Set<number>();
    const gtsToGet = new Set<number>();
    const ltsToGet = new Set<number>();
    const representationsToGet = new Set<number>();

    const samplesToUpdate = new Set<number>();

    for (const sampleIdStr in this.core.samples) {
      const sampleId = parseInt(sampleIdStr, 10);
      const sample = this.core.samples[sampleId];

      matsToDelete.delete(sample.material);
      gtsToDelete.delete(sample.item);
      ltsToDelete.delete(sample.localTransform);
      repsToDelete.delete(sample.representation);

      if (!this.core.materials[sample.material]) {
        samplesToUpdate.add(sampleId);
        materialsToGet.add(sample.material);
      }
      if (!this.core.globalTransforms[sample.item]) {
        samplesToUpdate.add(sampleId);
        gtsToGet.add(sample.item);
      }
      if (!this.core.localTransforms[sample.localTransform]) {
        samplesToUpdate.add(sampleId);
        ltsToGet.add(sample.localTransform);
      }
      if (!this.core.representations[sample.representation]) {
        samplesToUpdate.add(sampleId);
        representationsToGet.add(sample.representation);
      }
    }

    // Clean up data that is not used by samples anymore

    for (const matId of matsToDelete) {
      delete this.core.materials[matId];
    }
    for (const gtId of gtsToDelete) {
      delete this.core.globalTransforms[gtId];
    }
    for (const ltId of ltsToDelete) {
      delete this.core.localTransforms[ltId];
    }
    for (const repId of repsToDelete) {
      delete this.core.representations[repId];
    }

    // Get the new data

    let newMats = new Map<number, RawMaterial>();
    if (materialsToGet.size) {
      newMats = await this.model.getMaterials(materialsToGet);
    }

    let newGts = new Map<number, RawGlobalTransformData>();
    if (gtsToGet.size) {
      newGts = await this.model.getGlobalTransforms(gtsToGet);
    }

    let newLts = new Map<number, RawTransformData>();
    if (ltsToGet.size) {
      newLts = await this.model.getLocalTransforms(ltsToGet);
    }

    let newReps = new Map<number, RawRepresentation>();
    if (representationsToGet.size) {
      newReps = await this.model.getRepresentations(representationsToGet);
    }

    for (const [id, material] of newMats) {
      this.core.materials[id] = material;
    }

    for (const [id, gt] of newGts) {
      this.core.globalTransforms[id] = gt;
    }

    for (const [id, lt] of newLts) {
      this.core.localTransforms[id] = lt;
    }

    for (const [id, rep] of newReps) {
      this.core.representations[id] = rep;
    }

    // Generate the requests to update the samples

    for (const sampleId of samplesToUpdate) {
      if (this.createRequests[sampleId]) {
        // This sample wasn't created in fragments yet, just update the create request
        const createRequest = this.createRequests[
          sampleId
        ] as CreateSampleRequest;
        createRequest.data = this.core.samples[sampleId];
        continue;
      }

      this._elementChanged = true;

      this.updateRequests[sampleId] = {
        type: EditRequestType.UPDATE_SAMPLE,
        localId: sampleId,
        data: this.core.samples[sampleId],
      };
    }
  }
}
