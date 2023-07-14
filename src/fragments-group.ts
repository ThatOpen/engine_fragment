import * as THREE from "three";
import { Fragment } from "./fragment";

// TODO: Document this
export class FragmentsGroup extends THREE.Group {
  items: Fragment[] = [];
  matrix = new THREE.Matrix4();
  keyFragments: { [key: number]: string } = {};
  // data: [expressID: number]: [keys, rels]
  data: { [expressID: number]: [number[], number[]] } = {};
  properties: any;
  ifcMetadata = {
    name: "",
    description: "",
    schema: "",
    maxExpressId: 0,
  };

  dispose(disposeResources = true) {
    for (const fragment of this.items) {
      fragment.dispose(disposeResources);
    }
    this.matrix = new THREE.Matrix4();
    this.keyFragments = {};
    this.data = {};
    this.properties = {};
  }
}
