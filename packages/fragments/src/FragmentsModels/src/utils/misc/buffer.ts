/**
 * Returns whether `bytes` is a raw (uncompressed) fragments buffer rather than
 * a pako/zlib-deflated one, by inspecting the first two bytes.
 *
 * A deflated fragments buffer is a zlib stream: byte 0's low nibble is the
 * deflate compression method (8) and `(byte0 << 8 | byte1)` is a multiple of 31
 * (the zlib header check). A raw fragments buffer is a flatbuffer, whose leading
 * 32-bit root offset does not satisfy that. This lets `load` and the model
 * constructors accept either form without the caller tracking which it is.
 *
 * In the extremely unlikely case a raw buffer's first two bytes happen to look
 * like a zlib header, pass `raw` explicitly to override the detection.
 *
 * Performance note: a raw (uncompressed) model is the fastest to load. Only
 * deflate a fragments buffer when you persist it to disk or send it over the
 * network. Inflating and deflating on every load, with no transport in between,
 * just wastes CPU.
 */
export function isRawBuffer(bytes: Uint8Array): boolean {
  if (bytes.length < 2) return true;
  // eslint-disable-next-line no-bitwise
  const isDeflateMethod = (bytes[0] & 0x0f) === 8;
  // eslint-disable-next-line no-bitwise
  const headerIsMultipleOf31 = (((bytes[0] << 8) | bytes[1]) % 31) === 0;
  return !(isDeflateMethod && headerIsMultipleOf31);
}
