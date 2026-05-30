import pako from "pako";
import * as THREE from "three";
import { EditRequest } from "../../../Utils";
import {
  CurrentLod,
  Identifier,
  IndexEntry,
  ItemsDataConfig,
  ItemsQueryConfig,
  ItemsQueryParams,
} from "../model";
import { IFragmentsModel } from "../model/fragments-model-interface";
import { isRawBuffer } from "../utils/misc/buffer";
import { VirtualFragmentsModel } from "../virtual-model/virtual-fragments-model";

/**
 * The main class for managing a 3D model loaded from a fragments file in a single thread. It's designed for easy data querying in the backend, so all the 3D visualization logic is not present.
 */
export class SingleThreadedFragmentsModel implements IFragmentsModel<false> {
  private readonly _modelId: string;
  private _virtualModel: VirtualFragmentsModel;

  /**
   * The ID of the model.
   */
  get modelId() {
    return this._modelId;
  }

  /**
   * The constructor of the fragments model.
   * @param raw - Whether `modelData` is raw (uncompressed) or deflated. If
   * omitted, it is auto-detected from the buffer (see {@link isRawBuffer}).
   */
  constructor(modelId: string, modelData: Uint8Array, raw?: boolean) {
    this._modelId = modelId;

    const isRaw = raw ?? isRawBuffer(modelData);
    let data = modelData;
    if (!isRaw) {
      data = pako.inflate(modelData);
    }

    this._virtualModel = new VirtualFragmentsModel(
      modelId,
      data as any,
      undefined as any,
    );

    this._virtualModel.setupData();
  }

  /**
   * Dispose the model. Use this when you're done with the model.
   * If you use the {@link FragmentsModels.dispose} method, this will be called automatically for all models.
   */
  dispose() {
    this._virtualModel.dispose();
    this._virtualModel = null as any;
  }

  /**
   * Get the spatial structure of the model.
   */
  getSpatialStructure() {
    return this._virtualModel.getSpatialStructure();
  }

  /**
   * Get the local IDs corresponding to the specified GUIDs.
   * @param guids - Array of GUIDs to look up.
   */
  getLocalIdsByGuids(guids: string[]) {
    return this._virtualModel.getLocalIdsByGuids(guids);
  }

  /**
   * Translate internal `itemId`s into user-facing `localId`s, preserving
   * order. See {@link VirtualFragmentsModel.getLocalIdsFromItemIds}.
   */
  getLocalIdsFromItemIds(itemIds: Iterable<number>) {
    return this._virtualModel.getLocalIdsFromItemIds(itemIds);
  }

  /**
   * Get all the categories of the model.
   */
  getCategories() {
    return this._virtualModel.getCategories();
  }

  /**
   * Get the names of every user-defined index stored on this model. See the
   * `ModelIndex` schema for the supported shapes.
   */
  getIndexNames() {
    return this._virtualModel.getIndexNames();
  }

  /**
   * Describe the shape of a named index without performing any lookups.
   * Returns `null` if no index with that name exists.
   */
  getIndexInfo(name: string) {
    return this._virtualModel.getIndexInfo(name);
  }

  /**
   * Get the keys of an index. Useful for keys-only indexes (membership tests,
   * iteration) but valid for any mode. Number keys come back as a
   * `Uint32Array`, string keys as `string[]`.
   */
  getIndexKeys<K extends string | number>(name: string) {
    return this._virtualModel.getIndexKeys<K>(name);
  }

  /**
   * Get key at given index.
   * Useful for keys-only indexes but valid for any mode.
   */
  getIndexKey<K extends string | number>(
    name: string,
    index: number,
  ): K | null {
    return this._virtualModel.getIndexKey<K>(name, index);
  }

  /**
   * Get the values of an index. Useful for inverse lookups.
   */
  getIndexValues<V extends string | number>(name: string) {
    return this._virtualModel.getIndexValues<V>(name);
  }

  /**
   * Test whether a key exists in the named index without resolving its value.
   */
  hasIndexEntry<K extends string | number>(name: string, key: K) {
    return this._virtualModel.hasIndexEntry(name, key);
  }

  /**
   * Forward lookup of a single entry in the named index. The return shape
   * depends on the index mode.
   */
  getIndexEntry<K extends string | number, V extends IndexEntry>(
    name: string,
    key: K,
  ) {
    return this._virtualModel.getIndexEntry<K, V>(name, key);
  }

  /**
   * Inverse lookup. Returns every key that maps to `value`.
   */
  getInverseIndexEntry<K extends string | number, V extends string | number>(
    name: string,
    value: K,
  ) {
    return this._virtualModel.getInverseIndexEntry<K, V>(name, value);
  }

