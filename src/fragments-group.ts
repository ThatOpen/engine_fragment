import * as THREE from "three";
import { Fragment } from "./fragment";
import { IfcAlignmentData } from "./alignment";
import { IfcProperties, IfcMetadata, FragmentIdMap } from "./base-types";

// TODO: Document this
export class FragmentsGroup extends THREE.Group {
  items: Fragment[] = [];

  boundingBox = new THREE.Box3();

  coordinationMatrix = new THREE.Matrix4();

  // Keys are uints mapped with fragmentIDs to save memory
  keyFragments = new Map<number, string>();

  // Map<expressID, [keys, rels]>
  // keys = fragmentKeys to which this asset belongs
  // rels = [floor, categoryid]
  data = new Map<number, [number[], number[]]>();

  // [geometryID, key]
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

  ifcCivil?: {
    horizontalAlignments: IfcAlignmentData;
    verticalAlignments: IfcAlignmentData;
    realAlignments: IfcAlignmentData;
  };

  streamSettings = {
    baseUrl: "",
    baseFileName: "",
    ids: new Map<number, number>(),
    types: new Map<number, number[]>(),
  };

  protected _properties?: IfcProperties;

  getFragmentMap(expressIDs: Iterable<number>) {
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
    this.ifcCivil = undefined;
  }

  getProperties(id: number): IfcProperties | null {
    if (!this._properties) {
      throw new Error("Properties not initialized!");
    }
    return this._properties[id] || null;
  }

  async streamProperties(id: number): Promise<IfcProperties | null> {
    const { baseUrl, baseFileName, ids } = this.streamSettings;
    const fileID = ids.get(id);
    if (fileID === undefined) {
      return null;
    }

    const url = baseUrl + baseFileName + fileID;
    const fetched = await fetch(url);
    const data = await fetched.json();
    return data[id];
  }

  getAllPropertiesOfType(type: number): IfcProperties | null {
    if (!this._properties) {
      throw new Error("Properties not initialized!");
    }
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

  async streamAllPropertiesOfType(type: number): Promise<IfcProperties | null> {
    const { baseUrl, baseFileName, types } = this.streamSettings;
    const fileID = types.get(type);
    if (fileID === undefined) {
      return null;
    }

    const url = baseUrl + baseFileName + fileID;
    const fetched = await fetch(url);
    return fetched.json();
  }
}
