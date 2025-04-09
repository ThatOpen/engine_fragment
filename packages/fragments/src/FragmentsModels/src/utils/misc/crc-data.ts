import { DataBuffer } from "../../model/model-types";

export class CRCData {
  readonly int: DataBuffer;
  readonly float: DataBuffer;
  readonly buffer: DataBuffer;
  readonly s1 = 4;
  readonly s2 = 8;

  constructor() {
    const { intBuffer, floatBuffer, buffer } = this.newBuffers();
    this.int = intBuffer;
    this.float = floatBuffer;
    this.buffer = buffer;
  }

  private newBuffers() {
    const intBuffer = new Int32Array(1);
    const data = intBuffer.buffer;
    const floatBuffer = new Float32Array(data);
    const buffer = new Uint8Array(data);
    return { intBuffer, floatBuffer, buffer };
  }
}
