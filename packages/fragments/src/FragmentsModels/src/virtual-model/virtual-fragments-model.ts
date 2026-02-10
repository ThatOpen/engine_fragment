import * as THREE from "three";
import { ByteBuffer } from "flatbuffers";

import pako from "pako";

// eslint-disable-next-line import/no-extraneous-dependencies
import {
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree,
} from "three-mesh-bvh";

import {
  VirtualMaterialController,
  VirtualTilesController,
  VirtualPropertiesController,
  RaycastController,
  AlignmentsController,
  ItemConfigController,
} from "./virtual-controllers";
import {
  MaterialDefinition,
  SnappingClass,
  VirtualModelConfig,
  ItemSelectionType,
  ItemInformationType,
  Identifier,
  ItemsQueryParams,
  MeshData,
  AttributesUniqueValuesParams,
  CurrentLod,
  ItemsQueryConfig,
  LodMode,
} from "../model/model-types";

import { VirtualBoxController } from "../bounding-boxes";

import { Connection } from "../multithreading/connection";
import { Model } from "../../../Schema";

import {
  CoordinatesHelper,
  GeometryHelper,
  HighlightHelper,
  ItemsHelper,
  RaycastHelper,
  SectionHelper,
  SequenceHelper,
  VisibilityHelper,
} from "./virtual-helpers";
import { EditRequest, EditRequestType, EditUtils } from "../../../Utils";
import { TileData } from "./virtual-meshes";
import { GridsController } from "./virtual-controllers/grids-controller";

export class VirtualFragmentsModel {
  data: Model;
  view: any;
  raycaster: RaycastController;
  itemConfig: ItemConfigController;
  properties: VirtualPropertiesController;
  materials: VirtualMaterialController;
  tiles: VirtualTilesController;
  boxes: VirtualBoxController;

  requests: EditRequest[] = [];

  private _raycastHelper = new RaycastHelper();
  private _coordinatesHelper = new CoordinatesHelper();
  private _highlightHelper = new HighlightHelper();
  private _visibilityHelper = new VisibilityHelper();
  private _geometryHelper = new GeometryHelper();
  private _sectionHelper = new SectionHelper();
  private _itemsHelper = new ItemsHelper();
  private _sequenceHelper = new SequenceHelper(this);

  private _config: VirtualModelConfig = {};
  private _modelId: string;

  private _alignments: AlignmentsController;
  private _grids: GridsController;
  private _connection: Connection;

  private _reprIdMap = new Map<number, number>();
  private _nextId = 0;

  private _requestsForRedo: EditRequest[] = [];

  constructor(
    modelId: string,
    data: ArrayBuffer,
    connection: Connection,
    config?: VirtualModelConfig,
  ) {
    this._modelId = modelId;
    this._connection = connection;
    this._config = { ...this._config, ...config };
    this.data = this.setupModel(data);
    this.boxes = new VirtualBoxController(this.data);
    this.materials = this.setupMaterials(modelId);
    this._alignments = new AlignmentsController(this);
    this._grids = new GridsController(this);
    this.itemConfig = this.setupItemsConfig();
    this.tiles = this.setupTiles();
    this.properties = this.setupProperties();
    this.raycaster = this.setupRaycaster();
    this.setupBVH();
    this._nextId = this.getMaxLocalId();
  }

  getItemsByConfig(condition: (item: number) => boolean) {
    return this._itemsHelper.getItemsByConfig(this, condition);
  }

  getItemsCategories(ids: number[]) {
    return this.properties.getItemsCategories(ids);
  }

  getItemIdsByLocalIds(localIds: number[]) {
    return this.properties.getItemIdsFromLocalIds(localIds);
  }

  getItemAttributes(id: number) {
    return this.properties.getItemAttributes(id);
  }

  // getItemsAttributes(ids: number[]) {
  //   return this.properties.getItemsAttributes(ids);
  // }

