import {
  CRSData,
  ItemsQueryParams,
  SpatialTreeItem,
  ItemsQueryConfig,
  IndexEntry,
  IndexInfo,
  IndexArrayType,
} from "./model-types";
import { AlignmentsManager } from "./alignments-manager";
import { FragmentsModel } from "./fragments-model";
import { MeshManager } from "./mesh-manager";
import { GridsManager } from "./grids-manager";

export class DataManager {
  /**
   * Everything on the main thread happens before this returns; the returned
   * promise resolves once the worker has deleted the model too.
   */
  dispose(
    model: FragmentsModel,
    meshes: MeshManager,
    alignments: AlignmentsManager,
    grids: GridsManager,
    options?: { keepInScene?: boolean },
  ) {
    meshes._remove(model);
    const deleted = model.threads.delete(model._uid);
    // Otherwise the outgoing tiles keep rendering until `finalizeDispose`
    // runs. Materials are keyed by uid, so a replacement model registers its
    // own next to them.
    if (!options?.keepInScene) {
      this.disposeScene({ model, meshes, alignments, grids });
    }
    return deleted;
  }

  /**
   * Takes the model out of the scene and frees its tiles, materials,
   * alignments and grids.
   */
  disposeScene({
    model,
    meshes,
    alignments,
    grids,
  }: {
    model: FragmentsModel;
    meshes: MeshManager;
    alignments: AlignmentsManager;
    grids: GridsManager;
  }) {
    model.object.removeFromParent();
    this.deleteAllTiles(model);
    meshes.materials.dispose(model._uid);
    alignments.dispose();
    grids.dispose();
  }

  async getBuffer(model: FragmentsModel, raw: boolean) {
    return model._invoke("getBuffer", [raw]) as Promise<ArrayBuffer>;
  }

  async getCategories(model: FragmentsModel) {
    return model._invoke("getCategories") as Promise<string[]>;
  }

  async getIndexNames(model: FragmentsModel) {
    return model._invoke("getIndexNames") as Promise<string[]>;
  }

  async getIndexInfo(model: FragmentsModel, name: string) {
    return model._invoke("getIndexInfo", [name]) as Promise<IndexInfo | null>;
  }

  async getIndexKeys<K extends string | number>(
    model: FragmentsModel,
    name: string,
  ) {
    return model._invoke("getIndexKeys", [
      name,
    ]) as Promise<IndexArrayType<K> | null>;
  }

  async getIndexKey<K extends string | number>(
    model: FragmentsModel,
    name: string,
    index: number,
  ) {
    return model._invoke("getIndexKey", [name, index]) as Promise<K | null>;
  }

  async getIndexValues<V extends string | number>(
    model: FragmentsModel,
    name: string,
  ) {
    return model._invoke("getIndexValues", [name]) as Promise<V[] | null>;
  }

  async hasIndexEntry<K extends string | number>(
    model: FragmentsModel,
    name: string,
    key: K,
  ) {
    return model._invoke("hasIndexEntry", [name, key]) as Promise<boolean>;
  }

  async getIndexEntry<K extends string | number, V extends IndexEntry>(
    model: FragmentsModel,
    name: string,
    key: K,
  ) {
    return model._invoke("getIndexEntry", [name, key]) as Promise<V | null>;
  }

  async getInverseIndexEntry<
    K extends string | number,
    V extends string | number,
  >(model: FragmentsModel, name: string, value: K) {
    return model._invoke("getInverseIndexEntry", [
      name,
      value,
    ]) as Promise<IndexArrayType<V> | null>;
  }

  async getMaxLocalId(model: FragmentsModel) {
    return model._invoke("getMaxLocalId") as Promise<number>;
  }

  async getLocalIdsByGuids(model: FragmentsModel, guids: string[]) {
    return model._invoke("getLocalIdsByGuids", [guids]) as Promise<
      (number | null)[]
    >;
  }

  async getLocalIdsFromItemIds(
    model: FragmentsModel,
    itemIds: Iterable<number>,
  ) {
    return model._invoke("getLocalIdsFromItemIds", [itemIds]) as Promise<
      number[]
    >;
  }

  async getSpatialStructure(model: FragmentsModel) {
    return model._invoke("getSpatialStructure") as Promise<SpatialTreeItem>;
  }

  async getItemsWithGeometry(model: FragmentsModel) {
    const localIds = (await model._invoke(
      "getItemsWithGeometry",
      [],
    )) as number[];
    const items = localIds.map((id) => model.getItem(id));
    return items;
  }

  async getItemsWithGeometryCategories(model: FragmentsModel) {
    return model._invoke("getItemsWithGeometryCategories", []) as Promise<
      (string | null)[]
    >;
  }

  async getItemsIdsWithGeometry(model: FragmentsModel) {
    return model._invoke("getItemsWithGeometry", []) as Promise<number[]>;
  }

  async getItemDrawChunks(
    model: FragmentsModel,
    localIds: Iterable<number>,
  ): Promise<
    Array<{ tileId: number; position: Uint32Array; size: Uint32Array }>
  > {
    return model._invoke("getItemDrawChunks", [localIds]) as Promise<
      Array<{ tileId: number; position: Uint32Array; size: Uint32Array }>
    >;
  }

  async getItemsOfCategories(model: FragmentsModel, categories: RegExp[]) {
    const data = (await model._invoke("getItemsOfCategories", [
      categories,
    ])) as {
      [category: string]: number[];
    };
    return data;
  }

  async getItemsByQuery(
    model: FragmentsModel,
    params: ItemsQueryParams,
    config?: ItemsQueryConfig,
  ) {
    const localIds = (await model._invoke("getItemsByQuery", [
      params,
      config,
    ])) as number[];
    return localIds;
  }

  async getMetadata<T extends Record<string, any> = Record<string, any>>(
    model: FragmentsModel,
  ) {
    return model._invoke("getMetadata", []) as Promise<T>;
  }

  async getCRS(model: FragmentsModel) {
    return model._invoke("getCRS", []) as Promise<CRSData | null>;
  }

  async getGuidsByLocalIds(model: FragmentsModel, localIds: number[]) {
    return model._invoke("getGuidsByLocalIds", [localIds]) as Promise<
      (string | null)[]
    >;
  }

  private deleteAllTiles(model: FragmentsModel) {
    for (const [tileId] of model.tiles) {
      model.tiles.delete(tileId);
    }
  }
}
