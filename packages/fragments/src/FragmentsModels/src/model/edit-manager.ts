import { FragmentsModel } from "./fragments-model";
import * as EDIT from "../../../Utils/edit";
import { EditRequest } from "../../../Utils";
import { Element } from "../edit";
import { CurrentLod, MeshData } from "./model-types";

export class EditManager {
  async edit(model: FragmentsModel, requests: EditRequest[]) {
    return model._invoke("edit", [requests]) as Promise<{
      deltaModelBuffer: Uint8Array;
      ids: number[];
    }>;
  }

  async reset(model: FragmentsModel) {
    return model._invoke("reset", []) as Promise<void>;
  }

  async save(model: FragmentsModel): Promise<Uint8Array> {
    return model._invoke("save", []) as Promise<Uint8Array>;
  }

  async getItemsGeometry(
    model: FragmentsModel,
    localIds: number[],
    lod: CurrentLod,
  ) {
    const originalGeometries = (await model._invoke("getItemsGeometry", [
      localIds,
      lod,
    ])) as MeshData[][];

    const deltaModel = model._getDeltaModel();
    if (!deltaModel) {
      return originalGeometries;
    }

    // If there are edited geometries, return them instead of the original ones

    const deltaGeometries = (await deltaModel._invoke("getItemsGeometry", [
      localIds,
    ])) as MeshData[][];

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
    const originalGeometries = (await model._invoke("getGeometries", [
      ids,
    ])) as MeshData[];

    const deltaModel = model._getDeltaModel();
    if (!deltaModel) {
      return originalGeometries;
    }

    // If there are edited geometries, return them instead of the original ones

    const deltaGeometries = (await deltaModel._invoke("getGeometries", [
      ids,
    ])) as MeshData[];

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
    return model._invoke("getMaterialsIds", []) as Promise<number[]>;
  }

  async getMaterials(model: FragmentsModel, localIds?: Iterable<number>) {
    return model._invoke("getMaterials", [localIds]) as Promise<
      Map<number, EDIT.RawMaterial>
    >;
  }

  async getSamplesIds(model: FragmentsModel) {
    return model._invoke("getSamplesIds", []) as Promise<number[]>;
  }

  async getSamples(model: FragmentsModel, localIds?: Iterable<number>) {
    return model._invoke("getSamples", [localIds]) as Promise<
      Map<number, EDIT.RawSample>
    >;
  }

  async getRepresentationsIds(model: FragmentsModel) {
    return model._invoke("getRepresentationsIds", []) as Promise<number[]>;
  }

  async getRepresentations(model: FragmentsModel, localIds?: Iterable<number>) {
    return model._invoke("getRepresentations", [localIds]) as Promise<
      Map<number, EDIT.RawRepresentation>
    >;
  }

  async getLocalTransformsIds(model: FragmentsModel) {
    return model._invoke("getLocalTransformsIds", []) as Promise<number[]>;
  }

  async getLocalTransforms(model: FragmentsModel, localIds?: Iterable<number>) {
    return model._invoke("getLocalTransforms", [localIds]) as Promise<
      Map<number, EDIT.RawTransformData>
    >;
  }

  async getGlobalTransformsIds(model: FragmentsModel) {
    return model._invoke("getGlobalTransformsIds", []) as Promise<number[]>;
  }

  async getGlobalTransforms(
    model: FragmentsModel,
    localIds?: Iterable<number>,
  ) {
    return model._invoke("getGlobalTransforms", [localIds]) as Promise<
      Map<number, EDIT.RawGlobalTransformData>
    >;
  }

  async getItemsIds(model: FragmentsModel) {
    return model._invoke("getItemsIds", []) as Promise<number[]>;
  }

  async getItems(model: FragmentsModel, localIds?: Iterable<number>) {
    return model._invoke("getItems", [localIds]) as Promise<
      Map<number, EDIT.RawItemData>
    >;
  }

  async getRelations(model: FragmentsModel, localIds?: number[]) {
    return model._invoke("getRelations", [localIds]) as Promise<
      Map<number, EDIT.RawRelationData>
    >;
  }

  async getGlobalTranformsIdsOfItems(model: FragmentsModel, ids: number[]) {
    const items = (await model._invoke("getGlobalTranformsIdsOfItems", [
      ids,
    ])) as number[];
    // this.applyActions(editor, model, items, "ITEM");
    return items;
  }

  async getEditedElements(model: FragmentsModel) {
    const deltaModel = model._getDeltaModel();
    if (!deltaModel) {
      return [];
    }
    return deltaModel._invoke("getItemsWithGeometry", []) as Promise<number[]>;
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
  async getItemSnapData(model: FragmentsModel, itemId: number) {
    return model._invoke("getItemSnapData", [
      itemId,
    ]) as Promise<EDIT.ElementData | null>;
  }

  async getElements(model: FragmentsModel, localIds: Iterable<number>) {
    const itemsData = (await model._invoke("getElementsData", [localIds])) as {
      [id: number]: EDIT.ElementData;
    };

    // Update meshes data, just get them from delta model
    const deltaModel = model._getDeltaModel();
    if (deltaModel) {
      const updatedItems = (await deltaModel._invoke("getElementsData", [
        localIds,
      ])) as { [id: number]: EDIT.ElementData };

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

  async getRequests(model: FragmentsModel) {
    return model._invoke("getRequests", []) as Promise<{
      requests: EditRequest[];
      undoneRequests: EditRequest[];
    }>;
  }

  async setRequests(
    model: FragmentsModel,
    data: {
      requests?: EditRequest[];
      undoneRequests?: EditRequest[];
    },
  ) {
    return model._invoke("setRequests", [data]) as Promise<void>;
  }

  async selectRequest(model: FragmentsModel, index: number) {
    return model._invoke("selectRequest", [index]) as Promise<void>;
  }
}
