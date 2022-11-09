export default class BinaryReader {
  binary: Uint8Array;
  offset: number = 0;
  view: DataView;

  constructor(binary: Uint8Array) {
    this.binary = binary;
    this.view = new DataView(binary.buffer, binary.byteOffset);
  }

  atEnd() {
    return this.offset === this.binary.length;
  }

  readInt8() {
    const v = this.view.getInt8(this.offset);
    this.offset += 1;
    return v;
  }

  readInt32() {
    const v = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return v;
  }

  readUInt32() {
    const v = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return v;
  }

  readInt64() {
    const v = this.view.getBigInt64(this.offset, true);
    this.offset += 8;
    return v;
  }

  readFloat32() {
    const v = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return v;
  }

  readFloat32Array(length: number) {
    const data: number[] = [];
    const endOffset = this.offset + length;
    while (this.offset !== endOffset) {
      data.push(this.readFloat32());
    }
    return data;
  }

  readInt32Array(length: number) {
    const data: number[] = [];
    const endOffset = this.offset + length;
    while (this.offset !== endOffset) {
      data.push(this.readInt32());
    }
    return data;
  }

  readUInt32Array(length: number) {
    const data: number[] = [];
    const endOffset = this.offset + length;
    while (this.offset !== endOffset) {
      data.push(this.readUInt32());
    }
    return data;
  }

  readArrayAsString(length: number) {
    let string = "";
    for (let i = this.offset; i < this.offset + length; i++) {
      string += String.fromCharCode(this.binary[i] as any);
    }
    this.offset += length;
    return string;
  }

  readBytes(length: number) {
    const subArr = this.binary.subarray(this.offset, this.offset + length);
    this.offset += length;
    return subArr;
  }
}
