import pako from "pako";
import { Identifier, ItemsDataConfig } from "../model";
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
}
