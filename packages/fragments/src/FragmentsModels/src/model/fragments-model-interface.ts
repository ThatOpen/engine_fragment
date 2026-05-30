import * as THREE from "three";
import {
  RawGlobalTransformData,
  RawItemData,
  RawMaterial,
  RawRelationData,
  RawRepresentation,
  RawSample,
  RawTransformData,
} from "../../../Utils";
import {
  CRSData,
  CurrentLod,
  Identifier,
  IndexArrayType,
  IndexEntry,
  IndexInfo,
  ItemData,
  ItemsDataConfig,
  ItemsQueryConfig,
  ItemsQueryParams,
  MeshData,
  ModelSection,
  SpatialTreeItem,
} from "./model-types";

type Promisify<T, Async extends boolean> = Async extends true ? Promise<T> : T;

/**
 * Per-tile index-buffer chunk returned by {@link IFragmentsModel.getItemDrawChunks}.
 * `position` and `size` are parallel arrays: start index and count for each
 * contiguous run of vertices belonging to the queried items in this tile's
 * index buffer.
 */
export type DrawChunk = {
  tileId: number;
  position: Uint32Array;
  size: Uint32Array;
};

/** Model metadata, spatial structure, categories, and CRS. */
export interface IModelProperties<Async extends boolean> {
  getSpatialStructure(): Promisify<SpatialTreeItem, Async>;
  getCategories(): Promisify<string[], Async>;
  getMetadata<T extends Record<string, any>>(): Promisify<T, Async>;
  getCRS(): Promisify<CRSData | null, Async>;
}

/** Local-ID / GUID / item-ID translation and enumeration. */
export interface IModelIds<Async extends boolean> {
  getMaxLocalId(): Promisify<number, Async>;
  getLocalIds(): Promisify<number[], Async>;
  getLocalIdsByGuids(guids: string[]): Promisify<(number | null)[], Async>;
  getGuidsByLocalIds(localIds: number[]): Promisify<(string | null)[], Async>;
  getLocalIdsFromItemIds(itemIds: Iterable<number>): Promisify<number[], Async>;
}

/**
 * Item-level queries — geometry presence, categories, children, data,
 * and arbitrary attribute/relation predicates.
 */
export interface IItemsQuery<Async extends boolean> {
  /**
   * MISALIGNMENT: FragmentsModel's `DataManager` maps the raw local IDs into
   * `Item[]` objects; SingleThreaded and VirtualFragmentsModel return `number[]`.
   */
  getItemsIdsWithGeometry(): Promisify<number[], Async>;
  getItemsOfCategories(
    categories: RegExp[],
  ): Promisify<Record<string, number[]>, Async>;
  getItemsChildren(ids: Identifier[]): Promisify<number[], Async>;
  /**
   * MISALIGNMENT: SingleThreaded declares `ids: number[]`; FragmentsModel uses
   * the broader `ids: Identifier[]` (`string | number`).
   */
  getItemsData(
    ids: Identifier[],
    config?: Partial<ItemsDataConfig>,
  ): Promisify<ItemData[], Async>;
  getItemsByQuery(
    params: ItemsQueryParams,
    config?: ItemsQueryConfig,
  ): Promisify<number[], Async>;
}

/** Mesh geometry extraction, draw-chunk lookup, and cross-section computation. */
export interface IModelGeometry<Async extends boolean> {
  getItemsGeometry(
    localIds: number[],
    lod?: CurrentLod,
  ): Promisify<MeshData[][], Async>;
  getItemDrawChunks(localIds: Iterable<number>): Promisify<DrawChunk[], Async>;
  getSection(
    plane: THREE.Plane,
    localIds?: number[],
  ): Promisify<ModelSection, Async>;
}

/** Spatial positions and world-space coordinates. */
export interface ICoordinatesHelper<Async extends boolean> {
  getPositions(
    localIds?: number[],
  ): Promisify<{ x: number; y: number; z: number }[], Async>;
  getCoordinates(): Promisify<THREE.Matrix3Tuple, Async>;
}

/** Binary serialization of the full model or an item subset. */
export interface IModelSerializer<Async extends boolean> {
  getBuffer(raw?: boolean): Promisify<ArrayBuffer | Uint8Array, Async>;
  getSubsetBuffer(
    localIds: number[],
    raw?: boolean,
  ): Promisify<ArrayBuffer | Uint8Array, Async>;
}

/**
 * Low-level access to the FlatBuffer tables: materials, representations,
 * transforms, samples, items, and relations.
 */
