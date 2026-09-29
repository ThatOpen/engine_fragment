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
    return model._invoke("getBuffer", [raw]);
  }

  async getCategories(model: FragmentsModel) {
    return model._invoke("getCategories");
  }

  async getIndexNames(model: FragmentsModel) {
    return model._invoke("getIndexNames");
  }

  async getIndexInfo(
    model: FragmentsModel,
    name: string,
  ): Promise<IndexInfo | null> {
    return model._invoke("getIndexInfo", [name]);
  }

  // The type parameters of the index methods are the caller's word for the
  // types of an index's keys and values, which the worker takes on trust as
  // well, so their results are cast to them.

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
    return model._invoke("hasIndexEntry", [name, key]);
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
    return model._invoke("getMaxLocalId");
  }

  async getLocalIdsByGuids(model: FragmentsModel, guids: string[]) {
    return model._invoke("getLocalIdsByGuids", [guids]);
  }

  async getLocalIdsFromItemIds(
    model: FragmentsModel,
    itemIds: Iterable<number>,
  ) {
    return model._invoke("getLocalIdsFromItemIds", [itemIds]);
  }

  async getSpatialStructure(model: FragmentsModel): Promise<SpatialTreeItem> {
    return model._invoke("getSpatialStructure");
  }

  async getItemsWithGeometry(model: FragmentsModel) {
    const localIds = await model._invoke("getItemsWithGeometry", []);
    const items = localIds.map((id) => model.getItem(id));
    return items;
  }

  async getItemsWithGeometryCategories(model: FragmentsModel) {
    return model._invoke("getItemsWithGeometryCategories", []);
  }

  async getItemsIdsWithGeometry(model: FragmentsModel) {
    return model._invoke("getItemsWithGeometry", []);
  }

  async getItemDrawChunks(
    model: FragmentsModel,
    localIds: Iterable<number>,
  ): Promise<
    Array<{ tileId: number; position: Uint32Array; size: Uint32Array }>
  > {
    return model._invoke("getItemDrawChunks", [localIds]);
  }

  async getItemsOfCategories(
    model: FragmentsModel,
    categories: RegExp[],
  ): Promise<{ [category: string]: number[] }> {
    return model._invoke("getItemsOfCategories", [categories]);
  }

  async getItemsByQuery(
    model: FragmentsModel,
    params: ItemsQueryParams,
    config?: ItemsQueryConfig,
  ) {
    const localIds = await model._invoke("getItemsByQuery", [params, config]);
    return localIds;
  }

  async getMetadata<T extends Record<string, any> = Record<string, any>>(
    model: FragmentsModel,
  ) {
    // T is the caller's word for the shape of the metadata.
    return model._invoke("getMetadata", []) as Promise<T>;
  }

  async getCRS(model: FragmentsModel): Promise<CRSData | null> {
    return model._invoke("getCRS", []);
  }

  async getGuidsByLocalIds(model: FragmentsModel, localIds: number[]) {
    return model._invoke("getGuidsByLocalIds", [localIds]);
  }

  private deleteAllTiles(model: FragmentsModel) {
    for (const [tileId] of model.tiles) {
      model.tiles.delete(tileId);
    }
  }
}
