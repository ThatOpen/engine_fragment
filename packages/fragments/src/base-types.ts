import * as THREE from "three";

/**
 * Represents an item in the 3D model.
 *
 * @remarks
 * Each item has a unique identifier, a list of transformation matrices, and optionally, a list of colors.
 *
 */
export interface Item {
  /**
   * The unique identifier of the item.
   */
  id: number;

  /**
   * A list of transformation matrices representing the position, rotation, and scale of the item.
   */
  transforms: THREE.Matrix4[];

  /**
   * An optional list of colors associated with the item.
   */
  colors?: THREE.Color[];
}

/**
 * Represents a map of IFC properties.
 *
 * @remarks
 * Each property is associated with an expressID, which is a unique identifier for the IFC entity.
 * The properties are stored as an object with attribute names as keys and their corresponding values.
 *
 * @example
 * ```typescript
 * const ifcProperties: IfcProperties = {
 *   123: { name: "Wall", color: "red" },
 *   456: { name: "Door", height: 2.1 },
 * };
 * ```
 */
export interface IfcProperties {
  /**
   * The unique identifier of the IFC entity.
   */
  [expressID: number]: {
    /**
     * The attribute name of the property.
     */
    [attribute: string]: any;
  };
}
/**
 * Represents the version of the IFC schema used in the model.
 *
 * @remarks
 * The supported IFC schemas are:
 * - IFC2X3
 * - IFC4
 * - IFC4X3
 */
export type IfcSchema = "IFC2X3" | "IFC4" | "IFC4X3";

/**
 * Represents metadata related to the IFC model.
 *
 * @remarks
 * This interface contains information about the name, description, schema version, and the maximum expressID of the IFC model.
 *
 * @example
 * ```typescript
 * const ifcMetadata: IfcMetadata = {
 *   name: "My IFC Model",
 *   description: "A sample IFC model",
 *   schema: "IFC4X3",
 *   maxExpressID: 12345,
 * };
 * ```
 */
export interface IfcMetadata {
  /**
   * The name of the IFC model.
   */
  name: string;

  /**
   * A brief description of the IFC model.
   */
  description: string;

  /**
   * The version of the IFC schema used in the model.
   *
   * @remarks
   * The supported IFC schemas are:
   * - IFC2X3
   * - IFC4
   * - IFC4X3
   */
  schema: IfcSchema;

  /**
   * The maximum expressID of the IFC model.
   *
   * @remarks
   * The expressID is a unique identifier for each IFC entity.
   */
  maxExpressID: number;
}

/**
 * A map that associates each fragmentID with a set of item IDs.
 *
 * @remarks
 * This map is used to efficiently retrieve the item IDs associated with a given fragmentID.
 * Each fragmentID is a unique identifier for a 3D model fragment, and the corresponding set of item IDs
 * represents the items that are part of that fragment. Generally, the item ID correspond to the express ID of the IFC used to generate the fragments.
 *
 * @example
 * ```typescript
 * const fragmentIdMap: FragmentIdMap = {
 *   "fragment1": new Set([1, 2, 3]),
 *   "fragment2": new Set([4, 5]),
 * };
 * ```
 *
 * @template fragmentID - The type of the fragmentID. In this case, it is a string.
 * @template itemID - The type of the itemID. In this case, it is a number.
 */
export interface FragmentIdMap {
  [fragmentID: string]: Set<number>;
}

/**
 * Represents a map of streamed geometries.
 *
 * @remarks
 * This map is used to store the position, normal, and index arrays of each geometry.
 * Each geometry is associated with a unique identifier (number) which usually corresponds to the ExpressID of the geometry in the IFC file that was used to generate the fragments.
 *
 * @example
 * ```typescript
 * const streamedGeometries: StreamedGeometries = new Map([
 *   [1, { position: new Float32Array([0, 0, 0]), normal: new Float32Array([0, 1, 0]), index: new Uint32Array([0, 1, 2]) }],
 *   [2, { position: new Float32Array([1, 0, 0]), normal: new Float32Array([0, 1, 0]), index: new Uint32Array([3, 4, 5]) }],
 * ]);
 * ```
 *
 * @template number - The type of the geometry identifier. In this case, it is a number.
 * @template {object} - The type of the geometry data. It contains position, normal, and index arrays.
 * @template {Float32Array} - The type of the position array.
 * @template {Float32Array} - The type of the normal array.
 * @template {Uint32Array} - The type of the index array.
 */
export type StreamedGeometries = Map<
  number,
  { position: Float32Array; normal: Float32Array; index: Uint32Array }
>;

/**
 * Represents a THREE.js geometry with an index attribute. We always work with indexed geometries, and this allows us to not check the existence of the index attribute each time we access it.
 *
 * @remarks
 * This interface extends the `THREE.BufferGeometry` class and adds an `index` attribute of type `THREE.BufferAttribute`.
 * The `index` attribute is used to define the order of vertices in the geometry.
 *
 * @extends THREE.BufferGeometry
 * @property {THREE.BufferAttribute} index - The index attribute of the geometry.
 */
export interface IndexedGeometry extends THREE.BufferGeometry {
  index: THREE.BufferAttribute;
}
