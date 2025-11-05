import * as THREE from "three";
import {
  BIMMesh,
  MaterialDefinition,
  ItemsDataConfig,
  RectangleRaycastData,
  RaycastData,
  SnappingRaycastData,
  VirtualModelConfig,
  ItemSelectionType,
  ItemInformationType,
  SelectionInputType,
  ResultInputType,
  AttrsChange,
  Identifier,
  RelsChange,
  ItemsQueryParams,
  AttributesUniqueValuesParams,
  CurrentLod,
  ItemsQueryConfig,
} from "./model-types";

import { MiscHelper } from "../utils";
import { FragmentsConnection } from "../multithreading/fragments-connection";
import { MeshManager } from "./mesh-manager";

import { AlignmentsManager } from "./alignments-manager";
import { DataMap, EditRequest } from "../../../Utils";
import { SetupManager } from "./setup-manager";
import { BoxManager } from "./box-manager";
import { CoordinatesManager } from "./coordinates-manager";
import { ItemsManager } from "./items-manager";
import { ViewManager } from "./view-manager";
import { RaycastManager } from "./raycast-manager";
import { VisibilityManager } from "./visibility-manager";
import { HighlightManager } from "./highlight-manager";
import { SectionManager } from "./section-manager";
import { DataManager } from "./data-manager";
import { SequenceManager } from "./sequence-manager";
import { EditManager } from "./edit-manager";
import { Editor } from "../edit";

/**
 * The main class for managing a 3D model loaded from a fragments file. Handles geometry, materials, visibility, highlighting, sections, and more. This class orchestrates multiple specialized managers to handle different aspects of the model like mesh management, item data, raycasting, etc. It maintains the overall state and provides the main interface for interacting with the model. The model data is loaded and processed asynchronously across multiple threads.
 */
export class FragmentsModel {
  /**
   * A map of attribute changes that have occurred in the model.
   * The key is the local ID of the item, and the value is the change.
   */
  readonly attrsChanges = new Map<number, AttrsChange>();

  /**
   * A map of relation changes that have occurred in the model.
   * The key is the local ID of the item, and the value is the change.
   */
  readonly relsChanges = new Map<number, RelsChange>();

  /**
   * The connection to the threads that handle the model data.
   */
  readonly threads: FragmentsConnection;

  /**
   * A map of tiles that have been loaded for the model.
   * The key is the tile ID, and the value is the tile.
   */
  readonly tiles = new DataMap<string | number, BIMMesh>();

  /**
   * The object that represents the model in the Three.js scene.
   */
  object = new THREE.Object3D();

  /**
   * The graphics quality of the model. It ranges from 0 (lowest) to 1 (highest).
   */
  graphicsQuality = 0;

  deltaModelId: string | null = null;

  private readonly _boxManager = new BoxManager();
  private readonly _itemsManager = new ItemsManager();
  private readonly _coordinatesManager = new CoordinatesManager();
  private readonly _setupManager = new SetupManager();
  private readonly _viewManager = new ViewManager();
  private readonly _raycastManager = new RaycastManager();
  private readonly _visibilityManager = new VisibilityManager();
  private readonly _highlightManager = new HighlightManager();
  private readonly _sectionManager = new SectionManager();
  private readonly _dataManager = new DataManager();
  private readonly _sequenceManager = new SequenceManager();
  private readonly _bbox = new THREE.Box3();
  private readonly _alignmentsManager: AlignmentsManager;
  private readonly _meshManager: MeshManager;
  private readonly _editManager = new EditManager();
  private readonly _editor: Editor;

  private _isProcessing = false;
  private _isLoaded = false;
  private _frozen = false;
  private _isSetup = false;

  private static _deltaModelId = "isDeltaModel";
  private _parentModelId: string | null = null;

  /**
   * The ID of the model.
   */
  get modelId() {
    return this.object.name;
  }

  /**
   * The bounding box of the whole model.
   */
  get box() {
    return this._bbox.clone().applyMatrix4(this.object.matrixWorld);
  }

  /**
   * Whether the model is busy loading data.
   */
  get isBusy() {
    const arePendingRequests = this._meshManager.requests.arePending;
    return !this._isLoaded || this._isProcessing || arePendingRequests;
  }

