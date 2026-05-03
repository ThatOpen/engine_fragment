const crCharCode = 13; // "\r";
const nl = "\n";

/**

 *
 * @example
 * ```ts
 * let blob: Blob;
 * 
 * // node
 * blob = await fs.openAsBlob(path, { type: "text/plain" });
 * 
 * const ifcStream = blob
 *   .stream()
 *   .pipeThrough(new IfcDecoderStream());
 * 
 * for await (const line of ifcStream) {
 *   // parse line
 * }
 * ```
 */
export class IfcDecoderStream extends TransformStream<Uint8Array, string> {
  constructor(encoding = "utf-8") {
    let tail = "";
    const decoder = new TextDecoder(encoding);

    super({
      transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        if (!text) return;
        let start = 0;
        let idx = text.indexOf(nl);

        if (idx !== -1) {
          let end = idx;
          if (end > 0 && text.charCodeAt(end - 1) === crCharCode) end--;
          controller.enqueue(
            tail
              ? tail + text.substring(start, end)
              : text.substring(start, end),
          );
          tail = "";
          start = idx + 1;
          idx = text.indexOf(nl, start);
        } else {
          tail += text;
          return;
        }

        while (idx !== -1) {
          let end = idx;
          if (end > start && text.charCodeAt(end - 1) === crCharCode) end--;
          controller.enqueue(text.substring(start, end));
          start = idx + 1;
          idx = text.indexOf(nl, start);
        }

        if (start < text.length) tail = text.substring(start);
      },

      flush(controller) {
        const remaining = decoder.decode();
        const full = tail + remaining;
        if (full) controller.enqueue(full);
      },
    });
  }
}

/**
 * Backward compatible stream async iterator
 * ```typescript
 * for await (const line of streamAsyncIterator(readableStream)) {
 *   await callback(line);
 * }
 * ```
 *
 * Modern environments support stream async iterator out of the box:
 * ```typescript
 * for await (const line of readableStream) {
 *   await callback(line);
 * }
 * ```
 */
export async function* streamAsyncIterator<T>(stream: ReadableStream<T>) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}
