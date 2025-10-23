import * as THREE from "three";
import { LodMaterial, LODMesh } from "../lod";
import { RenderedFaces, RepresentationClass } from "../../../Schema";
import { FragmentsModel } from "./fragments-model";

/**
 * Interface representing a change event when attributes are deleted from a model item.
 */
interface AttrsDeleteChange {
  /** Indicates this is a "deleted" type change */
  type: "deleted";
}

/**
 * Interface representing a change event when attributes are added to a model item.
 */
interface AttrsAddChange {
  /** Indicates this is an "added" type change */
  type: "added";
  /** Record containing the newly added attribute data */
  data: Record<string, any>;
}

/**
 * Interface representing a change event when attributes are modified in a model item.
 */
interface AttrsModifyChange {
  /** Indicates this is a "modified" type change */
  type: "modified";
  /** Record containing the newly added attribute data */
  added: Record<string, any>;
  /** Array of strings representing the deleted attribute keys */
  deleted: string[];
  /** Record containing the modified attribute data */
  modified: Record<string, any>;
}

/**
 * Union type representing all possible attribute change types.
 */
export type AttrsChange =
  | AttrsDeleteChange
  | AttrsModifyChange
  | AttrsAddChange;

/**
 * Interface representing a change event when relations are modified in a model item.
 */
export interface RelsModifyChange {
  /** Indicates this is a "modified" type change */
  type: "modified";
  /** Record containing the newly added relation data */
  added: Record<string, Set<number>>;
  /** Set of strings representing the deleted relation keys */
  deleted: Set<string>;
  /** Record containing the removed relation data */
  removed: Record<string, Set<number>>;
  /** Record containing the modified relation data */
  modified: Record<string, Set<number>>;
}

/**
 * Union type representing all possible relation change types.
 */
export type RelsChange = RelsModifyChange;

/**
 * Type representing a unique identifier for a model item. This can be either a string or a number.
 */
export type Identifier = string | number;

/**
 * Interface representing the attributes of a model item.
 */
export interface Attributes {
  /** Unique local identifier for the item */
  localId: number;
  /** Optional category identifier */
  category?: number;
  /** Optional globally unique identifier */
  guid?: string;
  /** Additional arbitrary attributes can be added with any name and value */
  [name: string]: any;
}

/**
 * Represents attribute data for a model item.
 */
export type AttributeData = {
  /** The value of the attribute, which can be any type */
  value: any;
  /** Optional type identifier for the attribute value */
  type?: number;
};

/**
 * Union type representing all possible material types.
 */
export type BIMMaterial = LodMaterial | THREE.MeshLambertMaterial;

/**
 * Interface representing the definition of a material.
 */
export type MaterialDefinition = {
  /** The color of the material */
  color: THREE.Color;
  /** The faces rendered by the material */
  renderedFaces: RenderedFaces;
  /** The opacity of the material */
  opacity: number;
  /** Whether the material is transparent */
  transparent: boolean;
  /** An optional custom ID for the material */
  customId?: string;
  /**
   * Whether to have depth test enabled when rendering this material. When the depth test is disabled, the depth write
   * will also be implicitly disabled.
   * @default true
   */
  depthTest?: boolean;

  /** The local ID of the material */
  localId?: number;
};
export interface MaterialData {
  data: MaterialDefinition;
  transparent?: boolean;
  instancing?: boolean;
}

/**
 * The maximum value for a 2-byte unsigned integer.
 */
export const limitOf2Bytes = 0x10000;

export enum ObjectClass {
  LINE = 0,
  SHELL = 1,
}

export enum TileRequestClass {
  UPDATE = 0,
  CREATE = 1,
  DELETE = 2,
  FINISH = 3,
}

/**
 * Enum representing the current level of detail (LOD) for a mesh.
 */
export const enum CurrentLod {
  /** Represents the full geometry of the model */
  GEOMETRY = 0,
  /** Represents the wireframe representation of the model */
  WIRES = 1,
  /** Represents the invisible representation of the model */
  INVISIBLE = 2,
}

export enum MultiThreadingRequestClass {
  CREATE_MODEL = 0,
  DELETE_MODEL = 1,
  EXECUTE = 2,
  RAYCAST = 3,
  FETCH_BOXES = 4,
  REFRESH_VIEW = 5,
  RECOMPUTE_MESHES = 6,
  CREATE_MATERIAL = 7,
  THROW_ERROR = 8,
}

/**
 * Enum representing the configuration class for an item in a Fragments model.
 */
export enum ItemConfigClass {
  /** Represents the visibility configuration for an item */
  VISIBLE = 0,
}

/**
 * Enum representing the snapping class for a raycast operation.
 */
export enum SnappingClass {
  /** Represents a point snapping class */
  POINT = 0,
  /** Represents a line snapping class */
  LINE = 1,
  /** Represents a face snapping class */
  FACE = 2,
}

/**
 * Interface representing a map of model IDs to their corresponding local IDs.
 */
