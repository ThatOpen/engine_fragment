/* eslint-disable no-bitwise */

import {
  DataBuffer,
  ItemConfigClass,
  limitOf2Bytes,
} from "../../model/model-types";

export class BitUtils {
  static check(data: DataBuffer, id: number, config: ItemConfigClass) {
    const filter = this.get(config);
    const currentData = data[id];
    const result = Boolean(currentData & filter);
    return result;
  }

  static apply(
    data: DataBuffer,
    id: number,
    config: ItemConfigClass,
    value: boolean,
  ): void {
    const filter = this.get(config);
    if (value) {
      data[id] |= filter;
      return;
    }
    data[id] &= ~filter;
  }

  static checkMemory(id: number) {
    if (id > limitOf2Bytes) {
      throw new Error("Fragments: Memory overflow!");
    }
  }

  private static get(value: number) {
    return 1 << value;
  }
}
