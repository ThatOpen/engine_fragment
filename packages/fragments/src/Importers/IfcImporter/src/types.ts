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
  /**
   * Convert geometry in batches instead of one whole-file web-ifc model. Each
   * batch opens only the statements its elements' geometry reads, so web-ifc
   * memory follows the batch size rather than the file size, and batches run
   * in parallel when workers are given. The output is the same either way.
   * Needs {@link file}, {@link source} or {@link bytes}.
   */
  geometryBatches?: {
    /**
     * Starts a worker whose script calls `serveIfcGeometryWorker()`. Left
     * out, batches run one after another in this thread.
     */
    createWorker?: () => Worker;
    /** How many workers to start. Defaults to the core count, less one. */
    workers?: number;
    /** Largest batch, in bytes of IFC. Defaults to 32 MB. */
    batchBytes?: number;
    /** Most elements per batch. Defaults to 2000. */
    batchElements?: number;
    /**
     * Elements in the first batch, which runs alone because it decides the
     * model's origin. Defaults to 32.
     */
    probeElements?: number;
    /**
     * How long a batch should take, in ms: batches are sized from the time
     * recent ones took per element, so costly runs of elements spread over
     * the workers. 0 sizes by element count only. Defaults to 1000.
     */
    targetBatchMs?: number;
  };
  progressCallback?: (progress: number, data: ProgressData) => void;
}
