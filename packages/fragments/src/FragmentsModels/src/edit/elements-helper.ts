import * as THREE from "three";
import {
  EditRequest,
  EditRequestType,
  RawMaterial,
  GeomsFbUtils,
  NewElementData,
  EditUtils,
  RawItemData,
} from "../../../Utils";
import { FragmentsModels, ItemAttribute, ItemData } from "../..";
import { Element } from "./element";
import * as TFB from "../../../Schema";
import * as ET from "../../../Utils/edit/edit-types";

export class ElementsHelper {
  private _nextTempIds: { [modelId: string]: number } = {};

  private _requests: {
    [modelId: string]: {
      update: {
        [localId: number | string]: EditRequest;
      };

      create: {
        [localId: number | string]: EditRequest;
      };

      remove: {
        [localId: number | string]: EditRequest;
      };
      relations: {
        create: {
          [localId: number | string]: EditRequest;
        };
        update: {
          [localId: number | string]: EditRequest;
        };
        remove: {
          [localId: number | string]: EditRequest;
        };
      };
    };
  } = {};

  private _fragments: FragmentsModels;

  constructor(fragments: FragmentsModels) {
    this._fragments = fragments;
  }

  getRequests(modelId: string) {
    const modelRequests = this.getModelRequests(modelId);
    this._requests[modelId] = this.newRequests();

    const {
      create,
      update,
      remove,
      relations: { create: relCreate, update: relUpdate, remove: relRemove },
    } = modelRequests;

    const createRequests = Object.values(create);
    const updateRequests = Object.values(update);
    const removeRequests = Object.values(remove);
    const relCreateRequests = Object.values(relCreate);
    const relUpdateRequests = Object.values(relUpdate);
    const relRemoveRequests = Object.values(relRemove);

    const requests = [
      ...removeRequests,
      ...createRequests,
      ...updateRequests,
      ...relCreateRequests,
      ...relUpdateRequests,
      ...relRemoveRequests,
    ];

    if (requests.length > 0) {
      return requests;
    }

    return null;
  }

  createMaterial(modelId: string, material: THREE.MeshLambertMaterial) {
    const tempId = this.getNextTempId(modelId);
    const data: RawMaterial = {
      r: material.color.r * 255,
      g: material.color.g * 255,
      b: material.color.b * 255,
      a: material.opacity * 255,
      renderedFaces: material.side === THREE.DoubleSide ? 1 : 0,
      stroke: 0,
    };
    this.addRequest(modelId, tempId, "create", {
      type: EditRequestType.CREATE_MATERIAL,
      tempId,
      data,
    });
    return tempId;
  }

  createLocalTransform(modelId: string, transform: THREE.Matrix4) {
    const tempId = this.getNextTempId(modelId);
    const data = GeomsFbUtils.transformFromMatrix(transform);
    this.addRequest(modelId, tempId, "create", {
      type: EditRequestType.CREATE_LOCAL_TRANSFORM,
      tempId,
      data,
    });
    return tempId;
  }

  createShell(modelId: string, geometry: THREE.BufferGeometry) {
    const tempId = this.getNextTempId(modelId);
    const shell = GeomsFbUtils.representationFromGeometry(geometry);
    this.addRequest(modelId, tempId, "create", {
      type: EditRequestType.CREATE_REPRESENTATION,
      tempId,
      data: shell,
    });
    return tempId;
  }

  createCircleExtrusion(modelId: string, data: ET.RawCircleExtrusion) {
    const bbox = GeomsFbUtils.bboxFromCircleExtrusion(data);

    const tempId = this.getNextTempId(modelId);
    this.addRequest(modelId, tempId, "create", {
      type: EditRequestType.CREATE_REPRESENTATION,
      tempId,
      data: {
        representationClass: TFB.RepresentationClass.CIRCLE_EXTRUSION,
        bbox,
        geometry: data,
      },
    });
    return tempId;
  }

  createGlobalTransform(
    modelId: string,
    transform: THREE.Matrix4,
    itemId: number | string,
  ) {
    const tempId = this.getNextTempId(modelId);
    const data = GeomsFbUtils.transformFromMatrix(transform);
    this.addRequest(modelId, tempId, "create", {
      type: EditRequestType.CREATE_GLOBAL_TRANSFORM,
      tempId,
      data: {
        itemId,
        ...data,
      },
    });
    return tempId;
  }

  createSample(
    modelId: string,
    data: {
      localTransform: number | string;
      representation: number | string;
      material: number | string;
      globalTransform: number | string;
    },
  ) {
    const { localTransform, representation, material, globalTransform } = data;
    const tempId = this.getNextTempId(modelId);
    this.addRequest(modelId, tempId, "create", {
      type: EditRequestType.CREATE_SAMPLE,
      tempId,
      data: {
        localTransform,
        representation,
        material,
        item: globalTransform,
      },
    });
    return tempId;
  }

  createItem(modelId: string, item: RawItemData) {
    const tempId = this.getNextTempId(modelId);
    this.addRequest(modelId, tempId, "create", {
      type: EditRequestType.CREATE_ITEM,
      tempId,
      data: item,
    });
    return tempId;
  }

