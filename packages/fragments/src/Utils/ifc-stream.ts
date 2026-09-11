// eslint-disable-next-line max-classes-per-file
import * as webIfc from "web-ifc";
import {
  buildEntity,
  entityFactories,
  parseFileSchema,
  RawFactory,
} from "./ifc-parsing-utils";
import { StatementRef } from "./ifc-scanner";
import type { IfcEntityResolver } from "./ifc-resolver";

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
          else if (end === 0 && tail.charCodeAt(tail.length - 1) === crCharCode)
            tail = tail.slice(0, -1); // CRLF pair split across two chunks
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
 * Turns the statements of an IFC file into web-ifc entities, matching the
 * shape `IfcAPI.GetLine` returns (attributes hold typed value wrappers, refs
 * are `{ type: 5, value }` handles, omitted attributes are `null`). Entity
 * types outside the file's declared schema are skipped, like web-ifc does.
 * The stream errors on corrupted statements and on input that ends before
 * `END-ISO-10303-21;`, so truncated files are not mistaken for complete ones.
 *
 * Statement framing — multi-line statements, shared lines, comments, strings —
 * is {@link IfcStatementScanner}'s job, so pipe through that first.
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
 *   .pipeThrough(new IfcStatementScanner())
 *   .pipeThrough(new IfcParserStream());
 *
 * for await (const entity of ifcStream) {
 *   const localId = entity.expressID;
 *   const type = entity.type;
 * }
 * ```
 *
 * @example Resolving references
 * ```ts
 * // needs the whole file resident, and an index of it
 * const resolver = await IfcEntityResolver.fromBytes(bytes);
 *
 * for await (const entity of stream.pipeThrough(
 *   new IfcParserStream({ resolver }),
 * )) {
 *   // `.value` is still the id; `.ref` parses the target on first read
 *   const placement = entity.ObjectPlacement?.ref;
 * }
 * ```
 */
export class IfcParserStream extends TransformStream<
  StatementRef,
  webIfc.IfcLineObject
> {
  constructor({
    encoding = "utf-8",
    resolver,
  }: {
    encoding?: string;
    /**
     * Gives every `#N` handle on the emitted entities a lazy `ref` accessor
     * that parses the target from the source on first read. Left out, refs
     * stay bare `{ type: REF, value: id }` handles.
     */
    resolver?: IfcEntityResolver;
  } = {}) {
    let factories: Record<number, RawFactory> | null = null;
    let fileSchemas: string[] | null = null;
    let section: "header" | "data" | "between" | "end" = "header";
    const decoder = new TextDecoder(encoding);

    super({
      transform(statement, controller) {
        // The scanner guarantees a trailing ";"; the body is what the rest of
        // the parsing works on, and what error messages quote.
        const raw = decoder.decode(statement.bytes).slice(0, -1).trim();
        if (!raw) return;

        switch (section) {
          case "header":
            if (raw === "DATA") {
              if (!fileSchemas) {
                controller.error(new Error("Ifc schema not found"));
                return;
              }
              factories = entityFactories(fileSchemas);
              if (!factories) {
                controller.error(
                  new Error(
                    `Ifc schema '${fileSchemas.join("', '")}' not found`,
                  ),
                );
                return;
              }
              section = "data";
            } else if (raw.startsWith("FILE_SCHEMA")) {
              fileSchemas = parseFileSchema(raw) ?? fileSchemas;
            }
            break;

          case "data": {
            if (raw === "ENDSEC") {
              section = "between";
              return;
            }
            // The scanner reports an id only for a well-formed `#N=TYPE`
            // prefix, so its absence is what "corrupted" means here.
            if (!statement.id) {
              controller.error(new Error(`Corrupted Ifc statement: ${raw}`));
              return;
            }
            let entity: webIfc.IfcLineObject | null;
            try {
              entity = buildEntity({
                raw,
                id: statement.id,
                type: statement.type,
                factories: factories!,
              });
            } catch (err) {
              controller.error(
                new Error(`Corrupted Ifc statement: ${raw}`, { cause: err }),
              );
              return;
            }
            // entity types outside web-ifc or the declared schema are skipped,
            // matching web-ifc's own tolerance for such lines
            if (!entity) return;
            if (resolver) resolver.attach(entity);
            controller.enqueue(entity);
            break;
          }

          case "between":
            // ISO 10303-21 permits several DATA sections per file
            if (raw === "DATA") section = "data";
            else if (raw === "END-ISO-10303-21") section = "end";
            break;

          default:
            break;
        }
      },

      flush(controller) {
        // reaching the end of input before END-ISO-10303-21; means the file
        // is truncated or not an IFC file at all
        if (section !== "end") {
          controller.error(new Error("Unexpected end of Ifc stream"));
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
