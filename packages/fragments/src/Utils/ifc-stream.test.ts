import { expect, test } from "vitest";
import { streamAsyncIterator } from "./ifc-stream";

const sourceOf = (values: number[], onCancel: () => void) =>
  new ReadableStream<number>({
    start(controller) {
      for (const value of values) controller.enqueue(value);
      controller.close();
    },
    cancel: onCancel,
  });

test("streamAsyncIterator cancels the source when iteration breaks early", async () => {
  let cancelled = false;
  const stream = sourceOf([1, 2, 3], () => {
    cancelled = true;
  });

  for await (const value of streamAsyncIterator(stream)) {
    if (value === 2) break;
  }

  expect(cancelled).toBe(true);
  expect(stream.locked).toBe(false);
});

test("streamAsyncIterator cancels the source when the consumer throws", async () => {
  let cancelled = false;
  const stream = sourceOf([1, 2, 3], () => {
    cancelled = true;
  });

  const boom = new Error("boom");
  await expect(
    (async () => {
      for await (const value of streamAsyncIterator(stream)) {
        if (value === 2) throw boom;
      }
    })(),
  ).rejects.toBe(boom);

  expect(cancelled).toBe(true);
  expect(stream.locked).toBe(false);
});

test("streamAsyncIterator does not cancel a fully drained source", async () => {
  let cancelled = false;
  const stream = sourceOf([1, 2, 3], () => {
    cancelled = true;
  });

  const seen: number[] = [];
  for await (const value of streamAsyncIterator(stream)) seen.push(value);

  expect(seen).toEqual([1, 2, 3]);
  expect(cancelled).toBe(false);
  expect(stream.locked).toBe(false);
});
