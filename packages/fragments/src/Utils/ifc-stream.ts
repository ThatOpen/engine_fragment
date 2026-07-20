// eslint-disable-next-line max-classes-per-file
import * as webIfc from "web-ifc";
import { extractLineMeta, parseStepArguments } from "./ifc-parsing-utils";

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
 *   .pipeThrough(new IfcDecoderStream())
 *   .pipeThrough(new IfcParserStream());
 *
 * for await (const entity of ifcStream) {
 *   const localId = entity.expressID;
 *   const type = entity.type;
 * }
 * ```
 */
export class IfcParserStream extends TransformStream<
  string,
  webIfc.IfcLineObject
> {
  constructor() {
    let schemaFactoryMap: Record<number, (...args: unknown[]) => any> | null =
      null;
    let section: "header" | "data" | "footer" = "header";
    const header: string[] = [];
    const schemaRE = /FILE_SCHEMA\(+'?([^')]*)'?\)+;/;

    function getFactory(type: string): ((line: string) => any) | null {
      if (!schemaFactoryMap) return null;

      const typeCode = (webIfc as Record<string, unknown>)[type];
      if (typeof typeCode !== "number") return null;

      const ctor = schemaFactoryMap[typeCode];
      if (!ctor) return null;

      return (line: string) => {
        const args = parseStepArguments(line);
        return ctor(args);
      };
    }

    super({
      transform(line, controller) {
        switch (section) {
          case "header":
            if (line.trim() === "DATA;") {
              const schemaLine = header.find((line) => schemaRE.test(line));
              const schema = schemaLine && schemaRE.exec(schemaLine)?.[1];
              if (!schema) {
                controller.error("Ifc schema not found");
                return;
              }
              const schemaIndex = webIfc.SchemaNames.findIndex((names) =>
                names?.includes(schema),
              );
              if (schemaIndex === -1) {
                controller.error(`Ifc schema '${schema}' not found`);
                return;
              }
              schemaFactoryMap = webIfc.Constructors[schemaIndex];
              section = "data";
              return;
            }
            header.push(line);
            break;

          case "data":
            {
              if (line.trim() === "ENDSEC;") {
                section = "footer";
                return;
              }
              const result = extractLineMeta(line);
              if (!result) {
                controller.error(`Ifc corrupted line: ${line}`);
                return;
              }
              const factory = getFactory(result.type);
              if (!factory) {
                controller.error(`Unknown Ifc type '${result.type}'`);
                return;
              }
              const entity = factory(line);
              entity.expressID = result.id;
              controller.enqueue(entity);
            }
            break;

          default:
            break;
        }
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
  let drained = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        drained = true;
        return;
      }
      yield value;
    }
  } finally {
    // On the abnormal path (`break`, `throw`, or an early `return` from the
    // consumer) the source is still open — cancel it so the underlying file
    // handle / socket is released instead of waiting for GC.
    if (!drained) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
