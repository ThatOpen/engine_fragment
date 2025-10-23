import { FragmentsModel } from "./fragments-model";
import * as EDIT from "../../../Utils/edit";
import { EditRequest } from "../../../Utils";
import { Element } from "../edit";
import { CurrentLod, MeshData } from "./model-types";

export class EditManager {
  async edit(model: FragmentsModel, requests: EditRequest[]) {
    return model.threads.invoke(model.modelId, "edit", [requests]) as Promise<{
      deltaModelBuffer: Uint8Array;
      ids: number[];
    }>;
  }

  async reset(model: FragmentsModel) {
    return model.threads.invoke(model.modelId, "reset", []) as Promise<void>;
  }

  async save(model: FragmentsModel): Promise<Uint8Array> {
    return model.threads.invoke(
      model.modelId,
      "save",
      [],
    ) as Promise<Uint8Array>;
  }

  async getItemsGeometry(
    model: FragmentsModel,
    localIds: number[],
    lod: CurrentLod,
  ) {
    const originalGeometries = (await model.threads.invoke(
      model.modelId,
      "getItemsGeometry",
      [localIds, lod],
    )) as MeshData[][];

    const deltaModelId = model.deltaModelId;
    if (!deltaModelId) {
      return originalGeometries;
    }

    // If there are edited geometries, return them instead of the original ones

    const deltaGeometries = (await model.threads.invoke(
      deltaModelId,
      "getItemsGeometry",
      [localIds],
    )) as MeshData[][];

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
    const originalGeometries = (await model.threads.invoke(
      model.modelId,
      "getGeometries",
      [ids],
    )) as MeshData[];

    const deltaModelId = model.deltaModelId;
    if (!deltaModelId) {
      return originalGeometries;
    }

    // If there are edited geometries, return them instead of the original ones

    const deltaGeometries = (await model.threads.invoke(
      deltaModelId,
      "getGeometries",
      [ids],
    )) as MeshData[];

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
    return model.threads.invoke(
      model.modelId,
      "getMaterialsIds",
      [],
    ) as Promise<number[]>;
  }

  async getMaterials(model: FragmentsModel, localIds?: Iterable<number>) {
    return model.threads.invoke(model.modelId, "getMaterials", [
      localIds,
    ]) as Promise<Map<number, EDIT.RawMaterial>>;
  }

  async getSamplesIds(model: FragmentsModel) {
    return model.threads.invoke(model.modelId, "getSamplesIds", []) as Promise<
      number[]
    >;
  }

  async getSamples(model: FragmentsModel, localIds?: Iterable<number>) {
    return model.threads.invoke(model.modelId, "getSamples", [
      localIds,
    ]) as Promise<Map<number, EDIT.RawSample>>;
  }

  async getRepresentationsIds(model: FragmentsModel) {
    return model.threads.invoke(
      model.modelId,
      "getRepresentationsIds",
      [],
    ) as Promise<number[]>;
  }

  async getRepresentations(model: FragmentsModel, localIds?: Iterable<number>) {
    return model.threads.invoke(model.modelId, "getRepresentations", [
      localIds,
    ]) as Promise<Map<number, EDIT.RawRepresentation>>;
  }

  async getLocalTransformsIds(model: FragmentsModel) {
    return model.threads.invoke(
      model.modelId,
      "getLocalTransformsIds",
      [],
    ) as Promise<number[]>;
  }

  async getLocalTransforms(model: FragmentsModel, localIds?: Iterable<number>) {
    return model.threads.invoke(model.modelId, "getLocalTransforms", [
      localIds,
    ]) as Promise<Map<number, EDIT.RawTransformData>>;
  }

  async getGlobalTransformsIds(model: FragmentsModel) {
    return model.threads.invoke(
      model.modelId,
      "getGlobalTransformsIds",
      [],
    ) as Promise<number[]>;
  }

  async getGlobalTransforms(
    model: FragmentsModel,
    localIds?: Iterable<number>,
  ) {
    return model.threads.invoke(model.modelId, "getGlobalTransforms", [
      localIds,
    ]) as Promise<Map<number, EDIT.RawGlobalTransformData>>;
  }

  async getItemsIds(model: FragmentsModel) {
    return model.threads.invoke(model.modelId, "getItemsIds", []) as Promise<
      number[]
    >;
  }

  async getItems(model: FragmentsModel, localIds?: Iterable<number>) {
    return model.threads.invoke(model.modelId, "getItems", [
      localIds,
    ]) as Promise<Map<number, EDIT.RawItemData>>;
  }

  async getRelations(model: FragmentsModel, localIds?: number[]) {
    return model.threads.invoke(model.modelId, "getRelations", [
      localIds,
    ]) as Promise<Map<number, EDIT.RawRelationData>>;
  }

  async getGlobalTranformsIdsOfItems(model: FragmentsModel, ids: number[]) {
    const items = (await model.threads.invoke(
      model.modelId,
      "getGlobalTranformsIdsOfItems",
      [ids],
    )) as number[];
    // this.applyActions(editor, model, items, "ITEM");
    return items;
  }

  async getEditedElements(model: FragmentsModel) {
    if (!model.deltaModelId) {
      return [];
    }
    return model.threads.invoke(
      model.deltaModelId,
      "getItemsWithGeometry",
      [],
    ) as Promise<number[]>;
  }

  async getElements(model: FragmentsModel, localIds: Iterable<number>) {
    const itemsData = (await model.threads.invoke(
      model.modelId,
      "getElementsData",
      [localIds],
    )) as { [id: number]: EDIT.ElementData };

    // Update meshes data, just get them from delta model
    if (model.deltaModelId) {
      const updatedItems = (await model.threads.invoke(
        model.deltaModelId,
        "getElementsData",
        [localIds],
      )) as { [id: number]: EDIT.ElementData };

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
    return model.threads.invoke(model.modelId, "getRequests", []) as Promise<{
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
    return model.threads.invoke(model.modelId, "setRequests", [
      data,
    ]) as Promise<void>;
  }

  async selectRequest(model: FragmentsModel, index: number) {
    return model.threads.invoke(model.modelId, "selectRequest", [
      index,
    ]) as Promise<void>;
  }
}