  getAttributesUniqueValues(config: AttributesUniqueValuesParams[]) {
    return this.properties.getAttributesUniqueValues(config);
  }

  getItemsData(ids: number[], config: any) {
    return this.properties.getItemsData(ids, config);
  }

  getItemsOfCategories(categories: RegExp[]) {
    return this.properties.getItemsOfCategories(categories);
  }

  getItemsWithGeometry() {
    return this.properties.getItemsWithGeometry();
  }

  getItemsWithGeometryCategories() {
    return this.properties.getItemsWithGeometryCategories();
  }

  getItemsByQuery(params: ItemsQueryParams, config?: ItemsQueryConfig) {
    return this.properties.getItemsByQuery(params, config);
  }

  getItemRelations(id: number) {
    return this.properties.getItemRelations(id);
  }

  getSpatialStructure() {
    // If there are any changes to the spatial structure, return the changed spatial structure
    const found = EditUtils.applyChangesToSpecialData(
      this.requests,
      "SPATIAL_STRUCTURE",
    );
    if (found) {
      return found;
    }
    return this.properties.getSpatialStructure();
  }

  getMaxLocalId() {
    return this.properties.getMaxLocalId();
  }

  getCategories() {
    return this.properties.getCategories();
  }

  getMetadata() {
    // If there are any changes to the metadata, return the changed metadata
    const found = EditUtils.applyChangesToSpecialData(
      this.requests,
      "METADATA",
    );
    if (found) {
      return found;
    }

    // Otherwise, return the original metadata
    return this.properties.getMetadata();
  }

  getLocalIdsByGuids(guids: string[]) {
    return this.properties.getLocalIdsByGuids(guids);
  }

  getGuidsByLocalIds(localIds: number[]) {
    return this.properties.getGuidsByLocalIds(localIds);
  }

  getSequenced(
    result: ItemInformationType,
    fromItems: ItemSelectionType[],
    inputs?: {
      selector?: Partial<Record<ItemSelectionType, any>>;
      result?: any;
    },
  ) {
    return this._sequenceHelper.getSequenced(result, fromItems, inputs);
  }

  highlight(items: number[], highlightMaterial: MaterialDefinition) {
    this._highlightHelper.highlight(this, items, highlightMaterial);
  }

  setColor(items: number[], color: MaterialDefinition["color"]) {
    this._highlightHelper.setColor(this, items, color);
  }

  resetColor(items: number[]) {
    this._highlightHelper.resetColor(this, items);
  }

  setOpacity(items: number[], opacity: number) {
    this._highlightHelper.setOpacity(this, items, opacity);
  }

  resetOpacity(items: number[]) {
    this._highlightHelper.resetOpacity(this, items);
  }

  getHighlight(localIds: number[]) {
    return this._highlightHelper.getHighlight(this, localIds);
  }

  getHighlightItemIds() {
    return this._highlightHelper.getHighlightItems(this);
  }

  resetHighlight(items: number[]) {
    this._highlightHelper.resetHighlight(this, items);
  }

  getCoordinates() {
    return this._coordinatesHelper.getCoordinates(this);
  }

  getPositions(localIds: number[]) {
    return this._coordinatesHelper.getPositions(this, localIds);
  }

  getGeometriesLength(): number {
    return this._geometryHelper.getGeometriesLength(this);
  }

  getGuids() {
    return this.properties.getGuids();
  }

  getLocalIds() {
    return this.properties.getLocalIds();
  }

  getItemsGeometry(localIds: number[], lod = CurrentLod.GEOMETRY) {
    const indices = this.properties.getItemIdsFromLocalIds(localIds);
    const geometries: MeshData[][] = [];
    for (const index of indices) {
      const geometry = this._geometryHelper.getSampleGeometry(this, index, lod);
      geometries.push(geometry);
    }
    return geometries;
  }

