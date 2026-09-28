// Messages exchanged between the demo page and its import worker.

export type ImportMode = "legacy" | "streaming";

export interface ConvertRequest {
  type: "convert";
  file: File;
  mode: ImportMode;
  wasmPath: string;
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
