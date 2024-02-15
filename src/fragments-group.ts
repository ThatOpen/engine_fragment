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

  properties?: IfcProperties;

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
    this.properties = {};
    this.removeFromParent();
    this.items = [];
    this.ifcCivil = undefined;
  }
}
