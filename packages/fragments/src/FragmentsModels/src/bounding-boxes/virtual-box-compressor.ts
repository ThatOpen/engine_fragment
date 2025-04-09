import * as THREE from "three";
import { VirtualBox } from "./virtual-box";
import { VirtualBoxController } from "./virtual-box-controller";

export class VirtualBoxCompressor {
  private _boxes: VirtualBoxController;
  private _min = new THREE.Vector3();
  private _max = new THREE.Vector3();

  constructor(boxes: VirtualBoxController) {
    this._boxes = boxes;
  }

  inflate(bounds: VirtualBox): THREE.Box3 {
    const offset = this._boxes.fullBox.min;
    const min = this.getVector(bounds, offset, "min");
    const max = this.getVector(bounds, offset, "max");
    return new THREE.Box3(min, max);
  }

  deflate(bounds: THREE.Box3, result: VirtualBox) {
    this.read(bounds);
    const data: number[] = [];
    data.push(this._min.x, this._min.y, this._min.z);
    data.push(this._max.x, this._max.y, this._max.z);
    result.set(data);
  }

  private getVector(
    bounds: VirtualBox,
    offset: THREE.Vector3,
    value: "min" | "max",
  ) {
    const x = bounds.get("x", value) + offset.x;
    const y = bounds.get("y", value) + offset.y;
    const z = bounds.get("z", value) + offset.z;
    return new THREE.Vector3(x, y, z);
  }

  private read(bounds: THREE.Box3) {
    const { min } = this._boxes.fullBox;
    this._min.subVectors(bounds.min, min);
    this._max.subVectors(bounds.max, min);
  }
}
