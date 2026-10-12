// Messages exchanged between the demo page and its import worker.

import type { IfcSplit, IfcSplitManifest } from "../../src/types";

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
  /**
   * Write several models instead of one, in `parallel` mode: see
   * `IfcSplitConfig.geometry`.
   */
  splits?: { maxItems?: number; maxBytes?: number };
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
  /** Size of the model, or of all its splits together. */
  outputBytes: number;
  totalMs: number;
  /** With splits: when the first one was handed over, from the start. */
  firstSplitMs?: number;
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
  | { type: "split"; split: IfcSplit }
  // one model in `bytes`, or with splits, the manifest of those already sent
  | {
      type: "done";
      bytes?: Uint8Array;
      manifest?: IfcSplitManifest;
      stats: ImportStats;
    }
  | { type: "error"; message: string; stack?: string };
