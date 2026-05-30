import * as THREE from "three";
import type {
  RawGlobalTransformData,
  RawItemData,
  RawMaterial,
  RawRelationData,
  RawRepresentation,
  RawSample,
  RawTransformData,
} from "../../../Utils";
import type { VirtualIndexesController } from "../virtual-model";
import type {
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

export interface IModelData<Async extends boolean> {
  getSpatialStructure(): Promisify<SpatialTreeItem, Async>;
  getCategories(): Promisify<string[], Async>;
  getMetadata<T extends Record<string, any>>(): Promisify<T, Async>;
  getCRS(): Promisify<CRSData | null, Async>;
  getMaxLocalId(): Promisify<number, Async>;
  getLocalIds(): Promisify<number[], Async>;
  getLocalIdsByGuids(guids: string[]): Promisify<(number | null)[], Async>;
  getGuidsByLocalIds(localIds: number[]): Promisify<(string | null)[], Async>;
  getLocalIdsFromItemIds(itemIds: Iterable<number>): Promisify<number[], Async>;
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

export interface IModelGeometry<Async extends boolean> {
  getItemsGeometry(
    localIds: number[],
    lod?: CurrentLod,
  ): Promisify<MeshData[][], Async>;
  getItemsVolume(localIds: number[]): Promisify<number, Async>;
  getItemDrawChunks(localIds: Iterable<number>): Promisify<DrawChunk[], Async>;
  getSection(
    plane: THREE.Plane,
    localIds?: number[],
  ): Promisify<ModelSection, Async>;
  getPositions(
    localIds?: number[],
  ): Promisify<{ x: number; y: number; z: number }[], Async>;
  getCoordinates(): Promisify<THREE.Matrix3Tuple, Async>;
}

/** User-defined indexes, see {@link VirtualIndexesController}. */
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

/** Binary serialization of the full model or an item subset. */
export interface IModelSerializer<Async extends boolean> {
  getBuffer(raw?: boolean): Promisify<ArrayBufferLike | Uint8Array, Async>;
  getSubsetBuffer(
    localIds: number[],
    raw?: boolean,
  ): Promisify<ArrayBufferLike | Uint8Array, Async>;
}

export interface IFragmentsModel<Async extends boolean = false>
  extends IModelData<Async>,
    IRawModelData<Async>,
    IModelGeometry<Async>,
    IModelIndex<Async>,
    IModelSerializer<Async> {
  readonly modelId: string;
  dispose(): Promisify<void, Async>;
}
