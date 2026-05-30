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

export interface ICoordinatesHelper<Async extends boolean> {
  getPositions(
    localIds?: number[],
  ): Promisify<{ x: number; y: number; z: number }[], Async>;
  getCoordinates(): Promisify<THREE.Matrix3Tuple, Async>;
}

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
 *
 * **Signature discrepancies:**
 * - `getItemsData`: SingleThreaded declares `ids: number[]`; FragmentsModel uses the broader `ids: Identifier[]` (`string | number`).
 * - `getItemsWithGeometry`: SingleThreaded / VirtualFragmentsModel return local-ID arrays (`number[]`);
 *   FragmentsModel enriches them into `Item[]` via `DataManager`.
 * - `*Ids()` methods (`getMaterialsIds`, `getRepresentationsIds`, etc.): the underlying
 *   `applyChangesToIds` helper has a return type of `number[] | Uint32Array | Set<number>`
 *   because TypeScript cannot prove the `actions: EditRequest[]` branch is always taken.
 *   The interface uses `number[]` as the intended type; TypeScript will flag any implementation
 *   that leaks the wider union.
 * - `getSection`: always returns `Promise<ModelSection>` in both variants because
 *   `VirtualFragmentsModel.getSection` is async — the `Async` generic does not apply.
 */
export interface IFragmentsModel<Async extends boolean = false>
  extends ICoordinatesHelper<Async>,
    IModelIndex<Async> {
  readonly modelId: string;

  // ---------------------------------------------------------------------------
  // Spatial structure & properties
  // ---------------------------------------------------------------------------

  getSpatialStructure(): Promisify<SpatialTreeItem, Async>;
  getCategories(): Promisify<string[], Async>;
  getMetadata<T extends Record<string, any>>(): Promisify<T, Async>;
  getCRS(): Promisify<CRSData | null, Async>;
  getMaxLocalId(): Promisify<number, Async>;
  getLocalIds(): Promisify<number[], Async>;
  getLocalIdsByGuids(guids: string[]): Promisify<(number | null)[], Async>;
  getGuidsByLocalIds(localIds: number[]): Promisify<(string | null)[], Async>;
  getLocalIdsFromItemIds(itemIds: Iterable<number>): Promisify<number[], Async>;

  // ---------------------------------------------------------------------------
  // Items
  // ---------------------------------------------------------------------------

  /**
   * MISALIGNMENT: FragmentsModel's `DataManager` maps the raw local IDs into
   * `Item[]` objects; SingleThreaded and VirtualFragmentsModel return `number[]`.
   */
  getItemsWithGeometry(): Promisify<number[], Async>;
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

  // ---------------------------------------------------------------------------
  // Geometry & positions
  // ---------------------------------------------------------------------------

  getItemsGeometry(
    localIds: number[],
    lod?: CurrentLod,
  ): Promisify<MeshData[][], Async>;
  getItemDrawChunks(localIds: Iterable<number>): Promisify<DrawChunk[], Async>;
  /**
   * Always returns `Promise<ModelSection>` regardless of `Async` because
   * `VirtualFragmentsModel.getSection` is inherently async in both variants.
   */
  getSection(
    plane: THREE.Plane,
    localIds?: number[],
  ): Promisify<ModelSection, Async>;

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  getBuffer(raw?: boolean): Promisify<ArrayBuffer | Uint8Array, Async>;
  getSubsetBuffer(
    localIds: number[],
    raw?: boolean,
  ): Promisify<ArrayBuffer | Uint8Array, Async>;

  // ---------------------------------------------------------------------------
  // Raw model data (materials, transforms, representations, samples)
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  dispose(): Promisify<void, Async>;
}