  setItem(modelId: string, item: ItemData) {
    const localIdAttr = item._localId as ItemAttribute;
    if (!localIdAttr) {
      throw new Error("No local id provided for the item to set");
    }

    const localId = localIdAttr.value;
    const data = EditUtils.itemDataToRawItemData(item);

    this.addRequest(modelId, localIdAttr.value, "update", {
      type: EditRequestType.UPDATE_ITEM,
      localId,
      data,
    });
  }

  async relate(
    modelId: string,
    itemId: number,
    relationName: string,
    itemIds: number[],
  ) {
    // Get the relation of the item

    const model = this._fragments.models.list.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const relations = await model.getRelations([itemId]);
    const relationData = relations.get(itemId);
    if (!relationData) {
      // Item not related: create relation and add given items
      this.addRelationRequest(modelId, itemId, "create", {
        type: EditRequestType.CREATE_RELATION,
        localId: itemId,
        data: {
          data: {
            [relationName]: itemIds,
          },
        },
      });
      return;
    }

    // Item is related: update relation

    if (!relationData.data[relationName]) {
      // Relation not found: create relation and add given items
      relationData.data[relationName] = itemIds;
    } else {
      const uniqueRels = new Set(relationData.data[relationName]);
      for (const id of itemIds) {
        uniqueRels.add(id);
      }
      relationData.data[relationName] = Array.from(uniqueRels);
    }

    this.addRelationRequest(modelId, itemId, "update", {
      type: EditRequestType.UPDATE_RELATION,
      localId: itemId,
      data: relationData,
    });
  }

  async unrelate(
    modelId: string,
    itemId: number,
    relationName: string,
    itemIds: number[],
  ) {
    // Get the relation of the item

    const model = this._fragments.models.list.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const relations = await model.getRelations([itemId]);
    const relationData = relations.get(itemId);
    if (!relationData) {
      // Item not related: just return
      return;
    }

    // Item is related: update relation

    if (!relationData.data[relationName]) {
      // Relation not found: just return
      return;
    }

    // Delete given items from relation
    const uniqueRels = new Set(relationData.data[relationName]);
    for (const id of itemIds) {
      uniqueRels.delete(id);
    }
    relationData.data[relationName] = Array.from(uniqueRels);

    this.addRelationRequest(modelId, itemId, "update", {
      type: EditRequestType.UPDATE_RELATION,
      localId: itemId,
      data: relationData,
    });
  }