  /**
   * Get all the items of the model that have geometry.
   */
  getItemsIdsWithGeometry() {
    return this._virtualModel.getItemsWithGeometry();
  }

  /**
   * Get the metadata of the model.
   */
  getMetadata<T extends Record<string, any> = Record<string, any>>() {
    return this._virtualModel.getMetadata() as T;
  }

  /**
   * Get the Coordinate Reference System (CRS) data of the model, if available.
   */
  getCRS() {
    return this._virtualModel.getCRS();
  }

  /**
   * Get the GUIDs corresponding to the specified local IDs.
   * @param localIds - Array of local IDs to look up.
   */
  getGuidsByLocalIds(localIds: number[]) {
    return this._virtualModel.getGuidsByLocalIds(localIds);
  }

  /**
   * Get the buffer of the model.
   * @param raw - Whether to get the raw buffer. If false, it will be compressed.
   */
  getBuffer(raw = false) {
    return this._virtualModel.getBuffer(raw);
  }

  /**
   * Get a buffer containing only the specified items and their associated geometry.
   * @param localIds - The local IDs of the items to include.
   * @param raw - Whether to get the raw buffer. If false, it will be compressed.
   */
  getSubsetBuffer(localIds: number[], raw = false) {
    return this._virtualModel.getSubsetBuffer(localIds, raw);
  }

  /**
   * Get all the items of the model that belong to the specified category.
   * @param category - The category to look up.
   */
  getItemsOfCategories(categories: RegExp[]) {
    return this._virtualModel.getItemsOfCategories(categories);
  }

  /**
   * Get the maximum local ID of the model.
   */
  getMaxLocalId() {
    return this._virtualModel.getMaxLocalId();
  }

  /**
   * Get the spatial structure children of the specified items.
   * @param ids - The IDs of the items to look up.
   */
  getItemsChildren(ids: Identifier[]) {
    return this._virtualModel.getItemsChildren(ids);
  }

  /**
   * Get all the data of the specified items.
   * @param ids - The IDs of the items to look up.
   * @param config - The configuration of the items data.
   */
  getItemsData(ids: number[], config?: Partial<ItemsDataConfig>) {
    return this._virtualModel.getItemsData(ids, config);
  }

  /**
   * Get the absolute positions of the specified items.
   * @param localIds - The local IDs of the items to look up.
   */
  getPositions(localIds?: number[]) {
    return this._virtualModel.getPositions(localIds);
  }

  /**
   * Gets coordinates of the model.
   */
  getCoordinates() {
    return this._virtualModel.getCoordinates();
  }

  /**
   * Get geometry data for the specified items.
   * @param localIds - The local IDs of the items to get geometry for.
   * @param lod - The level of detail for the geometry (optional).
   */
  getItemsGeometry(localIds: number[], lod?: CurrentLod) {
    return this._virtualModel.getItemsGeometry(localIds, lod);
  }

  /**
   * Query items based on specified parameters.
   * @param params - The query parameters.
   * @param config - Optional query configuration.
   */
  getItemsByQuery(params: ItemsQueryParams, config?: ItemsQueryConfig) {
    return this._virtualModel.getItemsByQuery(params, config);
  }

  /**
   * Gets the section (edges and fills) between the model and a given clipping plane.
   * @param plane - The plane to get the section of.
   * @param localIds - The local IDs of the items to get the section of. If undefined, it will return the section of all items.
   */
  getSection(plane: THREE.Plane, localIds?: number[]) {
    return this._virtualModel.getSection(plane, localIds);
  }

  /**
   * Get all the local IDs of the model.
   */
  getLocalIds() {
    return this._virtualModel.getLocalIds();
  }

  /**
   * Gets all the materials IDs of the model.
   */
  getMaterialsIds() {
    return this._virtualModel.getMaterialsIds();
  }

  /**
   * Gets the materials of the model.
   * @param localIds - The local IDs of the materials to get. If undefined, it will return all materials.
   */
  getMaterials(localIds?: Iterable<number>) {
    return this._virtualModel.getMaterials(localIds);
  }

  /**
   * Gets all the representations IDs of the model.
   */
  getRepresentationsIds() {
    return this._virtualModel.getRepresentationsIds();
  }

  /**
   * Gets the representations of the model.
   * @param localIds - The local IDs of the representations to get. If undefined, it will return all representations.
   */
  getRepresentations(localIds?: Iterable<number>) {
    return this._virtualModel.getRepresentations(localIds);
  }

  /**
   * Gets all the local transforms IDs of the model.
   */
  getLocalTransformsIds() {
    return this._virtualModel.getLocalTransformsIds();
  }

