import * as THREE from "three";
import * as TFB from "../../Schema";
import {
  ItemAttribute,
  ItemData,
  SpatialTreeItem,
} from "../../FragmentsModels";

/**
 * Data defining a fragments material.
 */
export type RawMaterial = {
  /** The red component of the material. */
  r: number;
  /** The green component of the material. */
  g: number;
  /** The blue component of the material. */
  b: number;
  /** The alpha component of the material. */
  a: number;
  /** The number of rendered faces of the material. */
  renderedFaces: TFB.RenderedFaces;
  /** The stroke type of the material. */
  stroke: TFB.Stroke;
};

/**
 * Data defining a fragments item. It can be anything, from a property to property set or a physical element like a wall or a beam.
 */
export type RawItemData = {
  /** The attributes of the item. */
  data: Record<string, ItemAttribute>;
  /** The category of the item. */
  category: string;
  /** The GUID of the item (optional). */
  guid?: string;
};

/**
 * Data defining a fragments relation.
 */
export type RawRelationData = {
  /** The relations of the item. */
  data: Record<string, number[]>;
};

/**
 * Data defining metadata of the fragments model.
 */
export type RawMetadataData = Record<string, any>;

/**
 * Data defining a transform (local or global) of a mesh.
 */
export type RawTransformData = {
  /** The position of the transform. */
  position: number[];
  /** The x direction of the transform coordinates. */
  xDirection: number[];
  /** The y direction of the transform coordinates. */
  yDirection: number[];
};

/**
 * Data defining a global transform of a mesh.
 */
export type RawGlobalTransformData = RawTransformData & {
  /** The ID of the item the global transform is associated with. */
  itemId: number | string;
};

/**
 * Data defining a sample (instance) of a mesh.
 */
export type RawSample = {
  /** The ID of the global transform the sample is associated with. */
  item: number;
  /** The ID of the material the sample is associated with. */
  material: number;
  /** The ID of the representation the sample is associated with. */
  representation: number;
  /** The ID of the local transform the sample is associated with. */
  localTransform: number;
};

/**
 * Data defining a circle extrusion geometry (e.g. reinforcement bars).
 */
export type RawCircleExtrusion = {
  /** The radius of the circle extrusion. */
  radius: number[];
  /** The axes of the circle extrusion. */
  axes: {
    /** The wires of the axis. */
    wires: number[][];
    /**
     * The order of the axis parts. E.g. order [0, 0, 1, 1] and parts
     * [WIRE, CIRCLE_CURVE, WIRE, CIRCLE_CURVE] means that the axis has
     * the first wire, the first circle curve, the second wire and the
     * second circle curve.
     * */
    order: number[];
    /**
     * The parts of the axis parts. E.g. order [0, 0, 1, 1] and parts
     * [WIRE, CIRCLE_CURVE, WIRE, CIRCLE_CURVE] means that the axis has
     * the first wire, the first circle curve, the second wire and the
     * second circle curve.
     * */
    parts: TFB.AxisPartClass[];
    /** The wire sets of the axis. */
    wireSets: number[][];
    /** The circle curves of the axis. */
    circleCurves: {
      /** The aperture of the circle curve. */
      aperture: number;
      /** The position of the circle curve. */
      position: number[];
      /** The radius of the circle curve. */
      radius: number;
      /** The x direction of the circle curve. */
      xDirection: number[];
      /** The y direction of the circle curve. */
      yDirection: number[];
    }[];
  }[];
};

/**
 * Data defining a shell geometry (e.g. a brep).
 */
export type RawShell = {
  /** The points of the shell. */
  points: number[][];
  /** The profiles of the shell. */
  profiles: Map<number, number[]>;
  /** The holes of the shell. */
  holes: Map<number, number[][]>;
  /** The big profiles of the shell. */
  bigProfiles: Map<number, number[]>;
  /** The big holes of the shell. */
  bigHoles: Map<number, number[][]>;
  /** The type of the shell. */
  type: TFB.ShellType;
  /** The profile face IDs of the shell. */
  profilesFaceIds: number[];
};

