import type { XXHashAPI } from "xxhash-wasm";

/**
 * Folds a buffer of coordinates into a single 64-bit key, so that geometry
 * differing only in where its vertices sit hashes differently.
 *
 * Values are quantized to `1 / precision` before hashing, which is what lets
 * float noise from the tessellator collapse while genuinely distinct positions
 * stay apart. They are then hashed as raw bytes rather than as numbers, so
 * neither sign nor magnitude needs any special handling.
 *
 * The fold is order-sensitive: `[1, 2, 3]` and `[3, 2, 1]` hash differently,
 * which is the point - summing could not tell them apart. The tradeoff is that
 * two buffers holding the same values in a different order are treated as
 * different geometry.
 *
 * @param hasher An initialized xxhash-wasm instance. Hashing is synchronous
 * once the module is ready, so callers init it up front, alongside web-ifc.
 * @param coordinates The values to fold, e.g. a flat XYZ position buffer.
 * @param precision Reciprocal of the quantization step, e.g. `10000` rounds to
 * the nearest 1/10000.
 * @returns An unsigned 64-bit integer.
 */
export const hashCoordinates = (
  hasher: XXHashAPI,
  coordinates: ArrayLike<number>,
  precision: number,
) => {
  const quantized = new Int32Array(coordinates.length);

  for (let i = 0; i < coordinates.length; i++) {
    quantized[i] = Math.round(coordinates[i] * precision);
  }

  return hasher.h64Raw(new Uint8Array(quantized.buffer));
};
