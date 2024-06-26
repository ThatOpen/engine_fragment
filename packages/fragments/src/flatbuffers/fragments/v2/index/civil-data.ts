// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from "flatbuffers";

import { Alignment } from "./alignment";

export class CivilData {
  bb: flatbuffers.ByteBuffer | null = null;
  bb_pos = 0;
  __init(i: number, bb: flatbuffers.ByteBuffer): CivilData {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }

  static getRootAsCivilData(
    bb: flatbuffers.ByteBuffer,
    obj?: CivilData,
  ): CivilData {
    return (obj || new CivilData()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb,
    );
  }

  static getSizePrefixedRootAsCivilData(
    bb: flatbuffers.ByteBuffer,
    obj?: CivilData,
  ): CivilData {
    bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
    return (obj || new CivilData()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb,
    );
  }

  alignments(index: number, obj?: Alignment): Alignment | null {
    const offset = this.bb!.__offset(this.bb_pos, 4);
    return offset
      ? (obj || new Alignment()).__init(
          this.bb!.__indirect(
            this.bb!.__vector(this.bb_pos + offset) + index * 4,
          ),
          this.bb!,
        )
      : null;
  }

  alignmentsLength(): number {
    const offset = this.bb!.__offset(this.bb_pos, 4);
    return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
  }

  coordinationMatrix(index: number): number | null {
    const offset = this.bb!.__offset(this.bb_pos, 6);
    return offset
      ? this.bb!.readFloat32(
          this.bb!.__vector(this.bb_pos + offset) + index * 4,
        )
      : 0;
  }

  coordinationMatrixLength(): number {
    const offset = this.bb!.__offset(this.bb_pos, 6);
    return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
  }

  coordinationMatrixArray(): Float32Array | null {
    const offset = this.bb!.__offset(this.bb_pos, 6);
    return offset
      ? new Float32Array(
          this.bb!.bytes().buffer,
          this.bb!.bytes().byteOffset + this.bb!.__vector(this.bb_pos + offset),
          this.bb!.__vector_len(this.bb_pos + offset),
        )
      : null;
  }

  static startCivilData(builder: flatbuffers.Builder) {
    builder.startObject(2);
  }

  static addAlignments(
    builder: flatbuffers.Builder,
    alignmentsOffset: flatbuffers.Offset,
  ) {
    builder.addFieldOffset(0, alignmentsOffset, 0);
  }

  static createAlignmentsVector(
    builder: flatbuffers.Builder,
    data: flatbuffers.Offset[],
  ): flatbuffers.Offset {
    builder.startVector(4, data.length, 4);
    for (let i = data.length - 1; i >= 0; i--) {
      builder.addOffset(data[i]!);
    }
    return builder.endVector();
  }

  static startAlignmentsVector(builder: flatbuffers.Builder, numElems: number) {
    builder.startVector(4, numElems, 4);
  }

  static addCoordinationMatrix(
    builder: flatbuffers.Builder,
    coordinationMatrixOffset: flatbuffers.Offset,
  ) {
    builder.addFieldOffset(1, coordinationMatrixOffset, 0);
  }

  static createCoordinationMatrixVector(
    builder: flatbuffers.Builder,
    data: number[] | Float32Array,
  ): flatbuffers.Offset;
  /**
   * @deprecated This Uint8Array overload will be removed in the future.
   */
  static createCoordinationMatrixVector(
    builder: flatbuffers.Builder,
    data: number[] | Uint8Array,
  ): flatbuffers.Offset;
  static createCoordinationMatrixVector(
    builder: flatbuffers.Builder,
    data: number[] | Float32Array | Uint8Array,
  ): flatbuffers.Offset {
    builder.startVector(4, data.length, 4);
    for (let i = data.length - 1; i >= 0; i--) {
      builder.addFloat32(data[i]!);
    }
    return builder.endVector();
  }

  static startCoordinationMatrixVector(
    builder: flatbuffers.Builder,
    numElems: number,
  ) {
    builder.startVector(4, numElems, 4);
  }

  static endCivilData(builder: flatbuffers.Builder): flatbuffers.Offset {
    const offset = builder.endObject();
    return offset;
  }

  static createCivilData(
    builder: flatbuffers.Builder,
    alignmentsOffset: flatbuffers.Offset,
    coordinationMatrixOffset: flatbuffers.Offset,
  ): flatbuffers.Offset {
    CivilData.startCivilData(builder);
    CivilData.addAlignments(builder, alignmentsOffset);
    CivilData.addCoordinationMatrix(builder, coordinationMatrixOffset);
    return CivilData.endCivilData(builder);
  }
}