  /**
   * Gets the local transforms of the model.
   * @param localIds - The local IDs of the local transforms to get. If undefined, it will return all local transforms.
   */
  getLocalTransforms(localIds?: Iterable<number>) {
    return this._virtualModel.getLocalTransforms(localIds);
  }

  /**
   * Gets all the global transforms IDs of the model.
   */
  getGlobalTransformsIds() {
    return this._virtualModel.getGlobalTransformsIds();
  }

  /**
   * Gets the global transforms of the model.
   * @param localIds - The local IDs of the global transforms to get. If undefined, it will return all global transforms.
   */
  getGlobalTransforms(localIds?: Iterable<number>) {
    return this._virtualModel.getGlobalTransforms(localIds);
  }

  /**
   * Gets all the samples IDs of the model.
   */
  getSamplesIds() {
    return this._virtualModel.getSamplesIds();
  }

  /**
   * Gets the samples of the model.
   * @param localIds - The local IDs of the samples to get. If undefined, it will return all samples.
   */
  getSamples(localIds?: Iterable<number>) {
    return this._virtualModel.getSamples(localIds);
  }

  /**
   * Returns per-tile index-buffer chunks for the given items. Used by
   * outline-style passes that share tile geometry and clip drawing to
   * just the outlined samples. See {@link VirtualFragmentsModel.getItemDrawChunks}.
   */
  getItemDrawChunks(localIds: Iterable<number>) {
    return this._virtualModel.getItemDrawChunks(localIds);
  }

  /**
   * Gets all the items IDs of the model.
   */
  getItemsIds() {
    return this._virtualModel.getItemsIds();
  }

  /**
   * Gets the items of the model.
   * @param localIds - The local IDs of the items to get. If undefined, it will return all items.
   */
  getItems(localIds?: Iterable<number>) {
    return this._virtualModel.getItems(localIds);
  }

  /**
   * Gets the relations of the model.
   * @param localIds - The local IDs of the relations to get. If undefined, it will return all relations.
   */
  getRelations(localIds?: number[]) {
    return this._virtualModel.getRelations(localIds);
  }

  /**
   * Gets the global transforms IDs of the items of the model.
   * @param ids - The local IDs of the items to get the global transforms IDs of.
   */
  getGlobalTranformsIdsOfItems(ids: number[]) {
    return this._virtualModel.getGlobalTranformsIdsOfItems(ids);
  }

  // ---------------------------------------------------------------------
  // Edit API
  //
  // These are the same edit operations exposed by the multithreaded
  // FragmentsModel / Editor, available here for Node.js environments where
  // the Worker-based pipeline isn't available. Unlike the multithreaded
  // flow, there's no separate "delta model" loaded into a scene — the
  // result of `edit()` is just the delta buffer, which you can hand back
  // to downstream tooling or persist however you want.
  // ---------------------------------------------------------------------

  /**
   * Apply a batch of edit requests. Accumulates onto this model's
   * pending-edit history; call {@link save} to flatten them into a new
   * committed buffer or {@link reset} to discard.
   * @param [raw] whether to return the raw buffer or the the result of {@link pako.deflate}. Defaults to `true`.
   * @returns The delta raw/deflated flatbuffer bytes and the local IDs assigned to
   * any newly-created items.
   */
  edit(requests: EditRequest[], raw = true) {
    return this._virtualModel.edit(requests, raw);
  }

  /** Discard all pending edits on this model. */
  reset() {
    this._virtualModel.reset();
  }

  /**
   * Flatten the current pending-edit history into a new committed buffer.
   * @param [raw] whether to return the raw buffer or the the result of {@link pako.deflate}. Defaults to `true`.
   * @returns The raw/deflated flatbuffer bytes of the updated model.
   */
  save(raw = true) {
    return this._virtualModel.save(raw);
  }

  /** Undo the last edit. */
  undo() {
    return this._virtualModel.undo();
  }

  /** Redo the last undone edit. */
  redo() {
    return this._virtualModel.redo();
  }

  /** Get the current edit history (applied requests + undone redo stack). */
  getRequests() {
    return this._virtualModel.getRequests();
  }

  /**
   * Replace the edit history with a caller-provided one. Useful for
   * restoring state from disk.
   */
  setRequests(data: {
    requests?: EditRequest[];
    undoneRequests?: EditRequest[];
  }) {
    return this._virtualModel.setRequests(data);
  }

  /** Navigate to a specific point in the edit history by index. */
  selectRequest(index: number) {
    return this._virtualModel.selectRequest(index);
  }
}