/**
 * Data defining a representation of a geometry.
 */
export type RawRepresentation = {
  /** The ID of the representation (optional). */
  id?: number;
  /** The bounding box of the representation. */
  bbox: number[];
  /** The class of the representation. */
  representationClass: number;
  /** The definition of the representation's geometry. */
  geometry?: RawShell | RawCircleExtrusion;
};

/**
 * Container of all the data of an element of a fragments model.
 */
export type ElementData = {
  /** The samples of the elements. */
  samples: { [id: number]: RawSample };
  /** The local transforms of the elements. */
  localTransforms: { [id: number]: RawTransformData };
  /** The global transforms of the elements. */
  globalTransforms: { [id: number]: RawGlobalTransformData };
  /** The representations of the elements. */
  representations: { [id: number]: RawRepresentation };
  /** The materials of the elements. */
  materials: { [id: number]: RawMaterial };
};

/**
 * Data defining a new element of a fragments model.
 */
export type NewElementData = {
  /** The attributes of the element. */
  attributes: ItemData;
  /** The global transform of the element. */
  globalTransform: THREE.Matrix4;
  /** The samples of the element. */
  samples: {
    /** The local transform of the sample. */
    localTransform: THREE.Matrix4 | number | string;
    /** The representation of the sample. */
    representation: THREE.BufferGeometry | number | string;
    /** The material of the sample. */
    material: THREE.MeshLambertMaterial | number | string;
  }[];
};

/**
 * Types of edit requests.
 */
export enum EditRequestType {
  CREATE_MATERIAL,
  CREATE_REPRESENTATION,
  CREATE_SAMPLE,
  CREATE_GLOBAL_TRANSFORM,
  CREATE_LOCAL_TRANSFORM,
  CREATE_ITEM,
  CREATE_RELATION,

  UPDATE_MATERIAL,
  UPDATE_REPRESENTATION,
  UPDATE_SAMPLE,
  UPDATE_GLOBAL_TRANSFORM,
  UPDATE_LOCAL_TRANSFORM,
  UPDATE_ITEM,
  UPDATE_MAX_LOCAL_ID,
  UPDATE_RELATION,
  UPDATE_METADATA,
  UPDATE_SPATIAL_STRUCTURE,

  DELETE_MATERIAL,
  DELETE_REPRESENTATION,
  DELETE_SAMPLE,
  DELETE_GLOBAL_TRANSFORM,
  DELETE_LOCAL_TRANSFORM,
  DELETE_ITEM,
  DELETE_RELATION,
}

/**
 * Names of the edit request types (e.g. to display in a history UI).
 */
export const EditRequestTypeNames: Record<EditRequestType, string> = {
  [EditRequestType.CREATE_MATERIAL]: "Create Material",
  [EditRequestType.CREATE_REPRESENTATION]: "Create Representation",
  [EditRequestType.CREATE_SAMPLE]: "Create Sample",
  [EditRequestType.CREATE_GLOBAL_TRANSFORM]: "Create Global Transform",
  [EditRequestType.CREATE_LOCAL_TRANSFORM]: "Create Local Transform",
  [EditRequestType.CREATE_ITEM]: "Create Item",
  [EditRequestType.CREATE_RELATION]: "Create Relation",

  [EditRequestType.UPDATE_MATERIAL]: "Update Material",
  [EditRequestType.UPDATE_REPRESENTATION]: "Update Representation",
  [EditRequestType.UPDATE_SAMPLE]: "Update Sample",
  [EditRequestType.UPDATE_GLOBAL_TRANSFORM]: "Update Global Transform",
  [EditRequestType.UPDATE_LOCAL_TRANSFORM]: "Update Local Transform",
  [EditRequestType.UPDATE_ITEM]: "Update Item",
  [EditRequestType.UPDATE_MAX_LOCAL_ID]: "Update Max Local Id",
  [EditRequestType.UPDATE_RELATION]: "Update Relation",
  [EditRequestType.UPDATE_METADATA]: "Update Metadata",
  [EditRequestType.UPDATE_SPATIAL_STRUCTURE]: "Update Spatial Structure",

  [EditRequestType.DELETE_MATERIAL]: "Delete Material",
  [EditRequestType.DELETE_REPRESENTATION]: "Delete Representation",
  [EditRequestType.DELETE_SAMPLE]: "Delete Sample",
  [EditRequestType.DELETE_GLOBAL_TRANSFORM]: "Delete Global Transform",
  [EditRequestType.DELETE_LOCAL_TRANSFORM]: "Delete Local Transform",
  [EditRequestType.DELETE_ITEM]: "Delete Item",
  [EditRequestType.DELETE_RELATION]: "Delete Relation",
};

