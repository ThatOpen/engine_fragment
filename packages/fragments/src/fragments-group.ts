import * as THREE from "three";
import { Fragment } from "./fragment";
import { Alignment, CivilCurve } from "./civil";
import { IfcProperties, IfcMetadata, FragmentIdMap } from "./base-types";
import { StreamerFileDb } from "./streamer-file-db";

/**
 * A class representing a group of 3D fragments. This class extends THREE.Group and adds additional properties and methods for managing and interacting with the fragments it contains.
 */
export class FragmentsGroup extends THREE.Group {
  static fetch = async (url: string): Promise<File | Response> => {
    return fetch(`${FragmentsGroup.url}${url}`);
  };

  static constructFileName: ((id: number) => string) | null = null;

  /**
   * Default URL for requesting property tiles. Feel free to change this, or override the FragmentsGroup.fetch method for more granular control.
   */
  static url = "";

  /**
   * Whether to use local cache when streaming properties.
   */
  static useCache = true;

  /**
   * The object in charge of caching property files locally to save requests over the network.
   */
  static propertiesDB: StreamerFileDb | null = null;

  /**
   * An array of Fragment objects that are part of this group.
   */
  items: Fragment[] = [];

  /**
   * A THREE.Box3 object representing the bounding box of all fragments in this group.
   */
  boundingBox = new THREE.Box3();

  /**
   * A THREE.Matrix4 object representing the coordination matrix of this group.
   */
  coordinationMatrix = new THREE.Matrix4();

  /**
   * A Map object where the keys are uints and the values are strings representing fragment IDs.
   * This is used to save memory by mapping keys to fragment IDs.
   */
  keyFragments = new Map<number, string>();

  /**
   * A Map object where the keys are global IDs and the values are expressIDs.
   */
  globalToExpressIDs = new Map<string, number>();

  /**
   * A Map object where the keys are express IDs and the values are arrays of two arrays.
   * The first array contains fragment keys to which this asset belongs, and the second array contains floor and category IDs.
   */
  data = new Map<number, [number[], number[]]>();

  /**
   * An object with two Map properties, 'opaque' and 'transparent', representing the geometry IDs and keys of opaque and transparent fragments. They must be distinguished because THREE.js doesn't support transparency per instance in InstancedMesh.
   */
  geometryIDs = {
    opaque: new Map<number, number>(),
    transparent: new Map<number, number>(),
  };

  /**
   * An object representing metadata about the IFC model defined by the IFC schema.
   */
  ifcMetadata: IfcMetadata = {
    name: "",
    description: "",
    schema: "IFC2X3",
    maxExpressID: 0,
  };

  /**
   * An optional object containing civil engineering data.
   */
  civilData?: {
    coordinationMatrix: THREE.Matrix4;
    alignments: Map<number, Alignment>;
  };

  /**
   * An object containing settings for streaming data, including base URL, base file name, IDs, and types.
   */
  streamSettings: {
    /**
     * @deprecated use FragmentsGroup.baseUrl instead
     */
    baseUrl?: string;
    baseFileName: string;
    ids: Map<number, number>;
    types: Map<number, number[]>;
  } = {
    baseFileName: "",
    ids: new Map<number, number>(),
    types: new Map<number, number[]>(),
  };

  /**
   * Whether this fragments group is being streamed or not.
   */
  isStreamed = false;

  /**
   * A getter that checks if this group has properties, either locally defined or streamed from a data source.
   */
  get hasProperties() {
    const hasLocalProps = this._properties !== undefined;
    const hasStreamProps = this.streamSettings.ids.size !== 0;
    return hasLocalProps || hasStreamProps;
  }

  /**
   * A protected property representing local properties of the fragments in this group.
   */
  protected _properties?: IfcProperties;

  /**
   * A method to create a map of fragment IDs and express IDs contained within them. This is useful because if you want to get "a chair", it might be made of 4 different geometries, and thus the subsets of 4 different fragments. Using this method, you would get exactly the fragments of where that chair is.
   * @param expressIDs - An iterable of express IDs to create the map for. If not provided, returns the fragment ID map for the whole group.
   * @returns A map where the keys are fragment IDs and the values are sets of express IDs.
   */
  getFragmentMap(expressIDs?: Iterable<number>) {
    const fragmentMap: FragmentIdMap = {};

    if (!expressIDs) {
      for (const item of this.items) {
        fragmentMap[item.id] = new Set(item.ids);
      }
      return fragmentMap;
    }

    for (const expressID of expressIDs) {
      const data = this.data.get(expressID);
      if (!data) continue;
      for (const key of data[0]) {
        const fragmentID = this.keyFragments.get(key);
        if (fragmentID === undefined) continue;
        if (!fragmentMap[fragmentID]) {
          fragmentMap[fragmentID] = new Set();
        }
        fragmentMap[fragmentID].add(expressID);
      }
    }
    return fragmentMap;
  }

