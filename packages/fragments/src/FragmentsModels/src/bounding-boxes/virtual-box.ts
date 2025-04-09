import { DataBuffer } from "../model/model-types";

export class VirtualBox {
  private readonly _dataBuffer: DataBuffer;
  private readonly _dataPosition: number;

  private static readonly _data = {
    size: 6,
    defaultPosition: 0,
    min: {
      x: 0,
      y: 2,
      z: 4,
    },
    max: {
      x: 1,
      y: 3,
      z: 5,
    },
    coords: ["x", "y", "z"] as const,
    points: ["min", "max"] as const,
  };

  constructor(position?: number, data?: DataBuffer) {
    this._dataBuffer = data || this.getDefaultData();
    this._dataPosition = position || VirtualBox._data.defaultPosition;
  }

  set(values: number[]) {
    let counter = 0;
    for (const point of VirtualBox._data.points) {
      for (const coord of VirtualBox._data.coords) {
        const position = this.getPosition(coord, point);
        const result = values[counter++];
        this.setValue(position, result);
      }
    }
  }

  get(coord: "x" | "y" | "z", point: "min" | "max") {
    const position = this.getPosition(coord, point);
    return this._dataBuffer[position];
  }

  clone(box: VirtualBox): void {
    for (const point of VirtualBox._data.points) {
      for (const coord of VirtualBox._data.coords) {
        const position = this.getPosition(coord, point);
        const result = box.get(coord, point);
        this.setValue(position, result);
      }
    }
  }

  combine(box1: VirtualBox, box2: VirtualBox): void {
    for (const point of VirtualBox._data.points) {
      for (const coord of VirtualBox._data.coords) {
        this.save(coord, point, box1, box2);
      }
    }
  }

  private setValue(position: number, value: number) {
    this._dataBuffer[position] = value;
  }

  private getDefaultData() {
    return new Float64Array(VirtualBox._data.size);
  }

  private getPosition(coord: "x" | "y" | "z", point: "min" | "max") {
    const coordPosition = VirtualBox._data[point][coord];
    return coordPosition + this._dataPosition;
  }

  private save(
    coord: "x" | "y" | "z",
    point: "min" | "max",
    first: VirtualBox,
    second: VirtualBox,
  ) {
    const position = this.getPosition(coord, point);
    const data1 = first.get(coord, point);
    const data2 = second.get(coord, point);
    const result = Math[point](data1, data2);
    this.setValue(position, result);
  }
}