  /**
   * Whether the model should stop updating..
   */
  get frozen() {
    return Boolean(this._frozen);
  }

  /**
   * Whether the model should stop updating..
   */
  set frozen(value: boolean) {
    if (value === this._frozen) return;
    this._frozen = value;
    if (value) return;
    this._refreshView();
  }

  /**
   * The event that is triggered when the clipping planes are needed in the thread.
   * Set this method to pass your Three.js clipping planes to the model.
   */
  get getClippingPlanesEvent() {
    return this._viewManager.getClippingPlanesEvent;
  }

  /**
   * The event that is triggered when the clipping planes are needed in the thread.
   * Set this method to pass your Three.js clipping planes to the model.
   */
  set getClippingPlanesEvent(value: () => THREE.Plane[]) {
    this._viewManager.getClippingPlanesEvent = value;
  }

  get camera() {
    return this._viewManager.currentCamera;
  }

  get isDeltaModel() {
    return this.object.userData[FragmentsModel._deltaModelId];
  }

  get parentModelId() {
    return this._parentModelId;
  }

  /**
   * The constructor of the fragments model. Don't use this directly. Use the {@link FragmentsModels.load} instead.
   */
  constructor(
    modelId: string,
    meshManager: MeshManager,
    threads: FragmentsConnection,
    editor: Editor,
  ) {
    this.object.name = modelId;
    this.object.up.set(0, 0, 1);
    this._meshManager = meshManager;
    this.threads = threads;
    this._editor = editor;
    this._alignmentsManager = new AlignmentsManager(this);
    this.tiles.onItemSet.add(({ value: mesh }) => this.object.add(mesh));
    this.tiles.onBeforeDelete.add(({ value: mesh }) => {
      this.object.remove(mesh);
      mesh.geometry.dispose();
      MiscHelper.forEach(mesh.material, (mat) => mat.dispose());
    });
  }

  /**
   * Dispose the model. Use this when you're done with the model.
   * If you use the {@link FragmentsModels.dispose} method, this will be called automatically for all models.
   */
  async dispose() {
    this._isLoaded = false;
    await this._dataManager.dispose(
      this,
      this._meshManager,
      this._alignmentsManager,
    );
  }

  /**
   * Get the spatial structure of the model.
   */
  async getSpatialStructure() {
    return this._dataManager.getSpatialStructure(this);
  }

  /**
   * Get the local IDs corresponding to the specified GUIDs.
   * @param guids - Array of GUIDs to look up.
   */
  async getLocalIdsByGuids(guids: string[]) {
    return this._dataManager.getLocalIdsByGuids(this, guids);
  }

  /**
   * Get all the categories of the model.
   */
  async getCategories() {
    return this._dataManager.getCategories(this);
  }

  async getItemsWithGeometryCategories() {
    return this._dataManager.getItemsWithGeometryCategories(this);
  }

  /**
   * Get all the items of the model that have geometry.
   */
  async getItemsWithGeometry() {
    return this._dataManager.getItemsWithGeometry(this);
  }

  /**
   * Get all the items ids of the model that have geometry.
   */
  async getItemsIdsWithGeometry() {
    return this._dataManager.getItemsIdsWithGeometry(this);
  }

  /**
   * Get the metadata of the model.
   */
  async getMetadata<T extends Record<string, any> = Record<string, any>>() {
    return this._dataManager.getMetadata<T>(this);
  }

  /**
   * Get the GUIDs corresponding to the specified local IDs.
   * @param localIds - Array of local IDs to look up.
   */
  async getGuidsByLocalIds(localIds: number[]) {
    return this._dataManager.getGuidsByLocalIds(this, localIds);
  }

  /**
   * Get the buffer of the model.
   * @param raw - Whether to get the raw buffer. If false, it will be compressed.
   */
  async getBuffer(raw = false) {
    return this._dataManager.getBuffer(this, raw);
  }

  /**
   * Get all the items of the model that belong to the specified category.
   * @param category - The category to look up.
   */
  async getItemsOfCategories(categories: RegExp[]) {
    return this._dataManager.getItemsOfCategories(this, categories);
  }