  /**
   * Method to retrieve the vertices of a specific item within the fragments.
   * This method finds the fragments that contain the specified item,
   * then retrieves the vertices of those fragments.
   *
   * @param itemID - The ID of the item for which to retrieve vertices. Usually, an IFC expressID.
   * @returns An array of THREE.Vector3 objects representing the vertices of the specified item.
   *
   * @example
   * ```typescript
   * const itemVertices = fragmentsGroup.getItemVertices(12345);
   * for (const vertex of itemVertices) {
   *   console.log(`Vertex: ${vertex.x}, ${vertex.y}, ${vertex.z}`);
   * }
   * ```
   */
  getItemVertices(itemID: number) {
    const vertices: THREE.Vector3[] = [];
    const fragmentIdMap = this.getFragmentMap([itemID]);
    for (const fragmentID in fragmentIdMap) {
      const fragment = this.items.find(
        (fragment) => fragment.id === fragmentID,
      );
      if (!fragment) continue;
      const itemInstances = fragment.getInstancesIDs(itemID);
      if (!itemInstances) continue;
      for (const instance of itemInstances) {
        const matrix = new THREE.Matrix4();
        fragment.mesh.getMatrixAt(instance, matrix);
        for (const vertex of fragment.uniqueVertices) {
          const vector = vertex.clone().applyMatrix4(matrix);
          vertices.push(vector);
        }
      }
    }
    return vertices;
  }

  /**
   * Enables or disables the local property caching system.
   *
   * @param enabled - Whether to enable or disable it.
   */
  static setPropertiesDB(enabled: boolean) {
    if (enabled) {
      if (!FragmentsGroup.propertiesDB) {
        FragmentsGroup.propertiesDB = new StreamerFileDb(
          "that-open-company-streaming-properties",
        );
      }
    } else if (!enabled) {
      if (FragmentsGroup.propertiesDB) {
        FragmentsGroup.propertiesDB.dispose();
      }
    }
  }

  /**
   * Method to dispose of the resources used by the FragmentsGroup.
   *
   * @param disposeResources - If true, also dispose of the resources used by the fragments (geometries and materials). Default is true.
   */
  dispose(disposeResources = true) {
    for (const fragment of this.items) {
      fragment.dispose(disposeResources);
    }
    this.coordinationMatrix = new THREE.Matrix4();
    this.keyFragments.clear();
    this.data.clear();
    this._properties = {};
    this.removeFromParent();
    this.items = [];
    if (this.civilData) {
      const { alignments } = this.civilData;
      for (const [_id, alignment] of alignments) {
        this.disposeAlignment(alignment.vertical);
        this.disposeAlignment(alignment.horizontal);
        this.disposeAlignment(alignment.absolute);
      }
    }
    this.civilData = undefined;
  }

  /**
   * Method to set local properties of the fragments in this group.
   *
   * @param properties - An object containing properties of type IfcProperties.
   * The keys of the object are express IDs as strings, and the values are objects representing the properties of the corresponding express ID.
   *
   * @example
   * ```typescript
   * const properties: IfcProperties = {
   *   "12345": {
   *     name: "Chair",
   *     type: 1001,
   *     color: [0.5, 0.5, 0.5],
   *     //... other properties
   *   },
   *   "67890": {
   *     name: "Table",
   *     type: 1002,
   *     color: [0.8, 0.8, 0.8],
   *     //... other properties
   *   },
   *   //... more properties
   * };
   *
   * fragmentsGroup.setLocalProperties(properties);
   * ```
   */
  setLocalProperties(properties: IfcProperties) {
    this._properties = properties;
  }

  /**
   * Method to retrieve the local properties of the fragments in this group.
   *
   * @returns {IfcProperties | undefined} - An object containing properties of type IfcProperties.
   * The keys of the object are express IDs as strings, and the values are objects representing the properties of the corresponding express ID.
   * If no local properties are set, it returns `undefined`.
   *
   * @example
   * ```typescript
   * const properties = fragmentsGroup.getLocalProperties();
   * if (properties) {
   *   for (const id in properties) {
   *     const property = properties[id];
   *     console.log(`ID: ${id}, Name: ${property.name}, Type: ${property.type}`);
   *   }
   * }
   * ```
   */
  getLocalProperties() {
    return this._properties;
  }

