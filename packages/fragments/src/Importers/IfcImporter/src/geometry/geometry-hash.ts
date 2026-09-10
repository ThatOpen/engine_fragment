/* eslint-disable no-bitwise */

/**
 * Folds a buffer of coordinates into a single 32-bit key, so that geometry
 * differing only in where its vertices sit hashes differently.
 *
 * Values are quantized to `1 / precision` before mixing, which is what lets
 * float noise collapse while genuinely distinct positions stay apart. The mixer
 * is MurmurHash3's, one round per value, followed by its `fmix32` finalizer.
 * `Math.imul` and the bitwise operators are defined on 32-bit two's complement,
 * so wrapping and sign are specified behavior here: there is nothing to
 * normalize and nothing that can overflow.
 *
 * MurmurHash3 rather than a cheaper fold because building coordinates are
 * highly structured - repeated modules, shared grid lines, a handful of
 * distinct values per mesh - and weaker mixers avalanche poorly on exactly that
 * shape of input.
 *
 * The fold is order-sensitive: `[1, 2, 3]` and `[3, 2, 1]` hash differently,
 * which is the point - summing could not tell them apart. The tradeoff is that
 * two buffers holding the same values in a different order are treated as
 * different geometry.
 *
 * @param coordinates The values to fold, e.g. a flat XYZ position buffer.
 * @param precision Reciprocal of the quantization step, e.g. `10000` rounds to
 * the nearest 1/10000.
 * @returns An unsigned 32-bit integer.
 */
export const hashCoordinates = (
  coordinates: ArrayLike<number>,
  precision: number,
) => {
  let hash = 0;

  for (let i = 0; i < coordinates.length; i++) {
    const quantized = Math.round(coordinates[i] * precision);
    const scattered = Math.imul(quantized, 0xcc9e2d51);
    hash ^= Math.imul((scattered << 15) | (scattered >>> 17), 0x1b873593);
    hash = (hash << 13) | (hash >>> 19);
    hash = (Math.imul(hash, 5) + 0xe6546b64) | 0;
  }

  hash ^= coordinates.length;
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);

  return (hash ^ (hash >>> 16)) >>> 0;
};
