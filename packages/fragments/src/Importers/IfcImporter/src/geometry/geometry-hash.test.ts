import { expect, test } from "vitest";
import { hashCoordinates } from "./geometry-hash";

const p = 10000;

test("is deterministic and returns an unsigned 32 bit integer", () => {
  const coordinates = [-0.132, 0.012, 0.006, -0.108, -0.012, 0.006];
  expect(hashCoordinates(coordinates, p)).toBe(
    hashCoordinates([...coordinates], p),
  );
  for (const input of [[], [-9e5], [9e5], [0, -0]]) {
    const hash = hashCoordinates(input, p);
    expect(Number.isInteger(hash)).toBe(true);
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThanOrEqual(0xffffffff);
  }
});

test("accepts a typed array and a plain array alike", () => {
  const coordinates = [1.5, -1.5, 0.25];
  expect(hashCoordinates(new Float32Array(coordinates), p)).toBe(
    hashCoordinates(coordinates, p),
  );
});

test("is order sensitive", () => {
  const coordinates = [1, 2, 3];
  expect(hashCoordinates(coordinates, p)).not.toBe(
    hashCoordinates([...coordinates].reverse(), p),
  );
});

test("does not let opposite values cancel", () => {
  // The bug this fold replaced: signed per-vertex hashes summed to zero, so
  // symmetric geometry dropped out of the key entirely.
  expect(hashCoordinates([1.5, -1.5], p)).not.toBe(
    hashCoordinates([2.5, -2.5], p),
  );
  expect(hashCoordinates([1.5, -1.5], p)).not.toBe(hashCoordinates([], p));
});

test("separates values that differ by one quantization step", () => {
  expect(hashCoordinates([0.1], p)).not.toBe(hashCoordinates([0.1001], p));
});

test("collapses differences below the quantization step", () => {
  // Float noise from web-ifc must not split a geometry from its duplicate.
  expect(hashCoordinates([0.2], p)).toBe(
    hashCoordinates([0.20000000298023224], p),
  );
});

test("separates plates whose holes moved, which is issue #237", () => {
  const plate = (holeX: number) =>
    [
      -200, -100, 6, 200, -100, 6, 200, 100, 6, -200, 100, 6,
      holeX - 12, 12, 6, holeX + 12, 12, 6, holeX + 12, -12, 6, holeX - 12, -12, 6,
    ].map((value) => value / 1000);

  expect(hashCoordinates(plate(-120), p)).not.toBe(
    hashCoordinates(plate(-40), p),
  );
});

test("collides no more than chance over structured geometry", () => {
  // Building coordinates repeat and share grid lines, which is where weak
  // mixers degrade. Birthday expectation here is well under one collision.
  const hashes = new Set<number>();
  let count = 0;
  for (let width = 1; width <= 300; width++) {
    for (let depth = 1; depth <= 300; depth++) {
      const box = [
        0, 0, 0, width, 0, 0, width, depth, 0, 0, depth, 0,
        0, 0, 50, width, 0, 50, width, depth, 50, 0, depth, 50,
      ].map((value) => value / 1000);
      hashes.add(hashCoordinates(box, p));
      count++;
    }
  }
  expect(count - hashes.size).toBeLessThanOrEqual(2);
});