  getGeometries(reprsLocalIds: number[]) {
    if (this._reprIdMap.size === 0) {
      const meshes = this.data.meshes()!;
      for (let i = 0; i < meshes.representationsLength(); i++) {
        const localId = meshes.representationIds(i)!;
        this._reprIdMap.set(localId, i);
      }
    }

    const indices = new Map<number, number>();
    for (const localId of reprsLocalIds) {
      if (this._reprIdMap.has(localId)) {
        indices.set(localId, this._reprIdMap.get(localId)!);
      }
    }

    const meshes = this.data.meshes()!;

    const reprsIndices = Array.from(indices.values());

    const result: MeshData[] = [];
    for (const index of reprsIndices) {
      const geoms = this.tiles.fetchGeometry(index) as TileData | TileData[];
      const items = Array.isArray(geoms) ? geoms : [geoms];
      for (const found of items) {
        const indices = found.indexBuffer as Uint16Array;
        const positions = found.positionBuffer as Float32Array;
        const normals = found.normalBuffer as Int16Array;
        const representationId = meshes.representationIds(index)!;
        result.push({
          transform: new THREE.Matrix4(),
          indices,
          positions,
          normals,
          representationId,
        });
      }
    }

    return result;
  }

  getItemsVolume(localIds: number[]) {
    const indices = this.properties.getItemIdsFromLocalIds(localIds);
    let volume: number = 0;
    for (const index of indices) {
      volume += this._geometryHelper.getVolume(this, index);
    }
    return volume;
  }

  getAttributeNames() {
    const names = this.properties.getAttributeNames();
    return names;
  }

  getAttributeValues() {
    const values = this.properties.getAttributeValues();
    return values;
  }

  getAttributeTypes() {
    const types = this.properties.getAttributeTypes();
    return types;
  }

  getRelationNames() {
    const names = this.properties.getRelationNames();
    return names;
  }

  getItemsMaterialDefinition(localIds: number[]) {
    const indices = this.properties.getItemIdsFromLocalIds(localIds);
    return this.materials.getItemsMaterialDefinition(
      this.data,
      indices,
      localIds,
    );
  }

  resetVisible() {
    this._visibilityHelper.resetVisible(this);
  }

  getItemsByVisibility(visible: boolean) {
    return this._visibilityHelper.getItemsByVisibility(this, visible);
  }

  raycast(ray: THREE.Ray, frustum: THREE.Frustum, returnAll?: boolean): any {
    return this._raycastHelper.raycast(this, ray, frustum, returnAll);
  }

  snapRaycast(
    ray: THREE.Ray,
    frustum: THREE.Frustum,
    snaps: SnappingClass[],
  ): any[] {
    return this._raycastHelper.snapRaycast(this, ray, frustum, snaps);
  }

  rectangleRaycast(frustum: THREE.Frustum, fullyIncluded: boolean): number[] {
    return this._raycastHelper.rectangleRaycast(this, frustum, fullyIncluded);
  }

  async getSection(plane: THREE.Plane, localIds?: number[]) {
    const indices = this.properties.getItemIdsFromLocalIds(localIds);
    return this._sectionHelper.getSection(this, plane, indices);
  }

  async getAlignments() {
    return this._alignments.getAlignments();
  }

  async getGrids() {
    return this._grids.getGrids();
  }

  getBuffer(raw: boolean) {
    const bb = this.data.bb as ByteBuffer;
    const bytes = bb.bytes();
    const buffer = bytes.buffer;
    return raw ? buffer : pako.deflate(buffer as ArrayBuffer);
  }

  dispose() {
    this.tiles.dispose();
  }

  setVisible(localIds: number[], visible: boolean) {
    this._visibilityHelper.setVisible(this, localIds, visible);
  }

  toggleVisible(localIds: number[]) {
    this._visibilityHelper.toggleVisible(this, localIds);
  }

  getVisible(items: number[]) {
    return this._visibilityHelper.getVisible(this, items);
  }

  hideForEdit(localIds: number[]) {
    this._visibilityHelper.hideForEdit(this, localIds);
  }

