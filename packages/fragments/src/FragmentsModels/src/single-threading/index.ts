import * as THREE from "three";
import pako from "pako";
import {
  CurrentLod,
  Identifier,
  ItemsDataConfig,
  ItemsQueryConfig,
  ItemsQueryParams,
} from "../model";
import { VirtualFragmentsModel } from "../virtual-model/virtual-fragments-model";

/**
 * The main class for managing a 3D model loaded from a fragments file in a single thread. It's designed for easy data querying in the backend, so all the 3D visualization logic is not present.
 */
export class SingleThreadedFragmentsModel {
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
   */
  constructor(modelId: string, modelData: Uint8Array, raw = false) {
    this._modelId = modelId;

    let data = modelData;
    if (!raw) {
      data = pako.inflate(modelData);
    }

    this._virtualModel = new VirtualFragmentsModel(
      modelId,
      data as any,
      undefined as any,
    );
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
   * Get all the categories of the model.
   */
  getCategories() {
    return this._virtualModel.getCategories();
  }

  /**
   * Get all the items of the model that have geometry.
   */
  getItemsWithGeometry() {
    return this._virtualModel.getItemsWithGeometry();
  }

  /**
   * Get the metadata of the model.
   */
  getMetadata<T extends Record<string, any> = Record<string, any>>() {
    return this._virtualModel.getMetadata() as T;
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
    this._virtualModel.getItemsChildren(ids);
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
  getPositions(localIds: number[]) {
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
  async getSection(plane: THREE.Plane, localIds?: number[]) {
    return this._virtualModel.getSection(plane, localIds);
  }

  /**
   * Get all the local IDs of the model.
   */
  async getLocalIds() {
    return this._virtualModel.getLocalIds();
  }

  /**
   * Gets all the materials IDs of the model.
   */
  async getMaterialsIds() {
    return this._virtualModel.getMaterialsIds();
  }

  /**
   * Gets the materials of the model.
   * @param localIds - The local IDs of the materials to get. If undefined, it will return all materials.
   */
  async getMaterials(localIds?: Iterable<number>) {
    return this._virtualModel.getMaterials(localIds);
  }

  /**
   * Gets all the representations IDs of the model.
   */
  async getRepresentationsIds() {
    return this._virtualModel.getRepresentationsIds();
  }

  /**
   * Gets the representations of the model.
   * @param localIds - The local IDs of the representations to get. If undefined, it will return all representations.
   */
  async getRepresentations(localIds?: Iterable<number>) {
    return this._virtualModel.getRepresentations(localIds);
  }

  /**
   * Gets all the local transforms IDs of the model.
   */
  async getLocalTransformsIds() {
    return this._virtualModel.getLocalTransformsIds();
  }

  /**
   * Gets the local transforms of the model.
   * @param localIds - The local IDs of the local transforms to get. If undefined, it will return all local transforms.
   */
  async getLocalTransforms(localIds?: Iterable<number>) {
    return this._virtualModel.getLocalTransforms(localIds);
  }

  /**
   * Gets all the global transforms IDs of the model.
   */
  async getGlobalTransformsIds() {
    return this._virtualModel.getGlobalTransformsIds();
  }

  /**
   * Gets the global transforms of the model.
   * @param localIds - The local IDs of the global transforms to get. If undefined, it will return all global transforms.
   */
  async getGlobalTransforms(localIds?: Iterable<number>) {
    return this._virtualModel.getGlobalTransforms(localIds);
  }

  /**
   * Gets all the samples IDs of the model.
   */
  async getSamplesIds() {
    return this._virtualModel.getSamplesIds();
  }

  /**
   * Gets the samples of the model.
   * @param localIds - The local IDs of the samples to get. If undefined, it will return all samples.
   */
  async getSamples(localIds?: Iterable<number>) {
    return this._virtualModel.getSamples(localIds);
  }

  /**
   * Gets all the items IDs of the model.
   */
  async getItemsIds() {
    return this._virtualModel.getItemsIds();
  }

  /**
   * Gets the items of the model.
   * @param localIds - The local IDs of the items to get. If undefined, it will return all items.
   */
  async getItems(localIds?: Iterable<number>) {
    return this._virtualModel.getItems(localIds);
  }

  /**
   * Gets the relations of the model.
   * @param localIds - The local IDs of the relations to get. If undefined, it will return all relations.
   */
  async getRelations(localIds?: number[]) {
    return this._virtualModel.getRelations(localIds);
  }

  /**
   * Gets the global transforms IDs of the items of the model.
   * @param ids - The local IDs of the items to get the global transforms IDs of.
   */
  async getGlobalTranformsIdsOfItems(ids: number[]) {
    return this._virtualModel.getGlobalTranformsIdsOfItems(ids);
  }
}