export interface ModelIdMap {
  [key: string]: number[] | undefined;
}

/**
 * Union type representing all possible data buffer types.
 */
export type DataBuffer =
  | Float32Array
  | Uint8ClampedArray
  | Int32Array
  | Uint8Array
  | Uint32Array
  | Float64Array
  | Int8Array
  | Uint16Array
  | Int16Array;

/**
 * Union type representing all possible mesh types.
 */
export type BIMMesh = THREE.Mesh | LODMesh;

/**
 * Interface representing the data of a mesh.
 */
export type MeshData = {
  /** The transformation matrix of the mesh */
  transform: THREE.Matrix4;
  /** The sample ID of the mesh */
  sampleId?: number;
  /** The indices of the mesh */
  indices?: Uint8Array | Uint16Array | Uint32Array;
  /** The positions of the mesh */
  positions?: Float32Array | Float64Array;
  /** The normals of the mesh */
  normals?: Int16Array;
  /** The local ID of the mesh */
  localId?: number;
  /** The representation ID of the mesh */
  representationId?: number;
};

/**
 * Interface representing the data for a raycast operation.
 */
export interface RaycastData {
  /** The camera used for the raycast */
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  /** The mouse position */
  mouse: THREE.Vector2;
  /** The DOM element where the scene is rendered */
  dom: HTMLCanvasElement;
}

export interface SnappingRaycastData extends RaycastData {
  snappingClasses: SnappingClass[];
}

/**
 * Interface representing the result of a rectangle raycast operation.
 */
export interface RectangleRaycastResult {
  /** The local IDs of the items */
  localIds: number[];
  /** The Fragments model that was hit */
  fragments: FragmentsModel;
}

/**
 * Interface representing the data for a rectangle raycast operation.
 */
export interface RectangleRaycastData {
  /** The camera used for the raycast */
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  /** The DOM element where the scene is rendered */
  dom: HTMLCanvasElement;
  /** The top left corner of the rectangle */
  topLeft: THREE.Vector2;
  /** The bottom right corner of the rectangle */
  bottomRight: THREE.Vector2;
  /** Whether the rectangle is fully included in the view */
  fullyIncluded: boolean;
}

/**
 * Interface representing the result of a raycast operation.
 */
export interface RaycastResult {
  /** The local ID of the item */
  localId: number;
  /** The item ID */
  itemId: number;
  /** The point of the raycast */
  point: THREE.Vector3;
  /** The normal of the raycast */
  normal?: THREE.Vector3;
  /** The distance of the raycast */
  distance: number;
  /** The distance of the raycast from the ray origin */
  rayDistance?: number;
  /** The object that was hit */
  object: THREE.Object3D;
  /** The Fragments model that was hit */
  fragments: FragmentsModel;
  /** The ray used for the raycast */
  ray?: THREE.Ray;
  /** The frustum used for the raycast */
  frustum: THREE.Frustum;
  /** The representation class of the raycast */
  representationClass: RepresentationClass;
  /** The snapping class of the raycast */
  snappingClass: SnappingClass;
  /** The first edge of the snapped edge */
  snappedEdgeP1?: THREE.Vector3;
  /** The second edge of the snapped edge */
  snappedEdgeP2?: THREE.Vector3;
  /** The points of the raycasted face */
  facePoints?: Float32Array;
  /** The indices of the raycasted face */
  faceIndices?: Uint16Array;
}

/**
 * Interface representing the attributes of an item in a Fragments model.
 */
export interface ItemAttribute {
  /** The value of the attribute, which can be any type */
  value: any;
  /** Optional type identifier for the attribute value */
  type?: string;
}

/**
 * Interface representing the data of an item in a Fragments model.
 */
export interface ItemData {
  [name: string]: ItemAttribute | ItemData[];
}

/**
 * Interface representing an item in a spatial tree.
 */
export interface SpatialTreeItem {
  /** The category of the item */
  category: string | null;
  /** The local ID of the item */
  localId: number | null;
  /** The children of the item */
  children?: SpatialTreeItem[];
}

/**
 * Interface representing the configuration for item data in a Fragments model.
 */
export interface ItemsDataConfig {
  /**
   * An array of attribute names to include in the item data.
   */
  attributes?: string[];
  /**
   * A boolean indicating whether to include default attributes in the item data.
   */
  attributesDefault: boolean;
  /**
   * A record of relation names to their configuration.
   */
  relations?: Record<string, { attributes: boolean; relations: boolean }>;
  /**
   * The default configuration for relations.
   */
  relationsDefault: { attributes: boolean; relations: boolean };
}

export const ALIGNMENT_CATEGORY = "ThatOpenAlignment";

export enum AlignmentCurveType {
  NONE = 0,
  LINES = 1,
  CLOTHOID = 2,
  ELLIPSE_ARC = 3,
  PARABOLA = 4,
}

export type AlignmentCurve = {
  points: Float32Array | number[];
  type: AlignmentCurveType;
};

