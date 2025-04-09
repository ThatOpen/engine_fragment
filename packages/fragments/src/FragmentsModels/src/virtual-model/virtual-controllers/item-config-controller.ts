import { DataBuffer, ItemConfigClass } from "../../model/model-types";
import { BitUtils } from "../../utils";

export class ItemConfigController {
  readonly size: number;

  private _data: DataBuffer;
  private _highlightData: DataBuffer;

  constructor(size: number) {
    this.size = size;
    this._data = new Uint8Array(size);
    this._highlightData = new Uint16Array(size);
    this._data.fill(1);
  }

  getHighlight(id: number): number {
    return this._highlightData[id];
  }

  setHighlight(id: number, highlightId: number) {
    BitUtils.checkMemory(highlightId);
    this._highlightData[id] = highlightId;
  }

  clearHighlight() {
    this._highlightData.fill(0);
  }

  visible(id: number): boolean {
    return BitUtils.check(this._data, id, ItemConfigClass.VISIBLE);
  }

  setVisible(id: number, visible: boolean) {
    BitUtils.apply(this._data, id, ItemConfigClass.VISIBLE, visible);
  }

  clearVisible() {
    this._data.fill(1);
  }
}