  getItemsChildren(ids: Identifier[]) {
    return this.properties.getItemsChildren(ids);
  }

  setupData() {
    this.tiles.generate();
  }

  refreshView(view: any) {
    this.view = view;
    this.tiles.setupView(view);
  }

  getFullBBox() {
    return this.boxes.fullBox;
  }

  getBBoxes(items: number[]) {
    const box = new THREE.Box3();
    this.properties.getBox(items, box);
    return box;
  }

  traverse(itemIds: number[], onItem: (itemId: number, index: number) => void) {
    this._itemsHelper.traverse(this, itemIds, onItem);
  }

  update(time: number): boolean {
    this.tiles.update(time);
    return this.tiles.tilesUpdated;
  }

  edit(requests: EditRequest[]) {
    const ids = EditUtils.solveIds(requests, this._nextId);
    this._nextId += ids.length;
    for (const request of requests) {
      this.requests.push(request);
    }
    const { model, items } = EditUtils.edit(this.data, this.requests, {
      raw: true,
      delta: true,
    });
    this._visibilityHelper.hideForEdit(this, items);
    return { deltaModelBuffer: model, ids };
  }

  reset() {
    this.requests = [];
    this._requestsForRedo = [];
    this._nextId = this.getMaxLocalId();
  }

  save() {
    this.requests.push({
      type: EditRequestType.UPDATE_MAX_LOCAL_ID,
      localId: this._nextId,
    });
    const { model } = EditUtils.edit(this.data, this.requests, {
      raw: true,
      delta: false,
    });
    return model;
  }

  undo() {
    if (this.requests.length === 0) {
      return;
    }
    const lastRequest = this.requests.pop();
    if (!lastRequest) {
      return;
    }
    this._requestsForRedo.unshift(lastRequest);
  }

  redo() {
    if (this._requestsForRedo.length === 0) {
      return;
    }
    const lastUndoneRequest = this._requestsForRedo.shift();
    if (!lastUndoneRequest) {
      return;
    }
    this.requests.push(lastUndoneRequest);
  }

  getRequests() {
    return {
      requests: this.requests,
      undoneRequests: this._requestsForRedo,
    };
  }

  setRequests(data: {
    requests?: EditRequest[];
    undoneRequests?: EditRequest[];
  }) {
    if (data.requests) {
      this.requests = data.requests;
    }
    if (data.undoneRequests) {
      this._requestsForRedo = data.undoneRequests;
    }
  }

  selectRequest(index: number) {
    const allRequests: EditRequest[] = [];
    for (const request of this.requests) {
      allRequests.push(request);
    }
    for (const request of this._requestsForRedo) {
      allRequests.push(request);
    }

    this.requests = [];
    this._requestsForRedo = [];

    for (let i = 0; i < allRequests.length; i++) {
      if (i <= index) {
        this.requests.push(allRequests[i]);
      } else {
        this._requestsForRedo.push(allRequests[i]);
      }
    }
  }

  getMaterialsIds() {
    const ids = EditUtils.getMaterialsIds(this.data);
    return EditUtils.applyChangesToIds(this.requests, ids, "MATERIAL", true);
  }

  getMaterials(ids?: Iterable<number>) {
    const found = EditUtils.getMaterials(this.data, ids);
    EditUtils.applyChangesToRawData(this.requests, found, "MATERIAL");
    return found;
  }

  getRepresentationsIds() {
    const ids = EditUtils.getRepresentationsIds(this.data);
    return EditUtils.applyChangesToIds(
      this.requests,
      ids,
      "REPRESENTATION",
      true,
    );
  }

  getRepresentations(ids?: Iterable<number>) {
    const found = EditUtils.getRepresentations(this.data, ids);
    EditUtils.applyChangesToRawData(this.requests, found, "REPRESENTATION");
    return found;
  }