export type EditKey =
  | "MATERIAL"
  | "GLOBAL_TRANSFORM"
  | "LOCAL_TRANSFORM"
  | "SAMPLE"
  | "ITEM"
  | "REPRESENTATION"
  | "RELATION";

/**
 * Base interface for all edit requests.
 */
export interface BaseEditRequest {
  /** The type of the edit request. */
  type: EditRequestType;
  /**
   * The temporary ID of the edit request (optional). This is used to
   * identify the edit request before having a local id (e.g. when
   * chaining requests).
   * */
  tempId?: string;
}

/**
 * Base interface for all update edit requests.
 */
export interface BaseUpdateRequest extends BaseEditRequest {
  /** The local ID of the edit request. */
  localId: number | string;
}

/**
 * Interface for update material edit requests.
 */
export interface UpdateMaterialRequest extends BaseUpdateRequest {
  type: EditRequestType.UPDATE_MATERIAL;
  data: RawMaterial;
}

/**
 * Interface for update representation edit requests.
 */
export interface UpdateRepresentationRequest extends BaseUpdateRequest {
  type: EditRequestType.UPDATE_REPRESENTATION;
  data: RawRepresentation;
}

// We define this type to allow to use temp ids
// More info in the implementation of the edit logic
export type SampleRequestData = Omit<
  RawSample,
  "material" | "representation" | "localTransform" | "item"
> & {
  item: number | string;
  material: number | string;
  representation: number | string;
  localTransform: number | string;
};

/**
 * Interface for update sample edit requests.
 */
export interface UpdateSampleRequest extends BaseUpdateRequest {
  type: EditRequestType.UPDATE_SAMPLE;
  data: SampleRequestData;
}

/**
 * Interface for update global transform edit requests.
 */
export interface UpdateGlobalTransformRequest extends BaseUpdateRequest {
  type: EditRequestType.UPDATE_GLOBAL_TRANSFORM;
  data: RawGlobalTransformData;
}

/**
 * Interface for update local transform edit requests.
 */
export interface UpdateLocalTransformRequest extends BaseUpdateRequest {
  type: EditRequestType.UPDATE_LOCAL_TRANSFORM;
  data: RawTransformData;
}

/**
 * Interface for update item edit requests.
 */
export interface UpdateItemRequest extends BaseUpdateRequest {
  type: EditRequestType.UPDATE_ITEM;
  data: RawItemData;
}

/**
 * Interface for update max local id edit requests.
 */
export interface UpdateMaxLocalIdRequest extends BaseUpdateRequest {
  type: EditRequestType.UPDATE_MAX_LOCAL_ID;
}

/**
 * Interface for update relation edit requests.
 */
export interface UpdateRelationRequest extends BaseUpdateRequest {
  type: EditRequestType.UPDATE_RELATION;
  data: RawRelationData;
}

/**
 * Interface for update metadata edit requests.
 */
export interface UpdateMetadataRequest extends BaseUpdateRequest {
  type: EditRequestType.UPDATE_METADATA;
  data: RawMetadataData;
}

/**
 * Interface for update spatial structure edit requests.
 */
export interface UpdateSpatialStructureRequest extends BaseUpdateRequest {
  type: EditRequestType.UPDATE_SPATIAL_STRUCTURE;
  data: SpatialTreeItem;
}

/**
 * Base interface for all create edit requests.
 */
export interface BaseCreateRequest extends BaseEditRequest {
  // If given, use this local id. If the local id exists, the object is not created.
  localId?: number | string;
}

