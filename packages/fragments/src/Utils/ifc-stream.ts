// eslint-disable-next-line max-classes-per-file
import * as webIfc from "web-ifc";
import {
  extractLineMeta,
  parseStepArguments,
  StepArgument,
} from "./ifc-parsing-utils";

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

type RawFactory = (args: StepArgument[]) => webIfc.IfcLineObject;

// A statement buffer beyond this is not line-oriented IFC — bail out instead
// of accumulating the whole input in memory.
const maxStatementLength = 64 * 1024 * 1024;

/**
 * Parses the ISO 10303-21 statements of an IFC file into web-ifc entities,
 * matching the shape `IfcAPI.GetLine` returns (attributes hold typed value
 * wrappers, refs are `{ type: 5, value }` handles, omitted attributes are
 * `null`). Statements may span physical lines, share a line, or be
 * interleaved with `/* ... *\/` comments and blank lines. Entity types
 * outside the file's declared schema are skipped, like web-ifc does.
 * The stream errors on corrupted statements and on input that ends before
 * `END-ISO-10303-21;`, so truncated files are not mistaken for complete ones.
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
    let factories: Record<number, RawFactory> | null = null;
    let fileSchemas: string[] | null = null;
    let section: "header" | "data" | "between" | "end" = "header";
    let statement = "";
    let inString = false;
    let inComment = false;

    function processStatement(
      raw: string,
      controller: TransformStreamDefaultController<webIfc.IfcLineObject>,
    ) {
      switch (section) {
        case "header":
          if (raw === "DATA") {
            if (!fileSchemas) {
              controller.error(new Error("Ifc schema not found"));
              return;
            }
            let schemaIndex = -1;
            for (const name of fileSchemas) {
              schemaIndex = webIfc.SchemaNames.findIndex((names) =>
                names?.includes(name),
              );
              if (schemaIndex !== -1) break;
            }
            if (schemaIndex === -1) {
              controller.error(
                new Error(`Ifc schema '${fileSchemas.join("', '")}' not found`),
              );
              return;
            }
            factories = (
              webIfc.FromRawLineData as Record<
                number,
                Record<number, RawFactory>
              >
            )[schemaIndex];
            section = "data";
          } else if (raw.startsWith("FILE_SCHEMA")) {
            try {
              const [names] = parseStepArguments(raw);
              if (Array.isArray(names)) {
                const schemas: string[] = [];
                for (const item of names) {
                  if (
                    item &&
                    !Array.isArray(item) &&
                    typeof item.value === "string"
                  ) {
                    schemas.push(item.value);
                  }
                }
                if (schemas.length) fileSchemas = schemas;
              }
            } catch {
              // a malformed FILE_SCHEMA surfaces as "schema not found" at DATA
            }
          }
          break;

        case "data": {
          if (raw === "ENDSEC") {
            section = "between";
            return;
          }
          const meta = extractLineMeta(raw);
          if (!meta) {
            controller.error(new Error(`Corrupted Ifc statement: ${raw}`));
            return;
          }
          const typeCode = (webIfc as Record<string, unknown>)[meta.type];
          // entity types outside web-ifc or the declared schema are skipped,
          // matching web-ifc's own tolerance for such lines
          if (typeof typeCode !== "number") return;
          const factory = factories?.[typeCode];
          if (!factory) return;
          let entity: webIfc.IfcLineObject;
          try {
            entity = factory(parseStepArguments(raw));
          } catch (err) {
            controller.error(
              new Error(`Corrupted Ifc statement: ${raw}`, { cause: err }),
            );
            return;
          }
          entity.expressID = meta.id;
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
    }

    super({
      transform(line, controller) {
        const length = line.length;
        let segStart = 0;
        let i = 0;
        while (i < length) {
          const c = line.charCodeAt(i);
          if (inComment) {
            if (c === 42 && line.charCodeAt(i + 1) === 47) {
              // "*/"
              inComment = false;
              i += 2;
              segStart = i;
            } else i++;
            continue;
          }
          if (inString) {
            // '' pairs toggle twice, so plain toggling tracks them correctly
            if (c === 39) inString = false;
            i++;
            continue;
          }
          if (c === 39) {
            // "'"
            inString = true;
            i++;
            continue;
          }
          if (c === 47 && line.charCodeAt(i + 1) === 42) {
            // "/*" — drop the comment, keep it as a token separator
            statement += `${line.substring(segStart, i)} `;
            inComment = true;
            i += 2;
            continue;
          }
          if (c === 59) {
            // ";" — a complete statement
            const raw = (statement + line.substring(segStart, i)).trim();
            statement = "";
            i++;
            segStart = i;
            if (raw) processStatement(raw, controller);
            continue;
          }
          i++;
        }
        if (!inComment && segStart < length) {
          statement += `${line.substring(segStart)}\n`;
          if (statement.length > maxStatementLength) {
            controller.error(new Error("Ifc statement exceeds maximum length"));
          }
        }
      },

      flush(controller) {
        // reaching the end of input before END-ISO-10303-21; means the file
        // is truncated or not an IFC file at all
        if (statement.trim() || section !== "end") {
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