export interface IRawModelData<Async extends boolean> {
  getMaterialsIds(): Promisify<number[], Async>;
  getMaterials(
    ids?: Iterable<number>,
  ): Promisify<Map<number, RawMaterial>, Async>;
  getRepresentationsIds(): Promisify<number[], Async>;
  getRepresentations(
    ids?: Iterable<number>,
  ): Promisify<Map<number, RawRepresentation>, Async>;
  getLocalTransformsIds(): Promisify<number[], Async>;
  getLocalTransforms(
    ids?: Iterable<number>,
  ): Promisify<Map<number, RawTransformData>, Async>;
  getGlobalTransformsIds(): Promisify<number[], Async>;
  getGlobalTransforms(
    ids?: Iterable<number>,
  ): Promisify<Map<number, RawGlobalTransformData>, Async>;
  getSamplesIds(): Promisify<number[], Async>;
  getSamples(ids?: Iterable<number>): Promisify<Map<number, RawSample>, Async>;
  getItemsIds(): Promisify<number[], Async>;
  getItems(ids?: Iterable<number>): Promisify<Map<number, RawItemData>, Async>;
  getRelations(ids?: number[]): Promisify<Map<number, RawRelationData>, Async>;
  getGlobalTranformsIdsOfItems(ids: number[]): Promisify<number[], Async>;
}

/** User-defined per-model indexes (see the `ModelIndex` schema). */
export interface IModelIndex<Async extends boolean> {
  getIndexNames(): Promisify<string[], Async>;
  getIndexInfo(name: string): Promisify<IndexInfo | null, Async>;
  getIndexKeys<K extends string | number>(
    name: string,
  ): Promisify<IndexArrayType<K> | null, Async>;
  getIndexKey<K extends string | number>(
    name: string,
    index: number,
  ): Promisify<K | null, Async>;
  getIndexValues<V extends string | number>(
    name: string,
  ): Promisify<V[] | null, Async>;
  hasIndexEntry<K extends string | number>(
    name: string,
    key: K,
  ): Promisify<boolean, Async>;
  getIndexEntry<K extends string | number, V extends IndexEntry>(
    name: string,
    key: K,
  ): Promisify<V | null, Async>;
  getInverseIndexEntry<K extends string | number, V extends string | number>(
    name: string,
    value: K,
  ): Promisify<IndexArrayType<V> | null, Async>;
}

/**
 * Common contract for both model variants, parameterized by `Async`:
 *  - `IFragmentsModel<false>` — synchronous variant ({@link SingleThreadedFragmentsModel})
 *  - `IFragmentsModel<true>`  — asynchronous variant ({@link FragmentsModel})
 *
 * ---
 * ### Misalignments — methods present in one class but absent (or internal) in the other
 *
 * **In `FragmentsModel` only (missing from `SingleThreadedFragmentsModel`):**
 * - `getGuids()` — VirtualFragmentsModel exposes this but SingleThreaded does not.
 * - `getItemsWithGeometryCategories()` — same situation.
 * - `getItemsIdsWithGeometry()` — FragmentsModel only.
 * - `getCoordinationMatrix()` — FragmentsModel only.
 * - `getMergedBox()` / `getBoxes()` — FragmentsModel only.
 * - `getAlignments()` / `getHorizontalAlignments()` / `getVerticalAlignments()` / `getAlignmentStyles()` — FragmentsModel only.
 * - `getGrids()` / `getGridMaterial()` / `setGridMaterial()` / `getGridLabelMaterial()` / `setGridLabelMaterial()` — FragmentsModel only.
 * - `useCamera()` / `setLodMode()` — FragmentsModel only.
 * - `raycast()` / `raycastAll()` / `raycastWithSnapping()` / `rectangleRaycast()` — FragmentsModel only.
 * - `setVisible()` / `toggleVisible()` / `resetVisible()` / `getVisible()` / `getItemsByVisibility()` — FragmentsModel only.
 * - `highlight()` / `setColor()` / `resetColor()` / `setOpacity()` / `resetOpacity()` — FragmentsModel only.
 * - `getHighlight()` / `resetHighlight()` / `getHighlightItemIds()` — FragmentsModel only.
 * - `getItemsMaterialDefinition()` — FragmentsModel only.
 * - `getAttributesUniqueValues()` — FragmentsModel only.
 * - `getEditedElements()` — FragmentsModel only.
 * - `getItemsVolume()` — FragmentsModel only.
 * - `getAttributeNames()` / `getAttributeValues()` / `getAttributeTypes()` / `getRelationNames()` — FragmentsModel only.
 * - `getGeometries()` — FragmentsModel only.
 * - `getItem()` — FragmentsModel only.
 *
 * **In `SingleThreadedFragmentsModel` only (absent or internal in `FragmentsModel`):**
 * - `edit()` — public in SingleThreaded; `FragmentsModel` exposes `_edit()` (internal) and routes edits through the `Editor` class.
 * - `reset()` / `save()` — same; `_reset()` / `_save()` are internal in FragmentsModel.
 * - `undo()` / `redo()` — SingleThreaded only; no equivalent in FragmentsModel.
 * - `getRequests()` / `setRequests()` / `selectRequest()` — SingleThreaded only; `_getRequests()` etc. are internal in FragmentsModel.
 */
export interface IFragmentsModel<Async extends boolean = false>
  extends IModelIndex<Async>,
    ICoordinatesHelper<Async>,
    IModelProperties<Async>,
    IModelIds<Async>,
    IItemsQuery<Async>,
    IModelGeometry<Async>,
    IModelSerializer<Async>,
    IRawModelData<Async> {
  readonly modelId: string;
  dispose(): Promisify<void, Async>;
}
