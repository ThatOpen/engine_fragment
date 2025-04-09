import { DataBuffer } from "../model/model-types";
import { VirtualBox } from "./virtual-box";
import { VirtualBoxCompressor } from "./virtual-box-compressor";
import { VirtualBoxController } from "./virtual-box-controller";
import { VirtualBoxSorter } from "./virtual-box-sorter";
import { VirtualSpatialPoint } from "./virtual-spatial-point";

export class VirtualBoxMaker {
  private readonly _data;
  private readonly _compressor: VirtualBoxCompressor;
  private readonly _boxes: VirtualBoxController;
  private readonly _sorter: VirtualBoxSorter;

  constructor(
    boxes: VirtualBoxController,
    compressor: VirtualBoxCompressor,
    data: {
      points: Array<VirtualSpatialPoint>;
      limits: {
        primary: Array<VirtualBox>;
        secondary: Array<VirtualBox>;
      };
    },
  ) {
    this._data = data;
    this._compressor = compressor;
    this._boxes = boxes;
    this._sorter = new VirtualBoxSorter(boxes);
  }

  make(
    data: DataBuffer,
    bounds: VirtualBox,
    a = 0,
    b = 0,
    size = 0,
    result = 0,
  ): number {
    const distance = a - b;
    if (distance === 1) {
      return this.makePoint(data, b, bounds, result);
    }
    if (distance === 2) {
      return this.makeGroup3(result, data, b, bounds);
    }
    return this.makeGroup(size, data, b, a, result, bounds);
  }

  private makeGroup3(
    position: number,
    data: DataBuffer,
    b: number,
    bounds: VirtualBox,
  ) {
    const box1 = this.makeBox(position + 1, data, b);
    const box2 = this.makeBox(position + 2, data, b + 1);
    bounds.combine(box1, box2);
    this.newGroup(position, 3, bounds);
    return 3;
  }

  private makeGroup(
    size: number,
    data: DataBuffer,
    b: number,
    a: number,
    position: number,
    bounds: VirtualBox,
  ) {
    const lim1 = this._data.limits.primary[size];
    const lim2 = this._data.limits.secondary[size];
    const frontier = this._sorter.sort(data, b, a);
    const size1 = this.make(data, lim1, frontier, b, size + 1, position + 1);
    const result2 = position + size1 + 1;
    const size2 = this.make(data, lim2, a, frontier, size + 1, result2);
    bounds.combine(lim1, lim2);
    const newSize = size1 + size2 + 1;
    this.newGroup(position, newSize, bounds);
    return newSize;
  }

  private makeBox(position: number, data: DataBuffer, b: number) {
    const box = this._data.points[position].box;
    const boxPosition = data[b];
    const boxData = this._boxes.get(boxPosition);
    this._compressor.deflate(boxData, box);
    this.set(position, boxPosition);
    return box;
  }

  private makePoint(
    data: DataBuffer,
    b: number,
    bounds: VirtualBox,
    position: number,
  ) {
    const box = this._boxes.get(data[b]);
    this._compressor.deflate(box, bounds);
    this.newPoint(position, data[b], bounds);
    return 1;
  }

  private newGroup(position: number, size: number, bounds: VirtualBox) {
    const point = this.get(position);
    point.transform(size, bounds, false);
  }

  private get(position: number) {
    return this._data.points[position];
  }

  private newPoint(position: number, value: number, bounds: VirtualBox) {
    const point = this.get(position);
    point.transform(value, bounds, true);
  }

  private set(position: number, data: number) {
    const point = this.get(position);
    point.data = data;
  }
}