  /**
   * Method to retrieve all property IDs from either local properties or streamed properties.
   *
   * @returns {number[]} - An array of property IDs.
   *
   * @example
   * ```typescript
   * const propertyIDs = fragmentsGroup.getAllPropertiesIDs();
   * console.log(propertyIDs); // Output: [12345, 67890,...]
   * ```
   */
  getAllPropertiesIDs() {
    if (this._properties) {
      // If local properties exist, return the IDs from the properties object
      return Object.keys(this._properties).map((id) => parseInt(id, 10));
    }
    // If no local properties exist, return the IDs from the streamSettings.ids Map
    return Array.from(this.streamSettings.ids.keys());
  }

  /**
   * Method to retrieve all property types from either local properties or streamed properties.
   *
   * @returns {number[]} - An array of unique property types.
   *
   * @example
   * ```typescript
   * const propertyTypes = fragmentsGroup.getAllPropertiesTypes();
   * console.log(propertyTypes); // Output: [1001, 1002,...]
   * ```
   */
  getAllPropertiesTypes() {
    // If local properties exist, extract and return unique property types from the properties object
    if (this._properties) {
      const types = new Set<number>();
      for (const id in this._properties) {
        const property = this._properties[id];
        if (property.type !== undefined) {
          types.add(property.type);
        }
      }
      return Array.from(types);
    }

    // If no local properties exist, return unique property types from the streamSettings.types Map
    return Array.from(this.streamSettings.types.keys());
  }

  async getProperties(
    id: number,
  ): Promise<{ [attribute: string]: any } | null> {
    if (this._properties) {
      return this._properties[id] || null;
    }

    const url = this.getPropsURL(id);
    const data = await this.getPropertiesData(url);
    return data ? data[id] : null;
  }

  /**
   * Method to set properties of a specific fragment in this group.
   *
   * @param id - The ID of the fragment for which to set properties.
   * @param value - The new properties to set for the fragment. If null, it deletes the properties for the fragment.
   * @throws Will throw an error if writing streamed properties, as it is not supported yet.
   *
   * @example
   * ```typescript
   * const properties: IfcProperties = {
   *   "12345": {
   *     name: "Chair",
   *     type: 1001,
   *     color: [0.5, 0.5, 0.5],
   *     //... other properties
   *   },
   * };
   *
   * fragmentsGroup.setProperties(12345, properties[12345]);
   * ```
   */
  async setProperties(id: number, value: { [attribute: string]: any } | null) {
    if (this._properties) {
      if (value !== null) {
        this._properties[id] = value;
      } else {
        delete this._properties[id];
      }
      return;
    }

    throw new Error("Writing streamed properties not supported yet!");

    // // TODO: Fix this

    // const url = this.getPropsURL(id);
    // const data = await this.getPropertiesData(url);
    // if (value !== null) {
    //   data[id] = value;
    // } else {
    //   delete data[id];
    // }

    // // TODO: Finish defining this

    // const formData = new FormData();
    // formData.append("file", JSON.stringify(data));
    // await fetch("api/KJAKDSJFAKÑSDFJAÑSFJDAÑJFÑA", {
    //   body: formData,
    //   method: "post",
    // });
  }

  /**
   * Method to retrieve all properties of a specific type from either local properties or streamed properties.
   *
   * @param type - The type of properties to retrieve.
   * @returns A Promise that resolves to an object containing properties of type IfcProperties, or null if no properties of the specified type are found.
   *
   * @example
   * ```typescript
   * const type = 1001; // Example type
   * fragmentsGroup.getAllPropertiesOfType(type).then((properties) => {
   *   if (properties) {
   *     for (const id in properties) {
   *       const property = properties[id];
   *       console.log(`ID: ${id}, Name: ${property.name}, Type: ${property.type}`);
   *     }
   *   } else {
   *     console.log(`No properties of type ${type} found.`);
   *   }
   * });
   * ```
   */
  async getAllPropertiesOfType(type: number): Promise<IfcProperties | null> {
    if (this._properties) {
      const result: IfcProperties = {};
      let found = false;
      for (const id in this._properties) {
        const item = this._properties[id];
        if (item.type === type) {
          result[item.expressID] = item;
          found = true;
        }
      }
      return found ? result : null;
    }

    const { types } = this.streamSettings;
    const fileIDs = types.get(type);
    if (fileIDs === undefined) {
      return null;
    }

    const result: IfcProperties = {};
    for (const fileID of fileIDs) {
      const name = this.constructFileName(fileID);
      const data = await this.getPropertiesData(name);
      for (const key in data) {
        result[parseInt(key, 10)] = data[key];
      }
    }

    return result;
  }