  async get(modelId: string, localIds: Iterable<number>) {
    const model = this._fragments.models.list.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }
    return model._getElements(localIds);
  }

  async create(modelId: string, elements: NewElementData[]) {
    for (const element of elements) {
      const { attributes, samples, globalTransform } = element;

      // Create the item
      const tempId = this.getNextTempId(modelId);
      const data = EditUtils.itemDataToRawItemData(attributes);
      this.addRequest(modelId, tempId, "create", {
        type: EditRequestType.CREATE_ITEM,
        tempId,
        data,
      });

      // Create the meshes
      const gtId = this.createGlobalTransform(modelId, globalTransform, tempId);
      for (const sample of samples) {
        const { localTransform, representation, material } = sample;
        let ltId: number | string;
        if (
          typeof localTransform !== "number" &&
          typeof localTransform !== "string"
        ) {
          ltId = this.createLocalTransform(modelId, localTransform);
        } else {
          ltId = localTransform;
        }
        let reprId: number | string;
        if (
          typeof representation !== "number" &&
          typeof representation !== "string"
        ) {
          reprId = this.createShell(modelId, representation);
        } else {
          reprId = representation;
        }
        let matId: number | string;
        if (typeof material !== "number" && typeof material !== "string") {
          matId = this.createMaterial(modelId, material);
        } else {
          matId = material;
        }
        this.createSample(modelId, {
          localTransform: ltId,
          representation: reprId,
          material: matId,
          globalTransform: gtId,
        });
      }
    }

    const requests = this.getRequests(modelId);
    if (!requests) {
      console.log("Something went wrong, no requests sent");
      return null;
    }

    const itemIndices: number[] = [];
    for (let i = 0; i < requests.length; i++) {
      if (requests[i].type === EditRequestType.CREATE_ITEM) {
        itemIndices.push(i);
      }
    }

    const result = await this._fragments.editor.edit(modelId, requests);

    const itemIds = itemIndices.map((index) => result[index]);

    return this.get(modelId, itemIds);
  }

  delete(modelId: string, elements: Element[]) {
    for (const element of elements) {
      element.delete();
      const currentRequests = element.getRequests();
      if (currentRequests) {
        for (const request of currentRequests) {
          const id = request.localId as number;
          if (id) {
            this.addRequest(modelId, id, "remove", request);
          }
        }
      }
    }
  }

  async applyChanges(modelId: string, elements: Element[] = []) {
    const allRequests: EditRequest[] = [];
    for (const element of elements) {
      const requests = element.getRequests();
      if (requests) {
        allRequests.push(...requests);
      }
    }
    const requests = this.getRequests(modelId);
    if (requests) {
      allRequests.push(...requests);
    }
    if (allRequests.length > 0) {
      return this._fragments.editor.edit(modelId, allRequests);
    }
    return [];
  }

  async deleteData(
    modelId: string,
    data: {
      itemIds?: Iterable<number>;
      materialIds?: Iterable<number>;
      localTransformIds?: Iterable<number>;
      representationIds?: Iterable<number>;
      sampleIds?: Iterable<number>;
      filterInUse?: boolean;
    },
  ) {
    const model = this._fragments.models.list.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const filterInUse = data.filterInUse ?? true;

    const {
      itemIds,
      materialIds,
      localTransformIds,
      representationIds,
      sampleIds,
    } = data;

    const usedMaterials = new Set<number>();
    const usedLocalTransforms = new Set<number>();
    const usedGlobalTransforms = new Set<number>();
    const usedRepresentations = new Set<number>();

    if (filterInUse) {
      const samples = await model.getSamples();
      for (const sample of samples.values()) {
        usedMaterials.add(sample.material);
        usedLocalTransforms.add(sample.localTransform);
        usedGlobalTransforms.add(sample.item);
        usedRepresentations.add(sample.representation);
      }
    }

    if (materialIds) {
      for (const materialId of materialIds) {
        if (filterInUse && usedMaterials.has(materialId)) {
          console.log(`Material ${materialId} is used, skipping`);
          continue;
        }
        if (this.isBeingCreated(modelId, materialId)) {
          // Material not created yet, just remove it from queue
          delete this._requests[modelId].create[materialId];
          continue;
        }
        this.addRequest(modelId, materialId, "remove", {
          type: EditRequestType.DELETE_MATERIAL,
          localId: materialId,
        });
      }
    }

    if (localTransformIds) {
      for (const localTransformId of localTransformIds) {
        if (filterInUse && usedLocalTransforms.has(localTransformId)) {
          console.log(`Local transform ${localTransformId} is used, skipping`);
          continue;
        }
        if (this.isBeingCreated(modelId, localTransformId)) {
          // Local transform not created yet, just remove it from queue
          delete this._requests[modelId].create[localTransformId];
          continue;
        }
        this.addRequest(modelId, localTransformId, "remove", {
          type: EditRequestType.DELETE_LOCAL_TRANSFORM,
          localId: localTransformId,
        });
      }
    }

    if (representationIds) {
      for (const representationId of representationIds) {
        if (filterInUse && usedRepresentations.has(representationId)) {
          console.log(`Representation ${representationId} is used, skipping`);
          continue;
        }
        if (this.isBeingCreated(modelId, representationId)) {
          // Representation not created yet, just remove it from queue
          delete this._requests[modelId].create[representationId];
          continue;
        }
        this.addRequest(modelId, representationId, "remove", {
          type: EditRequestType.DELETE_REPRESENTATION,
          localId: representationId,
        });
      }
    }

    if (sampleIds) {
      for (const sampleId of sampleIds) {
        if (this.isBeingCreated(modelId, sampleId)) {
          // Sample not created yet, just remove it from queue
          delete this._requests[modelId].create[sampleId];
          continue;
        }
        this.addRequest(modelId, sampleId, "remove", {
          type: EditRequestType.DELETE_SAMPLE,
          localId: sampleId,
        });
      }
    }

    if (itemIds) {
      for (const itemId of itemIds) {
        if (this.isBeingCreated(modelId, itemId)) {
          // Item not created yet, just remove it from queue
          delete this._requests[modelId].create[itemId];
          continue;
        }
        this.addRequest(modelId, itemId, "remove", {
          type: EditRequestType.DELETE_ITEM,
          localId: itemId,
        });
      }
    }
  }

  private getNextTempId(modelId: string) {
    if (!this._nextTempIds[modelId]) {
      this._nextTempIds[modelId] = 0;
    }
    return (this._nextTempIds[modelId]++).toString();
  }

  private addRelationRequest(
    modelId: string,
    localId: number | string,
    type: "create" | "update" | "remove",
    request: EditRequest,
  ) {
    const modelRequests = this.getModelRequests(modelId);
    const relRequests = modelRequests.relations;
    const currentRequests = relRequests[type];
    const id = localId as keyof typeof currentRequests;
    currentRequests[id] = request;
  }

  private addRequest(
    modelId: string,
    localId: number | string,
    type: "create" | "update" | "remove",
    request: EditRequest,
  ) {
    const modelRequests = this.getModelRequests(modelId);
    const currentRequests = modelRequests[type];
    const id = localId as keyof typeof currentRequests;
    currentRequests[id] = request;
  }

  private getModelRequests(modelId: string) {
    if (!this._requests[modelId]) {
      this._requests[modelId] = this.newRequests();
    }
    return this._requests[modelId];
  }

  private isBeingCreated(modelId: string, localId: number | string) {
    if (!this._requests[modelId]) {
      return false;
    }
    const requests = this._requests[modelId];
    return requests.create[localId] !== undefined;
  }

  private newRequests() {
    // Relations need to be updated separately because they have the same localId than the item
    return {
      update: {},
      create: {},
      remove: {},
      relations: {
        create: {},
        update: {},
        remove: {},
      },
    };
  }
}
