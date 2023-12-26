import * as THREE from "three";
import { Fragment } from "./fragment";
import { IfcAlignmentData } from "./alignment";
import { IfcProperties, IfcMetadata, FragmentIdMap } from "./base-types";

// TODO: Document this
export class FragmentsGroup extends THREE.Group {
  items: Fragment[] = [];
  boundingBox = new THREE.Box3();

  coordinationMatrix = new THREE.Matrix4();
  keyFragments: { [key: number]: string } = {};
  // data: [expressID: number]: [keys, rels]
  data: { [expressID: string]: [number[], number[]] } = {};
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

  // TODO: Force all item IDs to be numbers or strings
  getFragmentMap(expressIDs: Set<string> | string[]) {
    const fragmentMap: FragmentIdMap = {};
    for (const expressID of expressIDs) {
      const data = this.data[expressID];
      if (!data) continue;
      for (const key of data[0]) {
        const fragmentID = this.keyFragments[key];
        if (!fragmentMap[fragmentID]) fragmentMap[fragmentID] = new Set();
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
    this.keyFragments = {};
    this.data = {};
    this.properties = {};
  }
}
