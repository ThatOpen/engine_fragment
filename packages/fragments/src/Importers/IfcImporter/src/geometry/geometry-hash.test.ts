import { beforeAll, expect, test } from "vitest";
import { Hasher } from "./geometry-hash";

const p = 10000;

let hasher: Hasher;

beforeAll(async () => {
  hasher = await Hasher.init();
});

const hash = (coordinates: ArrayLike<number>) =>
  hasher.hashCoordinates(coordinates, p);

test("is deterministic and returns an unsigned 64 bit integer", () => {
  const coordinates = [-0.132, 0.012, 0.006, -0.108, -0.012, 0.006];
  expect(hash(coordinates)).toBe(hash([...coordinates]));

  for (const input of [[], [-9e5], [9e5], [0, -0]]) {
    const key = hash(input);
    expect(typeof key).toBe("bigint");
    expect(key).toBeGreaterThanOrEqual(0n);
    expect(key).toBeLessThanOrEqual(2n ** 64n - 1n);
  }
});

test("accepts a typed array and a plain array alike", () => {
  const coordinates = [1.5, -1.5, 0.25];
  expect(hash(new Float32Array(coordinates))).toBe(hash(coordinates));
});

test("is order sensitive", () => {
  const coordinates = [1, 2, 3];
  expect(hash(coordinates)).not.toBe(hash([...coordinates].reverse()));
});

test("does not let opposite values cancel", () => {
  // The bug this fold replaced: signed per-vertex hashes summed to zero, so
  // symmetric geometry dropped out of the key entirely.
  expect(hash([1.5, -1.5])).not.toBe(hash([2.5, -2.5]));
  expect(hash([1.5, -1.5])).not.toBe(hash([]));
});

test("separates values that differ by one quantization step", () => {
  expect(hash([0.1])).not.toBe(hash([0.1001]));
});

test("collapses differences below the quantization step", () => {
  // Float noise from web-ifc must not split a geometry from its duplicate.
  expect(hash([0.2])).toBe(hash([0.20000000298023224]));
});

test("separates plates whose holes moved, which is issue #237", () => {
  const plate = (holeX: number) =>
    // prettier-ignore
    [
      -200, -100, 6,
      200, -100, 6,
      200, 100, 6,
      -200, 100, 6,
      holeX - 12, 12, 6,
      holeX + 12, 12, 6,
      holeX + 12, -12, 6,
      holeX - 12, -12, 6,
    ].map((value) => value / 1000);

  expect(hash(plate(-120))).not.toBe(hash(plate(-40)));
});

test("gives 90k similar boxes each their own key", () => {
  // Real models repeat sizes and share grid lines, so these coordinates look
  // far more alike than random numbers would, and that is where a weak hash
  // starts handing two different shapes the same key. Every box below is a
  // different size, and a repeat by sheer luck is vanishingly unlikely at 64
  // bits, so a repeat here would mean the hash lost a real difference.
  const hashes = new Set<bigint>();
  let count = 0;
  for (let width = 1; width <= 300; width++) {
    for (let depth = 1; depth <= 300; depth++) {
      const box =
        // prettier-ignore
        [
          0, 0, 0,
          width, 0, 0,
          width, depth, 0,
          0, depth, 0,
          0, 0, 50,
          width, 0, 50,
          width, depth, 50,
          0, depth, 50,
        ].map((value) => value / 1000);
      hashes.add(hash(box));
      count++;
    }
  }
  expect(hashes.size, "should have no collisions").toBe(count);
});
