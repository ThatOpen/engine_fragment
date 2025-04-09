import { DataBuffer } from "../model/model-types";
import { VirtualBox } from "./virtual-box";

export class VirtualSpatialPoint {
  readonly box: VirtualBox;
  data = 0;

  private static readonly _data = {
    threshold: 0,
    factor: -1,
  };

  constructor(position: number, data: DataBuffer) {
    this.box = new VirtualBox(position, data);
  }

  get size() {
    return this.data * VirtualSpatialPoint._data.factor;
  }

  get isPoint() {
    return this.data >= VirtualSpatialPoint._data.threshold;
  }

  transform(size: number, box: VirtualBox, group: boolean) {
    if (!group) {
      size *= VirtualSpatialPoint._data.factor;
    }
    this.data = size;
    this.box.clone(box);
  }
}