  async getGuids() {
    const guids = (await this.threads.invoke(
      this.modelId,
      "getGuids",
      [],
    )) as string[];
    return guids;
  }

  async getLocalIds() {
    const localIds = (await this.threads.invoke(
      this.modelId,
      "getLocalIds",
      [],
    )) as number[];
    return localIds;
  }

  /**
   * Retrieves items based on the specified query parameters.
   *
   * @param params - The query parameters used to filter and retrieve items.
   * @returns A promise that resolves to the items matching the query.
   */
  async getItemsByQuery(params: ItemsQueryParams, config?: ItemsQueryConfig) {
    return this._dataManager.getItemsByQuery(this, params, config);
  }

  // TODO: Fix, this is wrong
  async getItemsMaterialDefinition(localIds: number[]) {
    const result = (await this.threads.invoke(
      this.modelId,
      "getItemsMaterialDefinition",
      [localIds],
    )) as { definition: MaterialDefinition; localIds: number[] }[];
    return result;
  }

  /**
   * Retrieves the geometry data for the specified local IDs.
   *
   * The returned data is structured as an array of arrays of `MeshData`,
   * which contains the necessary information to reconstruct a `THREE.BufferGeometry`.
   *
   * @param localIds - An array of local IDs for which the geometry data is requested.
   */
  async getItemsGeometry(localIds: number[], lod = CurrentLod.GEOMETRY) {
    return this._editManager.getItemsGeometry(this, localIds, lod);
  }

  async getGeometries(ids: number[]) {
    return this._editManager.getGeometries(this, ids);
  }

  /**
   * Retrieves the total volume of items based on their local IDs.
   *
   * @param localIds An array of local IDs representing the items.
   * @returns A promise that resolves to the total volume of the specified items.
   */
  async getItemsVolume(localIds: number[]) {
    const volume = (await this.threads.invoke(this.modelId, "getItemsVolume", [
      localIds,
    ])) as number;
    return volume;
  }

  /**
   * Retrieves the names of all attributes associated with the model.
   *
   * @returns A promise that resolves to an array of strings, where each string is the name of an attribute.
   */
  async getAttributeNames() {
    const names = (await this.threads.invoke(
      this.modelId,
      "getAttributeNames",
      [],
    )) as string[];
    return names;
  }

  /**
   * Retrieves the attribute values associated with the model.
   *
   * @returns A promise that resolves to an array of attribute values.
   */
  async getAttributeValues() {
    const values = (await this.threads.invoke(
      this.modelId,
      "getAttributeValues",
      [],
    )) as any[];
    return values;
  }

  async getAttributesUniqueValues(params: AttributesUniqueValuesParams[]) {
    const values = (await this.threads.invoke(
      this.modelId,
      "getAttributesUniqueValues",
      [params],
    )) as Record<string, any[]>;
    return values;
  }

  /**
   * Retrieves the attribute types associated with the model.
   *
   * @returns A promise that resolves to an array of attribute types.
   */
  async getAttributeTypes() {
    const types = (await this.threads.invoke(
      this.modelId,
      "getAttributeTypes",
      [],
    )) as string[];
    return types;
  }

  /**
   * Retrieves the names of all relations associated with this model.
   *
   * @returns A promise that resolves to an array of strings, where each string is the name of a relation.
   */
  async getRelationNames() {
    const names = (await this.threads.invoke(
      this.modelId,
      "getRelationNames",
      [],
    )) as string[];
    return names;
  }

  /**
   * Get the maximum local ID of the model.
   */
  async getMaxLocalId() {
    return this._dataManager.getMaxLocalId(this);
  }

  /**
   * Get an item by its ID.
   * @param id - The ID of the item to look up.
   */
  getItem(id: Identifier) {
    return this._itemsManager.getItem(this, id);
  }

  /**
   * Get the spatial structure children of the specified items.
   * @param ids - The IDs of the items to look up.
   */
  async getItemsChildren(ids: Identifier[]) {
    return this._itemsManager.getItemsChildren(this, ids);
  }

