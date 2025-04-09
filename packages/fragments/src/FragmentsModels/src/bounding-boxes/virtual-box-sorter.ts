import * as THREE from "three";
import { DataBuffer } from "../model/model-types";
import { VirtualBoxController } from "./virtual-box-controller";

export class VirtualBoxSorter {
  private _boxes: VirtualBoxController;
  private _total = new THREE.Vector3();
  private _change = new THREE.Vector3();
  private _average = new THREE.Vector3();
  private _tempCenterVector = new THREE.Vector3();
  private _tempVectors = {
    x: new THREE.Vector3(),
    y: new THREE.Vector3(),
    z: new THREE.Vector3(),
  };

  constructor(boxes: VirtualBoxController) {
    this._boxes = boxes;
  }

  sort(dataBuffer: DataBuffer, a: number, b: number) {
    this.average(this._average, dataBuffer, a, b);
    this.getDataToTotal(a, b, dataBuffer);
    let result = this.anySort(a, b, dataBuffer);
    result = this.adjust(b, a, result);
    return Math.round(result);
  }

  private anySort(a: number, b: number, dataBuffer: DataBuffer) {
    if (this._total.x > this._total.y) {
      if (this._total.x > this._total.z) {
        return this.sortDim("x", this._average.x, a, b, dataBuffer);
      }
      return this.sortDim("z", this._average.z, a, b, dataBuffer);
    }
    if (this._total.y > this._total.z) {
      return this.sortDim("y", this._average.y, a, b, dataBuffer);
    }
    return this.sortDim("z", this._average.z, a, b, dataBuffer);
  }

  private getDataToTotal(a: number, b: number, dataBuffer: DataBuffer) {
    this._total.set(0, 0, 0);
    for (let i = a; i < b; i++) {
      const box = this._boxes.get(dataBuffer[i]);
      box.getCenter(this._change).sub(this._average);
      const deltaSquared = this._change.multiply(this._change);
      this._total.add(deltaSquared);
    }
  }

  private sortDim(
    dimension: "x" | "y" | "z",
    threshold: number,
    first: number,
    second: number,
    elements: DataBuffer,
  ) {
    let position = first;
    for (let i = first; i < second; i++) {
      const value = this.getValue(elements, i, dimension);
      if (value > threshold) {
        this.exchange(i, position, elements);
        position++;
      }
    }
    return position;
  }

  private exchange(first: number, second: number, elements: DataBuffer) {
    const value = elements[first];
    elements[first] = elements[second];
    elements[second] = value;
  }

  private getValue(
    elements: DataBuffer,
    i: number,
    dimension: "x" | "y" | "z",
  ) {
    const box = this.getBox(elements, i);
    const vector = this._tempVectors[dimension];
    const value = box.getCenter(vector)[dimension];
    return value;
  }

  private average(
    result: THREE.Vector3,
    elements: DataBuffer,
    first: number,
    second: number,
  ) {
    const box = this.getBox(elements, first);
    box.getCenter(result);
    this.aggregate(first, second, elements, box, result);
    return result.divideScalar(second - first);
  }

  private aggregate(
    first: number,
    second: number,
    elements: DataBuffer,
    box: THREE.Box3,
    result: THREE.Vector3,
  ) {
    for (let i = first + 1; i < second; i++) {
      const current = elements[i];
      box = this._boxes.get(current);
      const center = box.getCenter(this._tempCenterVector);
      result.add(center);
    }
  }

  private adjust(b: number, a: number, result: number) {
    const correction = (a + b) / 2;
    const diff = b - a;
    const factor = diff / 3;
    if (result <= a + factor) {
      result = correction;
    } else if (result >= b - 1 - factor) {
      result = correction;
    }
    return result;
  }

  private getBox(elements: DataBuffer, index: number) {
    const selected = elements[index];
    return this._boxes.get(selected);
  }
}
