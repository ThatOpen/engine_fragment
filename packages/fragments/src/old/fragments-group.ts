import * as THREE from "three";
import { Fragment } from "./fragment";
import { AlignmentObject, CivilCurve } from "./civil";
import { IfcProperties, IfcMetadata, FragmentIdMap } from "./base-types";
import { StreamerFileDb } from "./streamer-file-db";

export class FragmentsGroup extends THREE.Group {
  static fetch = async (url: string): Promise<File | Response> => {
    return fetch(`${FragmentsGroup.url}${url}`);
  };

  static constructFileName: ((id: number) => string) | null = null;

  static url = "";

  static useCache = true;

  static propertiesDB: StreamerFileDb | null = null;

  items: Fragment[] = [];

  boundingBox = new THREE.Box3();

  coordinationMatrix = new THREE.Matrix4();

  keyFragments = new Map<number, string>();

  globalToExpressIDs = new Map<string, number>();

  data = new Map<number, [number[], number[]]>();

  geometryIDs = {
    opaque: new Map<number, number>(),
    transparent: new Map<number, number>(),
  };

  ifcMetadata: IfcMetadata = {
    name: "",
    description: "",
    schema: "IFC2X3",
    maxExpressID: 0,
  };

  civilData?: {
    coordinationMatrix: THREE.Matrix4;
    alignments: Map<number, AlignmentObject>;
  };

  streamSettings: {
    baseUrl?: string;
    baseFileName: string;
    ids: Map<number, number>;
    types: Map<number, number[]>;
  } = {
    baseFileName: "",
    ids: new Map<number, number>(),
    types: new Map<number, number[]>(),
  };

  isStreamed = false;

  get hasProperties() {
    const hasLocalProps = this._properties !== undefined;
    const hasStreamProps = this.streamSettings.ids.size !== 0;
    return hasLocalProps || hasStreamProps;
  }

  protected _properties?: IfcProperties;

  getFragmentMap(expressIDs: Iterable<number> = this.data.keys()) {
    const fragmentMap: FragmentIdMap = {};
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

  setLocalProperties(properties: IfcProperties) {
    this._properties = properties;
  }

  getLocalProperties() {
    return this._properties;
  }

  getAllPropertiesIDs() {
    if (this._properties) {
      // If local properties exist, return the IDs from the properties object
      return Object.keys(this._properties).map((id) => parseInt(id, 10));
    }
    // If no local properties exist, return the IDs from the streamSettings.ids Map
    return Array.from(this.streamSettings.ids.keys());
  }

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