  /**
   * Get all the data of the specified items.
   * @param ids - The IDs of the items to look up.
   * @param config - The configuration of the items data.
   */
  async getItemsData(ids: Identifier[], config?: Partial<ItemsDataConfig>) {
    return this._itemsManager.getItemsData(this, ids, config);
  }

  /**
   * Get the absolute positions of the specified items.
   * @param localIds - The local IDs of the items to look up.
   */
  async getPositions(localIds?: number[]) {
    return this._coordinatesManager.getPositions(this, localIds);
  }

  /**
   * Gets coordinates of the model.
   */
  async getCoordinates() {
    return this._coordinatesManager.getCoordinates(this);
  }

  /**
   * Retrieves the coordination matrix for the current model.
   *
   * This method utilizes the `_coordinatesManager` to compute and return a
   * `THREE.Matrix4` object based on the original model coordinates.
   */
  async getCoordinationMatrix() {
    return this._coordinatesManager.getCoordinationMatrix(this);
  }

  /**
   * Get the merged bounding box of the specified items.
   * @param localIds - The local IDs of the items to look up.
   */
  async getMergedBox(localIds: number[]) {
    return this._boxManager.getMergedBox(this, localIds);
  }

  /**
   * Get the individual bounding boxes of the specified items.
   * @param localIds - The local IDs of the items to look up.
   */
  async getBoxes(localIds?: number[]) {
    return this._boxManager.getBoxes(this, localIds);
  }

  /**
   * Get the absolute alignments of the model (if any).
   */
  async getAlignments() {
    return this._alignmentsManager.getAlignments();
  }

  /**
   * Get the horizontal alignments of the model (if any).
   */
  async getHorizontalAlignments() {
    return this._alignmentsManager.getHorizontalAlignments();
  }

  /**
   * Get the vertical alignments of the model (if any).
   */
  async getVerticalAlignments() {
    return this._alignmentsManager.getVerticalAlignments();
  }

  /**
   * Get the civil alignment styles of the model (if any).
   */
  getAlignmentStyles() {
    return this._alignmentsManager.getAlignmentStyles();
  }

  /**
   * Sets a camera for the model. The model will use it to load tiles dinamically depending on the users view
   * (e.g. hiding items that are not in the view, setting the LOD to far away items, etc).
   * @param camera - The camera to use.
   */
  useCamera(camera: THREE.PerspectiveCamera | THREE.OrthographicCamera) {
    this._viewManager.useCamera(camera);
  }

  /**
   * Performs a rectangle raycast on the model.
   * @param data - The data of the rectangle raycast.
   */
  async rectangleRaycast(data: RectangleRaycastData) {
    return this._raycastManager.rectangleRaycast(this, this._meshManager, data);
  }

  /**
   * Performs a raycast on the model.
   * @param data - The data of the raycast.
   */
  async raycast(data: RaycastData) {
    return this._raycastManager.raycast(this, data);
  }

  /**
   * Performs a raycast on the model and returns all the results.
   * @param data - The data of the raycast.
   */
  async raycastAll(data: RaycastData) {
    return this._raycastManager.raycastAll(this, data);
  }

  /**
   * Performs a raycast on the model with snapping.
   * @param data - The data of the raycast.
   */
  async raycastWithSnapping(data: SnappingRaycastData) {
    return this._raycastManager.raycastWithSnapping(this, data);
  }

  /**
   * Sets the visibility of the specified items.
   * @param localIds - The local IDs of the items to set the visibility of.
   * @param visible - Whether the items should be visible.
   */
  async setVisible(localIds: number[] | undefined, visible: boolean) {
    const args = [localIds, visible];
    await this.threads.invoke(this.modelId, "setVisible", args);
  }

  /**
   * Toggles the visibility of the specified items.
   * @param localIds - The local IDs of the items to toggle the visibility of.
   */
  async toggleVisible(localIds?: number[]) {
    const args = [localIds];
    await this.threads.invoke(this.modelId, "toggleVisible", args);
  }

  /**
   * Gets the items by visibility.
   * @param visible - Whether the items should be visible.
   */
  async getItemsByVisibility(visible: boolean) {
    return this._visibilityManager.getItemsByVisibility(this, visible);
  }

