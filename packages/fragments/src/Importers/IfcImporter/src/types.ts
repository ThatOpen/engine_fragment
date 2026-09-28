import type { ModelLoadCallback } from "web-ifc";
import type { IfcByteSource } from "../../../Utils/ifc-byte-source";

export interface ProgressData {
  process:
    | "conversion"
    | "opening"
    | "geometries"
    | "indexing"
    | "attributes"
    | "relations"
    | "serializing";
  state: "start" | "inProgress" | "finish";
  class?: string;
  entitiesProcessed?: number;
}

export interface ProcessData {
  id?: string;
  /**
   * An IFC file to read in place, such as an uploaded `File`. Read with
   * `FileReaderSync`, so this only works in a worker, and the file is never
   * held in memory: web-ifc and the property pass both read the slices they
   * need, when they need them.
   */
  file?: Blob;
  /**
   * Synchronous random-access reader over the IFC file; the general form of
   * {@link file}. Takes precedence over {@link bytes} and {@link readCallback}.
   */
  source?: IfcByteSource;
  bytes?: Uint8Array;
  /**
   * @see {@link readCallback}
   * @default false
   */
  readFromCallback?: boolean;
  /**
   * Read ifc file incrementally, instead of passing {@link bytes}.
   *
   * @example node.js
   * ```typescript
   * import { open } from "node:fs/promises";
   *
   * const handle = await open(filePath, "r");
   * const chunkSize = 64 * 1024; // 64KB
   * const buffer = new Uint8Array(chunkSize);
   * const readCallback: ((offset: number) => {
   *   const bytesRead = readSync(handle.fd, buffer, 0, chunkSize, offset);
   *   return buffer.slice(0, bytesRead);
   * })
   * const output = await importer.process({ readFromCallback: true, readCallback });
   * await handle.close();
   * ```
   */
  readCallback?: ModelLoadCallback;
  raw?: boolean;
  progressCallback?: (progress: number, data: ProgressData) => void;
}