  getLocalTransformsIds() {
    const ids = EditUtils.getLocalTransformsIds(this.data);
    return EditUtils.applyChangesToIds(
      this.requests,
      ids,
      "LOCAL_TRANSFORM",
      true,
    );
  }

  getLocalTransforms(ids?: Iterable<number>) {
    const found = EditUtils.getLocalTransforms(this.data, ids);
    EditUtils.applyChangesToRawData(this.requests, found, "LOCAL_TRANSFORM");
    return found;
  }

  getGlobalTransformsIds() {
    const ids = EditUtils.getGlobalTransformsIds(this.data);
    return EditUtils.applyChangesToIds(
      this.requests,
      ids,
      "GLOBAL_TRANSFORM",
      true,
    );
  }

  getGlobalTransforms(ids?: Iterable<number>) {
    const found = EditUtils.getGlobalTransforms(this.data, ids);
    EditUtils.applyChangesToRawData(this.requests, found, "GLOBAL_TRANSFORM");
    return found;
  }

  getSamplesIds() {
    const ids = EditUtils.getSamplesIds(this.data);
    return EditUtils.applyChangesToIds(this.requests, ids, "SAMPLE", true);
  }

  getSamples(ids?: Iterable<number>) {
    const result = EditUtils.getSamples(this.data, ids);
    EditUtils.applyChangesToRawData(this.requests, result, "SAMPLE");
    return result;
  }

  getItemsIds() {
    const ids = EditUtils.getItemsIds(this.data);
    return EditUtils.applyChangesToIds(this.requests, ids, "ITEM", true);
  }

  getItems(ids?: Iterable<number>) {
    const itemIds = this.properties.getItemIdsFromLocalIds(ids);
    const found = EditUtils.getItems(this.data, itemIds);
    const filter = ids ? new Set(ids) : undefined;
    EditUtils.applyChangesToRawData(this.requests, found, "ITEM", filter);
    return found;
  }

  getRelations(ids?: number[]) {
    const found = this.properties.getRawRelations(ids);
    EditUtils.applyChangesToRawData(this.requests, found, "RELATION");
    return found;
  }

  getGlobalTranformsIdsOfItems(ids: number[]) {
    return EditUtils.getGlobalTranformsIdsOfItems(this.data, ids);
  }

  getElementsData(ids: Iterable<number>) {
    const filtered = new Set(ids);
    EditUtils.applyChangesToIds(this.requests, filtered, "ITEM", false);
    return EditUtils.getElementsData(this, filtered);
  }

  setLodMode(lodMode: LodMode) {
    this.tiles.setLodMode(lodMode);
  }

  private setupBVH() {
    // @ts-ignore
    THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
    // @ts-ignore
    THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
    // @ts-ignore
    THREE.Mesh.prototype.raycast = acceleratedRaycast;
  }

  private setupProperties() {
    return new VirtualPropertiesController(
      this,
      this.boxes,
      this._config.properties,
    );
  }

  private setupRaycaster() {
    return new RaycastController(
      this.data,
      this.boxes,
      this.tiles,
      this.itemConfig,
    );
  }

  private setupMaterials(modelId: string) {
    return new VirtualMaterialController(modelId, this._onTransferMaterial);
  }

  private setupTiles() {
    const materials = this.materials.update(this.data);
    return new VirtualTilesController({
      modelId: this._modelId,
      connection: this._connection,
      model: this.data,
      boxes: this.boxes,
      items: this.itemConfig,
      materials,
    });
  }

  private setupModel(data: ArrayBuffer) {
    const uintArray = new Uint8Array(data);
    const byteBuffer = new ByteBuffer(uintArray);
    return Model.getRootAsModel(byteBuffer);
  }

  private _onTransferMaterial = (data: any, trans: any) => {
    if (!this._connection) return undefined;
    return this._connection.fetch(data, trans);
  };

  private setupItemsConfig() {
    const itemsCount = this.data.localIdsLength();
    return new ItemConfigController(itemsCount);
  }
}