  /**
   * Gets the items by visibility.
   * @param localIds - The local IDs of the items to get the visibility of.
   */
  async getVisible(localIds: number[]) {
    return this._visibilityManager.getVisible(this, localIds);
  }

  /**
   * Resets the visibility of all items.
   */
  async resetVisible() {
    return this._visibilityManager.resetVisible(this);
  }

  /**
   * Highlights the specified items.
   * @param localIds - The local IDs of the items to highlight. If undefined, all items will be highlighted.
   * @param highlightMaterial - The material to use for the highlight.
   */
  async highlight(
    localIds: number[] | undefined,
    highlightMaterial: MaterialDefinition,
  ) {
    return this._highlightManager.highlight(this, localIds, highlightMaterial);
  }

  /**
   * Gets the highlight of the specified items.
   * @param localIds - The local IDs of the items to get the highlight of. If undefined, it will return the highlight of all items.
   */
  async getHighlight(localIds?: number[]) {
    return this._highlightManager.getHighlight(this, localIds);
  }

  /**
   * Resets the highlight of the specified items.
   * @param localIds - The local IDs of the items to reset the highlight of. If undefined, it will reset the highlight of all items.
   */
  async resetHighlight(localIds?: number[]) {
    return this._highlightManager.resetHighlight(this, localIds);
  }

  /**
   * Gets the item IDs of the items that are highlighted.
   */
  async getHighlightItemIds() {
    return this._highlightManager.getHighlightItemIds(this);
  }

  /**
   * Gets the section (edges and fills) between the model and a given clipping plane.
   * @param plane - The plane to get the section of.
   */
  async getSection(plane: THREE.Plane, localIds?: number[]) {
    return this._sectionManager.getSection(this, plane, localIds);
  }

  /**
   * Gets all the materials IDs of the model.
   */
  async getMaterialsIds() {
    return this._editManager.getMaterialsIds(this);
  }

  /**
   * Gets the materials of the model.
   * @param localIds - The local IDs of the materials to get. If undefined, it will return all materials.
   */
  async getMaterials(localIds?: Iterable<number>) {
    return this._editManager.getMaterials(this, localIds);
  }

  /**
   * Gets all the representations IDs of the model.
   */
  async getRepresentationsIds() {
    return this._editManager.getRepresentationsIds(this);
  }

  /**
   * Gets the representations of the model.
   * @param localIds - The local IDs of the representations to get. If undefined, it will return all representations.
   */
  async getRepresentations(localIds?: Iterable<number>) {
    return this._editManager.getRepresentations(this, localIds);
  }

  /**
   * Gets all the local transforms IDs of the model.
   */
  async getLocalTransformsIds() {
    return this._editManager.getLocalTransformsIds(this);
  }

  /**
   * Gets the local transforms of the model.
   * @param localIds - The local IDs of the local transforms to get. If undefined, it will return all local transforms.
   */
  async getLocalTransforms(localIds?: Iterable<number>) {
    return this._editManager.getLocalTransforms(this, localIds);
  }

  /**
   * Gets all the global transforms IDs of the model.
   */
  async getGlobalTransformsIds() {
    return this._editManager.getGlobalTransformsIds(this);
  }

  /**
   * Gets the global transforms of the model.
   * @param localIds - The local IDs of the global transforms to get. If undefined, it will return all global transforms.
   */
  async getGlobalTransforms(localIds?: Iterable<number>) {
    return this._editManager.getGlobalTransforms(this, localIds);
  }

  /**
   * Gets all the samples IDs of the model.
   */
  async getSamplesIds() {
    return this._editManager.getSamplesIds(this);
  }

  /**
   * Gets the samples of the model.
   * @param localIds - The local IDs of the samples to get. If undefined, it will return all samples.
   */
  async getSamples(localIds?: Iterable<number>) {
    return this._editManager.getSamples(this, localIds);
  }

  /**
   * Gets all the items IDs of the model.
   */
  async getItemsIds() {
    return this._editManager.getItemsIds(this);
  }