  clone(_recursive?: boolean): any {
    throw new Error("Use FragmentsGroup.cloneGroup instead!");
  }

  /**
   * Creates a copy of the whole group or a part of it. Each fragment clone shares the geometry of with its respective original fragment, but has its own InstancedMesh data, so it also needs to be disposed.
   *
   * @param items - Optional - The part of the group to be cloned. If not given, the whole group is cloned.
   *
   */
  cloneGroup(items?: FragmentIdMap) {
    const newGroup = new FragmentsGroup();

    newGroup.coordinationMatrix = this.coordinationMatrix;
    newGroup.position.copy(this.position);
    newGroup.rotation.copy(this.rotation);
    newGroup.scale.copy(this.scale);
    newGroup.updateMatrix();

    newGroup.ifcMetadata = { ...this.ifcMetadata };

    if (!items) {
      items = this.getFragmentMap(this.data.keys());
    }

    const allIDs = new Set<number>();

    const fragmentIDConversion = new Map<string, string>();

    for (const fragment of this.items) {
      if (!items[fragment.id]) {
        continue;
      }

      const ids = items[fragment.id];
      const newFragment = fragment.clone(ids);

      fragmentIDConversion.set(fragment.id, newFragment.id);

      newGroup.items.push(newFragment);
      newGroup.add(newFragment.mesh);

      for (const expressID of ids) {
        allIDs.add(expressID);
      }
    }

    for (const id of allIDs) {
      const data = this.data.get(id);
      if (data) {
        newGroup.data.set(id, data);
      }
    }

    for (const [fragKey, fragID] of this.keyFragments) {
      if (fragmentIDConversion.has(fragID)) {
        const newID = fragmentIDConversion.get(fragID);
        if (newID === undefined) {
          throw new Error("Malformed fragment ID map during clone!");
        }
        newGroup.keyFragments.set(fragKey, newID);
      }
    }

    for (const [globalID, expressID] of this.globalToExpressIDs) {
      if (allIDs.has(expressID)) {
        newGroup.globalToExpressIDs.set(globalID, expressID);
      }
    }

    if (this.civilData) {
      newGroup.civilData = {
        coordinationMatrix: this.coordinationMatrix,
        alignments: new Map(),
      };
    }

    return newGroup as this;
  }

  private getPropsURL(id: number) {
    const { ids } = this.streamSettings;
    const fileID = ids.get(id);
    if (fileID === undefined) {
      throw new Error("ID not found");
    }
    return this.constructFileName(fileID);
  }

  private async getPropertiesData(name: string) {
    // deprecated
    if (this.streamSettings.baseUrl?.length) {
      console.warn(
        "streamSettings.baseUrl is deprecated. Use FragmentsGroup.url instead.",
      );
      FragmentsGroup.url = this.streamSettings.baseUrl;
    }

    let fetched: string;

    // If this file is in the local cache, get it
    if (FragmentsGroup.useCache) {
      // Add or update this file to clean it up from indexedDB automatically later

      let found: File | null = null;

      if (FragmentsGroup.propertiesDB) {
        found = await FragmentsGroup.propertiesDB.get(name);
      }

      if (found) {
        fetched = await found.text();
      } else {
        const dataFromBackend = await FragmentsGroup.fetch(name);
        fetched = await dataFromBackend.text();

        if (FragmentsGroup.propertiesDB) {
          const encoder = new TextEncoder();
          const buffer = encoder.encode(fetched);
          await FragmentsGroup.propertiesDB.add(name, buffer);
        }
      }
    } else {
      const dataFromBackend = await FragmentsGroup.fetch(name);
      fetched = await dataFromBackend.text();
    }

    return JSON.parse(fetched);
  }

  private constructFileName(fileID: number) {
    if (FragmentsGroup.constructFileName) {
      return FragmentsGroup.constructFileName(fileID);
    }
    const { baseFileName } = this.streamSettings;
    return `${baseFileName}-${fileID}`;
  }

  private disposeAlignment(alignment: CivilCurve[]) {
    for (const curve of alignment) {
      curve.mesh.geometry.dispose();
      if (Array.isArray(curve.mesh.material)) {
        for (const mat of curve.mesh.material) {
          mat.dispose();
        }
      } else {
        curve.mesh.material.dispose();
      }
    }
    alignment.length = 0;
  }
}
