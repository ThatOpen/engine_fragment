import * as THREE from "three";
import { FragmentsModel } from "./fragments-model";
import * as EDIT from "../../../Utils/edit";
import { EditRequest } from "../../../Utils";
import { Element } from "../edit";
import { CurrentLod, MeshData } from "./model-types";
import type { Cloned } from "../multithreading/cloned";

export class EditManager {
  async edit(model: FragmentsModel, requests: EditRequest[]) {
    return model._invoke("edit", [requests]);
  }

  async reset(model: FragmentsModel) {
    return model._invoke("reset", []);
  }

  async save(model: FragmentsModel): Promise<Uint8Array> {
    return model._invoke("save", []);
  }

  async getItemsGeometry(
    model: FragmentsModel,
    localIds: number[],
    lod: CurrentLod,
  ) {
    const originalGeometries = (
      await model._invoke("getItemsGeometry", [localIds, lod])
    ).map(EditManager.restoreTransforms);

    const deltaModel = model._getDeltaModel();
    if (!deltaModel) {
      return originalGeometries;
    }

    // If there are edited geometries, return them instead of the original ones

    const deltaGeometries = (
      await deltaModel._invoke("getItemsGeometry", [localIds])
    ).map(EditManager.restoreTransforms);

    const geomsByLocalId = new Map<number, MeshData[]>();
    for (const geometry of originalGeometries) {
      const localId = geometry[0].localId!;
      geomsByLocalId.set(localId, geometry);
    }

    for (const geometry of deltaGeometries) {
      const localId = geometry[0].localId!;
      geomsByLocalId.set(localId, geometry);
    }

    return Array.from(geomsByLocalId.values());
  }

  async getGeometries(model: FragmentsModel, ids: number[]) {
    const originalGeometries = EditManager.restoreTransforms(
      await model._invoke("getGeometries", [ids]),
    );

    const deltaModel = model._getDeltaModel();
    if (!deltaModel) {
      return originalGeometries;
    }

    // If there are edited geometries, return them instead of the original ones

    const deltaGeometries = EditManager.restoreTransforms(
      await deltaModel._invoke("getGeometries", [ids]),
    );

    const geomsByReprId = new Map<number, MeshData>();
    for (const geometry of originalGeometries) {
      const reprId = geometry.representationId!;
      geomsByReprId.set(reprId, geometry);
    }

    for (const geometry of deltaGeometries) {
      const reprId = geometry.representationId!;
      geomsByReprId.set(reprId, geometry);
    }

    return Array.from(geomsByReprId.values());
  }

  async getMaterialsIds(model: FragmentsModel) {
    return model._invoke("getMaterialsIds", []);
  }

  async getMaterials(
    model: FragmentsModel,
    localIds?: Iterable<number>,
  ): Promise<Map<number, EDIT.RawMaterial>> {
    return model._invoke("getMaterials", [localIds]);
  }

  async getSamplesIds(model: FragmentsModel) {
    return model._invoke("getSamplesIds", []);
  }

  async getSamples(
    model: FragmentsModel,
    localIds?: Iterable<number>,
  ): Promise<Map<number, EDIT.RawSample>> {
    return model._invoke("getSamples", [localIds]);
  }

  async getRepresentationsIds(model: FragmentsModel) {
    return model._invoke("getRepresentationsIds", []);
  }

  async getRepresentations(
    model: FragmentsModel,
    localIds?: Iterable<number>,
  ): Promise<Map<number, EDIT.RawRepresentation>> {
    return model._invoke("getRepresentations", [localIds]);
  }

  async getLocalTransformsIds(model: FragmentsModel) {
    return model._invoke("getLocalTransformsIds", []);
  }

  async getLocalTransforms(
    model: FragmentsModel,
    localIds?: Iterable<number>,
  ): Promise<Map<number, EDIT.RawTransformData>> {
    return model._invoke("getLocalTransforms", [localIds]);
  }

  async getGlobalTransformsIds(model: FragmentsModel) {
    return model._invoke("getGlobalTransformsIds", []);
  }

  async getGlobalTransforms(
    model: FragmentsModel,
    localIds?: Iterable<number>,
  ): Promise<Map<number, EDIT.RawGlobalTransformData>> {
    return model._invoke("getGlobalTransforms", [localIds]);
  }

  async getItemsIds(model: FragmentsModel) {
    return model._invoke("getItemsIds", []);
  }

  async getItems(
    model: FragmentsModel,
    localIds?: Iterable<number>,
  ): Promise<Map<number, EDIT.RawItemData>> {
    return model._invoke("getItems", [localIds]);
  }

  async getRelations(
    model: FragmentsModel,
    localIds?: number[],
  ): Promise<Map<number, EDIT.RawRelationData>> {
    return model._invoke("getRelations", [localIds]);
  }

  async getGlobalTranformsIdsOfItems(model: FragmentsModel, ids: number[]) {
    const items = await model._invoke("getGlobalTranformsIdsOfItems", [ids]);
    // this.applyActions(editor, model, items, "ITEM");
    return items;
  }

  async getEditedElements(model: FragmentsModel) {
    const deltaModel = model._getDeltaModel();
    if (!deltaModel) {
      return [];
    }
    return deltaModel._invoke("getItemsWithGeometry", []);
  }

  /**
   * Fast snap-only fetch keyed by `itemId` — the FlatBuffer
   * `sample.item()` index that the GPU picker now writes into the
   * per-vertex `id` attribute. Returns just the data the snap path
   * needs (samples, transforms, SHELL representations); skips the
   * whole-sample-table scan that `getElements` does.
   *
   * Returns `null` if the item has no shells (e.g. line-only items).
   */
  async getItemSnapData(
    model: FragmentsModel,
    itemId: number,
  ): Promise<EDIT.ElementData | null> {
    return model._invoke("getItemSnapData", [itemId]);
  }

  async getElements(model: FragmentsModel, localIds: Iterable<number>) {
    const itemsData = await model._invoke("getElementsData", [localIds]);

    // Update meshes data, just get them from delta model
    const deltaModel = model._getDeltaModel();
    if (deltaModel) {
      const updatedItems = await deltaModel._invoke("getElementsData", [
        localIds,
      ]);

      for (const id in updatedItems) {
        itemsData[id] = updatedItems[id];
      }
    }

    const result: Element[] = [];
    for (const id in itemsData) {
      const element = new Element(Number(id), itemsData[id], model);
      result.push(element);
    }

    return result;
  }

  async getRequests(model: FragmentsModel): Promise<{
    requests: EditRequest[];
    undoneRequests: EditRequest[];
  }> {
    return model._invoke("getRequests", []);
  }

  async setRequests(
    model: FragmentsModel,
    data: {
      requests?: EditRequest[];
      undoneRequests?: EditRequest[];
    },
  ) {
    return model._invoke("setRequests", [data]);
  }

  async selectRequest(model: FragmentsModel, index: number) {
    return model._invoke("selectRequest", [index]);
  }

  // Geometries reach the main thread as copies without their prototypes, so
  // their transform is no longer a THREE.Matrix4.
  static restoreTransforms(geometries: Cloned<MeshData>[]): MeshData[] {
    return geometries.map((geometry) => ({
      ...geometry,
      transform: new THREE.Matrix4().fromArray(geometry.transform.elements),
    }));
  }
}