  /**
   * Gets the items of the model.
   * @param localIds - The local IDs of the items to get. If undefined, it will return all items.
   */
  async getItems(localIds?: Iterable<number>) {
    return this._editManager.getItems(this, localIds);
  }

  /**
   * Gets the relations of the model.
   * @param localIds - The local IDs of the relations to get. If undefined, it will return all relations.
   */
  async getRelations(localIds?: number[]) {
    return this._editManager.getRelations(this, localIds);
  }

  /**
   * Gets the global transforms IDs of the items of the model.
   * @param ids - The local IDs of the items to get the global transforms IDs of.
   */
  async getGlobalTranformsIdsOfItems(ids: number[]) {
    return this._editManager.getGlobalTranformsIdsOfItems(this, ids);
  }

  /**
   * Gets the edited elements of the model.
   */
  async getEditedElements() {
    return this._editManager.getEditedElements(this);
  }

  /**
   * Processes a sequence of actions in the worker and computes the result based on the provided input.
   *
   * @param result - The type of item information to compute, used to select the appropriate result function.
   * @param fromItems - An array of selection types, each corresponding to an items selector function.
   * @param input - The initial input data to be processed by the sequence of actions.
   * @returns The computed result after processing the sequence of actions, or `null` if the result function is not found.
   * @experimental
   */
  async getSequenced<
    T extends ItemInformationType,
    U extends ItemSelectionType,
  >(
    result: T,
    fromItems: U[],
    inputs?: {
      selector?: Partial<Record<U, SelectionInputType<U>>>;
      result?: ResultInputType<T>;
    },
  ) {
    return this._sequenceManager.getSequenced(this, result, fromItems, inputs);
  }

  async handleRequest(request: any) {
    await this._meshManager.requests.handleRequest(this._meshManager, request);
  }

  async _getElements(localIds: Iterable<number>) {
    return this._editManager.getElements(this, localIds);
  }

  /**
   * Internal method to finish processing. Don't use this directly.
   */
  _finishProcessing() {
    this._isProcessing = false;
  }

  _setDeltaModel(modelId: string) {
    this.object.userData[FragmentsModel._deltaModelId] = true;
    this._parentModelId = modelId;
  }

  /**
   * Internal method to refresh the view of the model. You shouldn't call this directly. Instead, use {@link FragmentsModels.update}.
   */
  async _refreshView() {
    if (this.frozen) return;
    this._isProcessing = true;
    const mainPromise = this._viewManager.refreshView(this, this._meshManager);
    const deltaPromise = this._editor._update(this.modelId);
    await Promise.all([mainPromise, deltaPromise]);
  }

  /**
   * Internal method to set up the model. Don't use this directly.
   */
  async _setup(
    data: ArrayBuffer | Uint8Array,
    raw?: boolean,
    config?: VirtualModelConfig,
  ) {
    if (this._isSetup) return;
    await this._setupManager.setup(this, this._bbox, data, raw, config);
    this._isLoaded = true;
    this._isProcessing = true;
    this._isSetup = true;
  }

  /**
   * Internal method to edit the model. Don't use this directly.
   * @param requests - The requests to edit the model.
   */
  async _edit(requests: EditRequest[]) {
    return this._editManager.edit(this, requests);
  }

  /**
   * Internal method to reset the model. Don't use this directly.
   */
  async _reset() {
    return this._editManager.reset(this);
  }

  /**
   * Internal method to save the model. Don't use this directly.
   */
  async _save() {
    return this._editManager.save(this);
  }

  /**
   * Internal method to get the requests of the model. Don't use this directly.
   */
  async _getRequests() {
    return this._editManager.getRequests(this);
  }

  /**
   * Internal method to set the requests of the model. Don't use this directly.
   * @param data - The data to set the requests of the model.
   */
  async _setRequests(data: {
    requests?: EditRequest[];
    undoneRequests?: EditRequest[];
  }) {
    return this._editManager.setRequests(this, data);
  }

  /**
   * Internal method to select a request of the model. Don't use this directly.
   * @param index - The index of the request to select.
   */
  async _selectRequest(index: number) {
    return this._editManager.selectRequest(this, index);
  }
}
