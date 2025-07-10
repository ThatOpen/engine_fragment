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

export class VirtualFragmentsModel {
  data: Model;
  view: any;
  raycaster: RaycastController;
  itemConfig: ItemConfigController;
  properties: VirtualPropertiesController;
  materials: VirtualMaterialController;
  tiles: VirtualTilesController;
  boxes: VirtualBoxController;

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
  private _connection: Connection;

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
    this._alignments = new AlignmentsController(this.data);
    this.itemConfig = this.setupItemsConfig();
    this.tiles = this.setupTiles();
    this.properties = this.setupProperties();
    this.raycaster = this.setupRaycaster();
    this.setupBVH();
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

  getItemsByQuery(params: ItemsQueryParams) {
    return this.properties.getItemsByQuery(params);
  }

  getItemRelations(id: number) {
    return this.properties.getItemRelations(id);
  }

  getSpatialStructure() {
    return this.properties.getSpatialStructure();
  }

  getMaxLocalId() {
    return this.properties.getMaxLocalId();
  }

  getCategories() {
    return this.properties.getCategories();
  }

  getMetadata() {
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

  getItemsGeometry(localIds: number[]) {
    const indices = this.properties.getItemIdsFromLocalIds(localIds);
    const geometries: MeshData[][] = [];
    for (const index of indices) {
      const geometry = this._geometryHelper.getGeometry(this, index);
      geometries.push(geometry);
    }
    return geometries;
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

  raycast(ray: THREE.Ray, frustum: THREE.Frustum): any {
    return this._raycastHelper.raycast(this, ray, frustum);
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

  getBuffer(raw: boolean) {
    const bb = this.data.bb as ByteBuffer;
    const bytes = bb.bytes();
    const buffer = bytes.buffer;
    return raw ? buffer : pako.deflate(buffer);
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
      this.data,
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