export type AlignmentData = {
  absolute: AlignmentCurve[];
  horizontal: AlignmentCurve[];
  vertical: AlignmentCurve[];
};

export type AlignmentDataItem = {
  data: {
    value: string;
    type: string;
  };
};

/**
 * Interface representing the configuration for virtual properties in a Fragments model.
 */
export interface VirtualPropertiesConfig {
  /** An array of extra relations to include in the virtual model */
  extraRelations?: {
    category: string;
    relation: string;
    inverseName: string;
  }[];
}

/**
 * Interface representing the configuration for a virtual model.
 */
export interface VirtualModelConfig {
  /** Optional properties configuration for the virtual model */
  properties?: VirtualPropertiesConfig;
}

/**
 * Union type representing all possible item selection types.
 */
export type ItemSelectionType =
  | "withCondition" // to use with the finder
  | "ofCategory"
  | "withGeometry"
  | "children"
  | "withVisiblity"
  | "highlighted";

/**
 * Interface representing the input for a selection query in a Fragments model.
 */
export interface MappedSelectionInput {
  /**
   * The category of the item to select.
   */
  ofCategory: string;
}

/**
 * Union type representing all possible selection input types.
 */
export type SelectionInputType<T extends ItemSelectionType> =
  T extends keyof MappedSelectionInput ? MappedSelectionInput[T] : never;

/**
 * Union type representing all possible item information types.
 */
export type ItemInformationType =
  | "data"
  | "attributes"
  | "relations"
  | "guid"
  | "category"
  | "geometry"
  | "visibility"
  | "highlight"
  | "mergedBoxes"
  | "children";

/**
 * Interface representing the input for a result query in a Fragments model.
 * @template T - The type of item information to query.
 */
export interface MappedResultInput {
  /**
   * A partial configuration for item data.
   */
  data: Partial<ItemsDataConfig>;
}

/**
 * Union type representing all possible result input types.
 */
export type ResultInputType<T extends ItemInformationType> =
  T extends keyof MappedResultInput ? MappedResultInput[T] : never;

/**
 * Interface representing the result of an information query for a specific item type.
 * @template T - The type of item information to query.
 */
export interface MappedInformationResult {
  /**
   * An array of attribute records for the item.
   * Each record contains a string key and a value of type any.
   */
  attributes: (Record<string, { value: any; type?: string }> | null)[];
  /**
   * An array of category strings for the item.
   */
  category: string[];
  /**
   * An array of child item IDs for the item.
   */
  children: number[];
  /**
   * An array of data records for the item.
   */
  data: ItemData[];
  /**
   * An array of geometry data for the item.
   */
  geometry: MeshData[][];
  /**
   * An array of GUID strings for the item.
   */
  guid: (string | null)[];
  /**
   * An array of highlight materials for the item.
   */
  highlight: MaterialDefinition[];
  /**
   * An array of relation records for the item.
   */
  relations: (Record<string, number[]> | null)[];
  /**
   * An array of visibility flags for the item.
   */
  visibility: boolean[];
  /**
   * The merged bounding box for the item.
   */
  mergedBoxes: THREE.Box3;
}

/**
 * Type representing the result of an information query for a specific item type.
 * @template T - The type of item information to query.
 */
export type InformationResultType<T extends ItemInformationType> =
  MappedInformationResult[T];

export type QueryAggregation = "exclusive" | "inclusive";

export type GetItemsByAttributeParams = {
  name: RegExp; // Making it a RegExp we can match attribues like Name and LongName in one single attribute query
  value?: RegExp | RegExp[] | number | boolean; // By making the value optional it means the attribute must exist regardless the value
  // condition?: any; // set this here to not forget about conditions for numerical values (>, >=, <, <=)
  type?: RegExp;
  negate?: boolean;
  itemIds?: number[];
};

export type GetItemsByRelationParams = {
  /** Relation tag on the *source* item (e.g. "IsDefinedBy") */
  name: string;
  /** Set of *target* item localIds that must appear in the chosen relation */
  targetItemIds?: Set<number>;
  /** Optional subset of candidate *source* items; if omitted all items are scanned. */
  sourceItemIds?: Iterable<number>;
};

export type ItemsQueryParams = {
  categories?: RegExp[];
  attributes?: {
    aggregation?: QueryAggregation;
    queries: GetItemsByAttributeParams[];
  };
  relation?: {
    name: string;
    query?: ItemsQueryParams; // By making the query optional it means the item must have the given relation regardless of its items (e.g. To take items that have property sets )
  };
};

export interface ItemsQueryConfig {
  localIds?: number[];
}

export interface AttributesUniqueValuesParams {
  key?: string; // the key name to be used in the result
  get: RegExp; // the attribute name whose value to take
  categories?: RegExp[];
  // the queries an attribute set must match to be considered
  attributes?: {
    aggregation?: QueryAggregation;
    queries: GetItemsByAttributeParams[];
  };
}

export interface ModelSection {
  buffer: Float32Array;
  index: number;
  fillsIndices: number[];
}
