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

/** One of the models a conversion with {@link ProcessData.splits} writes. */
export interface IfcSplitInfo {
  /** The conversion's id and a suffix; also the guid of the split's model. */
  id: string;
  /**
   * - `geometry`: meshes, with the local id and category of the item each
   *   belongs to. All that drawing, picking and hiding read.
   * - `reference`: the grids and alignments, which the viewer draws from
   *   their attributes (`getGrids`, `getAlignments`). No meshes. Left out of
   *   a conversion that has neither.
   * - `data`: every other item's attributes, relations and GUID, the spatial
   *   structure and the metadata. No meshes.
   */
  kind: "geometry" | "reference" | "data";
  /**
   * The thread group to load the split into, for an app that declares one
   * by that name; null for the default pool.
   */
  group: string | null;
  /** How many items the split holds. */
  items: number;
  /** Size of {@link IfcSplit.bytes}. */
  byteLength: number;
}

export interface IfcSplit extends IfcSplitInfo {
  /** The model, deflated unless {@link ProcessData.raw}. */
  bytes: Uint8Array;
}

export interface IfcSplitConfig {
  /** How geometry is cut into splits. */
  geometry?: {
    /** Most elements per split. Defaults to 20,000. */
    maxItems?: number;
    /**
     * Bytes of uncompressed model past which a split is ended, whatever its
     * element count. Checked between batches, so a split can pass it by one
     * batch. Defaults to 256 MB.
     */
    maxBytes?: number;
  };
  data?: {
    /** {@link IfcSplitInfo.group} of the data split. Defaults to `"data"`. */
    group?: string;
  };
  /**
   * Takes each split as soon as it is complete: geometry splits while the
   * conversion runs, then the reference split, and the data split last. A
   * returned promise is awaited before more geometry is assembled, so a
   * slow consumer holds the conversion back instead of having splits pile
   * up in memory.
   */
  onSplit: (split: IfcSplit) => void | Promise<void>;
}

/** What a conversion with {@link ProcessData.splits} wrote, and where. */
export interface IfcSplitManifest {
  /** The conversion's id: {@link ProcessData.id}, or a generated one. */
  id: string;
  /** Every split, in the order they were handed out. */
  splits: IfcSplitInfo[];
  /**
   * Where each item is. Local ids are the same in every split, so an item
   * picked in a geometry split is looked up in its data split by the same id.
   */
  index: {
    /** Every item's local id, ascending. */
    localIds: Uint32Array;
    /**
     * For each of {@link localIds}, the position in {@link splits} of the
     * split with its geometry, or -1 for an item without any.
     */
    geometry: Int32Array;
    /**
     * Likewise for the split with its attributes: the data split, or for a
     * grid or an alignment, the reference split.
     */
    data: Int32Array;
  };
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
  /**
   * Write the conversion as several models instead of one, so they load in
   * parallel and what the viewer draws arrives without what it does not.
   * `process` then resolves to an {@link IfcSplitManifest}, and each model is
   * handed to {@link IfcSplitConfig.onSplit}. Needs {@link geometryBatches}.
   */
  splits?: IfcSplitConfig;
  progressCallback?: (progress: number, data: ProgressData) => void;
}
