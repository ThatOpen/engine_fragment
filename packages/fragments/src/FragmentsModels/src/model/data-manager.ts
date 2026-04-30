import {
  CRSData,
  MultiThreadingRequestClass,
  ItemsQueryParams,
  SpatialTreeItem,
  ItemsQueryConfig,
  IndexEntry,
  IndexInfo,
  InverseIndexEntry,
} from "./model-types";
import { AlignmentsManager } from "./alignments-manager";
import { FragmentsModel } from "./fragments-model";
import { MeshManager } from "./mesh-manager";
import { GridsManager } from "./grids-manager";

export class DataManager {
  async dispose(
    model: FragmentsModel,
    meshes: MeshManager,
    alignments: AlignmentsManager,
    grids: GridsManager,
  ) {
    meshes.list.delete(model.modelId);
    await this.requestModelDelete(model);
    model.threads.delete(model.modelId);
    model.object.removeFromParent();
    this.deleteAllTiles(model);
    meshes.materials.dispose(model.modelId);
    alignments.dispose();
    grids.dispose();
  }

  async getBuffer(model: FragmentsModel, raw: boolean) {
    return model.threads.invoke(model.modelId, "getBuffer", [
      raw,
    ]) as Promise<ArrayBuffer>;
  }

  async getCategories(model: FragmentsModel) {
    return model.threads.invoke(model.modelId, "getCategories") as Promise<
      string[]
    >;
  }

  async getIndexNames(model: FragmentsModel) {
    return model.threads.invoke(model.modelId, "getIndexNames") as Promise<
      string[]
    >;
  }

  async getIndexInfo(model: FragmentsModel, name: string) {
    return model.threads.invoke(model.modelId, "getIndexInfo", [
      name,
    ]) as Promise<IndexInfo | null>;
  }

  async getIndexKeys(model: FragmentsModel, name: string) {
    return model.threads.invoke(model.modelId, "getIndexKeys", [
      name,
    ]) as Promise<Uint32Array | string[] | null>;
  }

  async hasIndexEntry(
    model: FragmentsModel,
    name: string,
    key: string | number,
  ) {
    return model.threads.invoke(model.modelId, "hasIndexEntry", [
      name,
      key,
    ]) as Promise<boolean>;
  }

  async getIndexEntry(
    model: FragmentsModel,
    name: string,
    key: string | number,
  ) {
    return model.threads.invoke(model.modelId, "getIndexEntry", [
      name,
      key,
    ]) as Promise<IndexEntry>;
  }

  async getInverseIndexEntry(
    model: FragmentsModel,
    name: string,
    value: string | number,
  ) {
    return model.threads.invoke(model.modelId, "getInverseIndexEntry", [
      name,
      value,
    ]) as Promise<InverseIndexEntry>;
  }

  async getMaxLocalId(model: FragmentsModel) {
    return model.threads.invoke(
      model.modelId,
      "getMaxLocalId",
    ) as Promise<number>;
  }

  async getLocalIdsByGuids(model: FragmentsModel, guids: string[]) {
    return model.threads.invoke(model.modelId, "getLocalIdsByGuids", [
      guids,
    ]) as Promise<(number | null)[]>;
  }

  async getSpatialStructure(model: FragmentsModel) {
    return model.threads.invoke(
      model.modelId,
      "getSpatialStructure",
    ) as Promise<SpatialTreeItem>;
  }

  async getItemsWithGeometry(model: FragmentsModel) {
    const localIds = (await model.threads.invoke(
      model.modelId,
      "getItemsWithGeometry",
      [],
    )) as number[];
    const items = localIds.map((id) => model.getItem(id));
    return items;
  }

  async getItemsWithGeometryCategories(model: FragmentsModel) {
    return model.threads.invoke(
      model.modelId,
      "getItemsWithGeometryCategories",
      [],
    ) as Promise<(string | null)[]>;
  }

  async getItemsIdsWithGeometry(model: FragmentsModel) {
    return model.threads.invoke(
      model.modelId,
      "getItemsWithGeometry",
      [],
    ) as Promise<number[]>;
  }

  async getItemDrawChunks(
    model: FragmentsModel,
    localIds: Iterable<number>,
  ): Promise<
    Array<{ tileId: number; position: Uint32Array; size: Uint32Array }>
  > {
    return model.threads.invoke(model.modelId, "getItemDrawChunks", [
      localIds,
    ]) as Promise<
      Array<{ tileId: number; position: Uint32Array; size: Uint32Array }>
    >;
  }

  async getItemsOfCategories(model: FragmentsModel, categories: RegExp[]) {
    const args = [categories];
    const data = (await model.threads.invoke(
      model.modelId,
      "getItemsOfCategories",
      args,
    )) as { [category: string]: number[] };
    return data;
  }

  async getItemsByQuery(
    model: FragmentsModel,
    params: ItemsQueryParams,
    config?: ItemsQueryConfig,
  ) {
    const args = [params, config];
    const localIds = (await model.threads.invoke(
      model.modelId,
      "getItemsByQuery",
      args,
    )) as number[];
    return localIds;
  }

  async getMetadata<T extends Record<string, any> = Record<string, any>>(
    model: FragmentsModel,
  ) {
    return model.threads.invoke(model.modelId, "getMetadata", []) as Promise<T>;
  }

  async getCRS(model: FragmentsModel) {
    return model.threads.invoke(
      model.modelId,
      "getCRS",
      [],
    ) as Promise<CRSData | null>;
  }

  async getGuidsByLocalIds(model: FragmentsModel, localIds: number[]) {
    return model.threads.invoke(model.modelId, "getGuidsByLocalIds", [
      localIds,
    ]) as Promise<(string | null)[]>;
  }

  private async requestModelDelete(model: FragmentsModel) {
    await model.threads.fetch({
      class: MultiThreadingRequestClass.DELETE_MODEL,
      modelId: model.modelId,
    });
  }

  private deleteAllTiles(model: FragmentsModel) {
    for (const [tileId] of model.tiles) {
      model.tiles.delete(tileId);
    }
  }
}
