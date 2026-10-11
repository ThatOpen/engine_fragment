import * as THREE from "three";
import {
  EditRequest,
  EditRequestType,
  RawMaterial,
  GeomsFbUtils,
  NewElementData,
  EditUtils,
  RawItemData,
  isIndexRequest,
} from "../../../Utils";
import {
  FragmentsModel,
  FragmentsModels,
  ItemAttribute,
  ItemData,
  ModelUid,
} from "../..";
import { Element } from "./element";
import * as TFB from "../../../Schema";
import * as ET from "../../../Utils/edit/edit-types";

type ModelRequests = {
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

/** The requests queued for a model, see ElementsHelper.takeQueued(). */
export type QueuedRequests = {
  requests?: ModelRequests;
  indexRequests?: ET.IndexRequest[];
  nextTempId?: number;
};

export class ElementsHelper {
  // Queued requests of each model, by the model's uid. They are dropped when
  // it is disposed, so a model loaded later under the same modelId starts
  // with none.
  private readonly _nextTempIds = new Map<ModelUid, number>();

  private readonly _requests = new Map<ModelUid, ModelRequests>();

  private _fragments: FragmentsModels;

  // Indexes are name-keyed, not localId-keyed, so they don't fit cleanly
  // into the create/update/remove maps above. They get their own queue,
  // appended to the request list at applyChanges time.
  private readonly _indexRequests = new Map<ModelUid, ET.IndexRequest[]>();

  // Models whose queued requests are dropped once they are disposed.
  private readonly _tracked = new Set<ModelUid>();

  constructor(fragments: FragmentsModels) {
    this._fragments = fragments;
  }

  getRequests(modelId: string) {
    const model = this._fragments.models.list.get(modelId);
    return model ? this.takeRequests(this.track(model)) : null;
  }

  /**
   * Takes the requests queued for a model, for the model that replaces it
   * (see EditHelper.save()). Disposing the model would drop them.
   */
  takeQueued(model: FragmentsModel): QueuedRequests {
    const uid = model._uid;
    const queued = {
      requests: this._requests.get(uid),
      indexRequests: this._indexRequests.get(uid),
      nextTempId: this._nextTempIds.get(uid),
    };
    this._requests.delete(uid);
    this._indexRequests.delete(uid);
    this._nextTempIds.delete(uid);
    return queued;
  }

  /** Queues the requests taken from the model `model` replaces. */
  queue(model: FragmentsModel, queued: QueuedRequests) {
    const uid = this.track(model);
    const { requests, indexRequests, nextTempId } = queued;
    if (requests) this._requests.set(uid, requests);
    if (indexRequests) this._indexRequests.set(uid, indexRequests);
    if (nextTempId !== undefined) this._nextTempIds.set(uid, nextTempId);
  }

  private takeRequests(uid: ModelUid) {
    const modelRequests = this.getModelRequests(uid);
    this._requests.set(uid, this.newRequests());

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

    const indexRequests = this._indexRequests.get(uid) ?? [];
    this._indexRequests.set(uid, []);

    const requests = [
      ...removeRequests,
      ...createRequests,
      ...updateRequests,
      ...relCreateRequests,
      ...relUpdateRequests,
      ...relRemoveRequests,
      ...indexRequests,
    ];

    if (requests.length > 0) {
      return requests;
    }

    return null;
  }

  /**
   * Queue a CREATE_INDEX request. Flushed when `editor.applyChanges()` runs.
   */
  createIndex(modelId: string, data: ET.RawIndexData) {
    this.queueIndexRequest(modelId, {
      type: ET.EditRequestType.CREATE_INDEX,
      data,
    });
  }

  /**
   * Queue an UPDATE_INDEX request. Replaces the index identified by
   * `data.name` when flushed.
   */
  updateIndex(modelId: string, data: ET.RawIndexData) {
    this.queueIndexRequest(modelId, {
      type: ET.EditRequestType.UPDATE_INDEX,
      data,
    });
  }

  /**
   * Queue a DELETE_INDEX request. No-op at flush time if the index doesn't
   * exist.
   */
  deleteIndex(modelId: string, name: string) {
    this.queueIndexRequest(modelId, {
      type: ET.EditRequestType.DELETE_INDEX,
      name,
    });
  }

  private queueIndexRequest(modelId: string, request: ET.IndexRequest) {
    const uid = this.uidOf(modelId);
    let requests = this._indexRequests.get(uid);
    if (!requests) {
      requests = [];
      this._indexRequests.set(uid, requests);
    }
    requests.push(request);
  }

  createMaterial(modelId: string, material: THREE.MeshLambertMaterial) {
    const uid = this.uidOf(modelId);
    const tempId = this.getNextTempId(uid);
    const data: RawMaterial = {
      r: material.color.r * 255,
      g: material.color.g * 255,
      b: material.color.b * 255,
      a: material.opacity * 255,
      renderedFaces: material.side === THREE.DoubleSide ? 1 : 0,
      stroke: 0,
    };
    this.addRequest(uid, tempId, "create", {
      type: EditRequestType.CREATE_MATERIAL,
      tempId,
      data,
    });
    return tempId;
  }

  createLocalTransform(modelId: string, transform: THREE.Matrix4) {
    const uid = this.uidOf(modelId);
    const tempId = this.getNextTempId(uid);
    const data = GeomsFbUtils.transformFromMatrix(transform);
    this.addRequest(uid, tempId, "create", {
      type: EditRequestType.CREATE_LOCAL_TRANSFORM,
      tempId,
      data,
    });
    return tempId;
  }

  createShell(modelId: string, geometry: THREE.BufferGeometry) {
    const uid = this.uidOf(modelId);
    const tempId = this.getNextTempId(uid);
    const shell = GeomsFbUtils.representationFromGeometry(geometry);
    this.addRequest(uid, tempId, "create", {
      type: EditRequestType.CREATE_REPRESENTATION,
      tempId,
      data: shell,
    });
    return tempId;
  }

  createCircleExtrusion(modelId: string, data: ET.RawCircleExtrusion) {
    const uid = this.uidOf(modelId);
    const bbox = GeomsFbUtils.bboxFromCircleExtrusion(data);

    const tempId = this.getNextTempId(uid);
    this.addRequest(uid, tempId, "create", {
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
    const uid = this.uidOf(modelId);
    const tempId = this.getNextTempId(uid);
    const data = GeomsFbUtils.transformFromMatrix(transform);
    this.addRequest(uid, tempId, "create", {
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
    const uid = this.uidOf(modelId);
    const tempId = this.getNextTempId(uid);
    this.addRequest(uid, tempId, "create", {
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
    const uid = this.uidOf(modelId);
    const tempId = this.getNextTempId(uid);
    this.addRequest(uid, tempId, "create", {
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

    this.addRequest(this.uidOf(modelId), localIdAttr.value, "update", {
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

    const model = this.modelOf(modelId);
    const uid = model._uid;

    const relations = await model.getRelations([itemId]);
    // Disposed meanwhile: its queued requests are gone.
    if (model._disposedSignal.aborted) return;
    const relationData = relations.get(itemId);
    if (!relationData) {
      // Item not related: create relation and add given items
      this.addRelationRequest(uid, itemId, "create", {
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

    this.addRelationRequest(uid, itemId, "update", {
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

    const model = this.modelOf(modelId);
    const uid = model._uid;

    const relations = await model.getRelations([itemId]);
    // Disposed meanwhile: its queued requests are gone.
    if (model._disposedSignal.aborted) return;
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

    this.addRelationRequest(uid, itemId, "update", {
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
    const model = this.modelOf(modelId);
    const uid = model._uid;
    for (const element of elements) {
      const { attributes, samples, globalTransform } = element;

      // Create the item
      const tempId = this.getNextTempId(uid);
      const data = EditUtils.itemDataToRawItemData(attributes);
      this.addRequest(uid, tempId, "create", {
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

    const requests = this.takeRequests(uid);
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

    return model._getElements(itemIds);
  }

  delete(modelId: string, elements: Element[]) {
    const uid = this.uidOf(modelId);
    for (const element of elements) {
      element.delete();
      const currentRequests = element.getRequests();
      if (currentRequests) {
        for (const request of currentRequests) {
          if (isIndexRequest(request)) continue;
          const id = request.localId as number;
          if (id) {
            this.addRequest(uid, id, "remove", request);
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
    const model = this.modelOf(modelId);
    const uid = model._uid;

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
      // Disposed meanwhile: its queued requests are gone.
      if (model._disposedSignal.aborted) return;
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
        if (this.isBeingCreated(uid, materialId)) {
          // Material not created yet, just remove it from queue
          delete this.getModelRequests(uid).create[materialId];
          continue;
        }
        this.addRequest(uid, materialId, "remove", {
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
        if (this.isBeingCreated(uid, localTransformId)) {
          // Local transform not created yet, just remove it from queue
          delete this.getModelRequests(uid).create[localTransformId];
          continue;
        }
        this.addRequest(uid, localTransformId, "remove", {
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
        if (this.isBeingCreated(uid, representationId)) {
          // Representation not created yet, just remove it from queue
          delete this.getModelRequests(uid).create[representationId];
          continue;
        }
        this.addRequest(uid, representationId, "remove", {
          type: EditRequestType.DELETE_REPRESENTATION,
          localId: representationId,
        });
      }
    }

    if (sampleIds) {
      for (const sampleId of sampleIds) {
        if (this.isBeingCreated(uid, sampleId)) {
          // Sample not created yet, just remove it from queue
          delete this.getModelRequests(uid).create[sampleId];
          continue;
        }
        this.addRequest(uid, sampleId, "remove", {
          type: EditRequestType.DELETE_SAMPLE,
          localId: sampleId,
        });
      }
    }

    if (itemIds) {
      for (const itemId of itemIds) {
        if (this.isBeingCreated(uid, itemId)) {
          // Item not created yet, just remove it from queue
          delete this.getModelRequests(uid).create[itemId];
          continue;
        }
        this.addRequest(uid, itemId, "remove", {
          type: EditRequestType.DELETE_ITEM,
          localId: itemId,
        });
      }
    }
  }

  // Resolves the live model and ties its queued requests to it.
  private modelOf(modelId: string) {
    const model = this._fragments.models.list.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }
    this.track(model);
    return model;
  }

  private uidOf(modelId: string) {
    return this.modelOf(modelId)._uid;
  }

  private track(model: FragmentsModel) {
    const uid = model._uid;
    if (!this._tracked.has(uid)) {
      this._tracked.add(uid);
      model._disposedSignal.addEventListener(
        "abort",
        () => {
          this._tracked.delete(uid);
          this._nextTempIds.delete(uid);
          this._requests.delete(uid);
          this._indexRequests.delete(uid);
        },
        { once: true },
      );
    }
    return uid;
  }

  private getNextTempId(uid: ModelUid) {
    const tempId = this._nextTempIds.get(uid) ?? 0;
    this._nextTempIds.set(uid, tempId + 1);
    return tempId.toString();
  }

  private addRelationRequest(
    uid: ModelUid,
    localId: number | string,
    type: "create" | "update" | "remove",
    request: EditRequest,
  ) {
    const modelRequests = this.getModelRequests(uid);
    const relRequests = modelRequests.relations;
    const currentRequests = relRequests[type];
    const id = localId as keyof typeof currentRequests;
    currentRequests[id] = request;
  }

  private addRequest(
    uid: ModelUid,
    localId: number | string,
    type: "create" | "update" | "remove",
    request: EditRequest,
  ) {
    const modelRequests = this.getModelRequests(uid);
    const currentRequests = modelRequests[type];
    const id = localId as keyof typeof currentRequests;
    currentRequests[id] = request;
  }

  private getModelRequests(uid: ModelUid) {
    let requests = this._requests.get(uid);
    if (!requests) {
      requests = this.newRequests();
      this._requests.set(uid, requests);
    }
    return requests;
  }

  private isBeingCreated(uid: ModelUid, localId: number | string) {
    const requests = this._requests.get(uid);
    if (!requests) {
      return false;
    }
    return requests.create[localId] !== undefined;
  }

  private newRequests(): ModelRequests {
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