/**
 * Interface for create sample edit requests.
 */
export interface CreateSampleRequest extends BaseCreateRequest {
  type: EditRequestType.CREATE_SAMPLE;
  data: SampleRequestData;
}

/**
 * Interface for create material edit requests.
 */
export interface CreateMaterialRequest extends BaseCreateRequest {
  type: EditRequestType.CREATE_MATERIAL;
  data: RawMaterial;
}

/**
 * Interface for create representation edit requests.
 */
export interface CreateRepresentationRequest extends BaseCreateRequest {
  type: EditRequestType.CREATE_REPRESENTATION;
  data: RawRepresentation;
}

/**
 * Interface for create global transform edit requests.
 */
export interface CreateGlobalTransformRequest extends BaseCreateRequest {
  type: EditRequestType.CREATE_GLOBAL_TRANSFORM;
  data: RawGlobalTransformData;
}

/**
 * Interface for create local transform edit requests.
 */
export interface CreateLocalTransformRequest extends BaseCreateRequest {
  type: EditRequestType.CREATE_LOCAL_TRANSFORM;
  data: RawTransformData;
}

/**
 * Interface for create item edit requests.
 */
export interface CreateItemRequest extends BaseCreateRequest {
  type: EditRequestType.CREATE_ITEM;
  data: RawItemData;
}

/**
 * Interface for create relation edit requests.
 */
export interface CreateRelationRequest extends BaseCreateRequest {
  type: EditRequestType.CREATE_RELATION;
  data: RawRelationData;
}

/**
 * Interface for delete material edit requests.
 */
export interface DeleteMaterialRequest extends BaseUpdateRequest {
  type: EditRequestType.DELETE_MATERIAL;
}

/**
 * Interface for delete representation edit requests.
 */
export interface DeleteRepresentationRequest extends BaseUpdateRequest {
  type: EditRequestType.DELETE_REPRESENTATION;
}

/**
 * Interface for delete sample edit requests.
 */
export interface DeleteSampleRequest extends BaseUpdateRequest {
  type: EditRequestType.DELETE_SAMPLE;
}

/**
 * Interface for delete global transform edit requests.
 */
export interface DeleteGlobalTransformRequest extends BaseUpdateRequest {
  type: EditRequestType.DELETE_GLOBAL_TRANSFORM;
}

/**
 * Interface for delete local transform edit requests.
 */
export interface DeleteLocalTransformRequest extends BaseUpdateRequest {
  type: EditRequestType.DELETE_LOCAL_TRANSFORM;
}

/**
 * Interface for delete item edit requests.
 */
export interface DeleteItemRequest extends BaseUpdateRequest {
  type: EditRequestType.DELETE_ITEM;
}

/**
 * Interface for delete relation edit requests.
 */
export interface DeleteRelationRequest extends BaseUpdateRequest {
  type: EditRequestType.DELETE_RELATION;
}

/**
 * Type for update edit requests.
 */
export type UpdateRequest =
  | UpdateMaterialRequest
  | UpdateRepresentationRequest
  | UpdateSampleRequest
  | UpdateGlobalTransformRequest
  | UpdateLocalTransformRequest
  | UpdateItemRequest
  | UpdateMaxLocalIdRequest
  | UpdateRelationRequest
  | UpdateMetadataRequest
  | UpdateSpatialStructureRequest;

/**
 * Type for create edit requests.
 */
export type CreateRequest =
  | CreateMaterialRequest
  | CreateRepresentationRequest
  | CreateSampleRequest
  | CreateGlobalTransformRequest
  | CreateLocalTransformRequest
  | CreateItemRequest
  | CreateRelationRequest;

/**
 * Type for delete edit requests.
 */
export type DeleteRequest =
  | DeleteMaterialRequest
  | DeleteRepresentationRequest
  | DeleteSampleRequest
  | DeleteGlobalTransformRequest
  | DeleteLocalTransformRequest
  | DeleteItemRequest
  | DeleteRelationRequest;

/**
 * Type for all edit requests.
 */
export type EditRequest = UpdateRequest | CreateRequest | DeleteRequest;
