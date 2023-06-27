import * as THREE from "three";
import { Fragment } from "./fragment";

export class FragmentsGroup extends THREE.Group {
  items: Fragment[] = [];
  matrix = new THREE.Matrix4();
  keys: { [key: number]: string } = {};
  data: { [expressID: number]: number[] } = {};
  properties: any;

  dispose(disposeResources = true) {
    for (const fragment of this.items) {
      fragment.dispose(disposeResources);
    }
    this.matrix = new THREE.Matrix4();
    this.keys = {};
    this.data = {};
    this.properties = {};
  }
}
