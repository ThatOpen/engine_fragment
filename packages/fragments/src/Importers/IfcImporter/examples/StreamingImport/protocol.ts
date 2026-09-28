// Messages exchanged between the demo page and its import worker.

/**
 * - `parallel`: geometry in projected batches across several workers.
 * - `streaming`: one web-ifc model of the whole file, read in place.
 * - `legacy`: the file read into memory, and opened twice in web-ifc.
 */
export type ImportMode = "parallel" | "streaming" | "legacy";

export interface ConvertRequest {
  type: "convert";
  file: File;
  mode: ImportMode;
  wasmPath: string;
  /** Geometry workers for `parallel` mode. */
  workers: number;
  /** Batch size for `parallel` mode, in bytes of IFC. */
  batchBytes?: number;
  /** See `IfcImporter.residentBudget`. */
  residentBudget?: number;
  /** Page size and cache for reading the file in place. */
  pages?: { pageSize?: number; cacheBytes?: number };
  /** Overrides for web-ifc's loader, e.g. `TAPE_SIZE` and `MEMORY_LIMIT`. */
  webIfcSettings?: Record<string, number | boolean>;
}

export interface PhaseTiming {
  phase: string;
  ms: number;
}

export interface ImportStats {
  mode: ImportMode;
  fileBytes: number;
  outputBytes: number;
  totalMs: number;
  phases: PhaseTiming[];
  /** Final size of every WebAssembly memory the worker created. */
  wasmMemories: number[];
  /** Largest web-ifc heap in any geometry worker, for `parallel` mode. */
  workerWasmHeap?: number;
  /** Largest `performance.memory.usedJSHeapSize` seen, when the API exists. */
  peakJsHeap: number | null;
  counts: Record<string, number>;
}

export type WorkerMessage =
  | {
      type: "progress";
      phase: string;
      /** 0..1 over the whole conversion. */
      fraction: number;
      detail?: string;
    }
  | { type: "done"; bytes: Uint8Array; stats: ImportStats }
  | { type: "error"; message: string; stack?: string };
