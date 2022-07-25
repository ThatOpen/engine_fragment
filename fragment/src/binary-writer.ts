// export class BinaryWriter {
//   private buffer: Uint8Array;
//   private data: DataView;
//   private offset: number;
//
//   constructor(size: number) {
//     this.buffer = new Uint8Array(size);
//     this.data = new DataView(this.buffer);
//   }
//
//   getFile() {
//     return new File([new Blob([this.buffer])], 'Fragment');
//   }
//
//   writeFloat32Array(values: number[]) {
//     for (const value of values) {
//       this.writeFloat32(value);
//     }
//   }
//
//   writeFloat32(value: number) {
//     this.data.setFloat32(this.offset, value);
//     this.offset += 4;
//   }
// }
