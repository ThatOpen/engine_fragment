/// <reference lib="webworker" />
import { IfcImporter } from "../..";
import { IfcBlobSource } from "../../../../Utils/ifc-byte-source";
import type { ProgressData } from "../../src/types";
import type {
  ConvertRequest,
  ImportStats,
  PhaseTiming,
  WorkerMessage,
} from "./protocol";

// WebAssembly memories only grow, so the size each one ends at is its peak.
// Recording every memory the worker instantiates gives the WASM peak without
// reaching into web-ifc's internals.
const wasmMemories: WebAssembly.Memory[] = [];
const trackInstance = (instance: WebAssembly.Instance) => {
  for (const value of Object.values(instance.exports)) {
    if (value instanceof WebAssembly.Memory) wasmMemories.push(value);
  }
};
const instantiate = WebAssembly.instantiate;
WebAssembly.instantiate = (async (...args: Parameters<typeof instantiate>) => {
  const result = await instantiate(...args);
  // compiling a Module resolves to an Instance, compiling bytes to both
  const loaded = result as
    | WebAssembly.Instance
    | WebAssembly.WebAssemblyInstantiatedSource;
  trackInstance("instance" in loaded ? loaded.instance : loaded);
  return result;
}) as typeof instantiate;
const instantiateStreaming = WebAssembly.instantiateStreaming;
WebAssembly.instantiateStreaming = async (...args) => {
  const result = await instantiateStreaming(...args);
  trackInstance(result.instance);
  return result;
};

const post = (message: WorkerMessage, transfer: Transferable[] = []) =>
  postMessage(message, transfer);

let peakJsHeap: number | null = null;
const sampleHeap = () => {
  const memory = (performance as any).memory;
  if (!memory) return;
  peakJsHeap = Math.max(peakJsHeap ?? 0, memory.usedJSHeapSize);
};

class PhaseClock {
  readonly phases: PhaseTiming[] = [];
  private _current: string | null = null;
  private _start = 0;

  enter(phase: string) {
    if (phase === this._current) return;
    this.close();
    this._current = phase;
    this._start = performance.now();
  }

  close() {
    if (this._current === null) return;
    this.phases.push({
      phase: this._current,
      ms: performance.now() - this._start,
    });
    this._current = null;
  }
}

const phaseNames: Record<ProgressData["process"], string> = {
  conversion: "conversion",
  opening: "open model (web-ifc)",
  geometries: "geometry",
  indexing: "index file",
  attributes: "attributes",
  relations: "relations",
  serializing: "serialize",
};

const createImporter = (request: ConvertRequest, clock: PhaseClock) => {
  const importer = new IfcImporter();
  importer.wasm = { path: request.wasmPath, absolute: true };
  Object.assign(importer.webIfcSettings, request.webIfcSettings);
  if (request.residentBudget !== undefined) {
    importer.residentBudget = request.residentBudget;
  }
  const progressCallback = (fraction: number, data: ProgressData) => {
    sampleHeap();
    const phase = phaseNames[data.process];
    // the closing "conversion" event marks the end, not a phase of its own
    if (data.process !== "conversion") clock.enter(phase);
    post({ type: "progress", phase, fraction, detail: data.class });
  };
  return { importer, progressCallback };
};

/** Reads the whole file, then converts it with a second web-ifc for properties. */
const convertInMemory = async (request: ConvertRequest, clock: PhaseClock) => {
  clock.enter("read file");
  const bytes = new Uint8Array(await request.file.arrayBuffer());
  const { importer, progressCallback } = createImporter(request, clock);
  const output = await importer.process({ bytes, raw: true, progressCallback });
  return { output, counts: {} };
};

/** Reads the `File` in place; properties come from the parsing layer. */
const convertStreaming = async (request: ConvertRequest, clock: PhaseClock) => {
  const { importer, progressCallback } = createImporter(request, clock);
  const source = new IfcBlobSource(request.file, {
    cacheBytes: 128 * 1024 * 1024,
  });
  const parallel = request.mode === "parallel";
  const output = await importer.process({
    file: request.file,
    source,
    raw: true,
    progressCallback,
    geometryBatches: parallel
      ? {
          createWorker: () =>
            new Worker(new URL("./geometry-worker.ts", import.meta.url), {
              type: "module",
            }),
          workers: request.workers,
          batchBytes: request.batchBytes,
        }
      : undefined,
  });
  const counts: Record<string, number> = {
    "file reads (FileReaderSync)": source.fileReads,
  };
  const projected = importer.stats.projected;
  if (projected) {
    counts["geometry workers"] = request.workers;
    counts.batches = projected.batches;
    counts["largest batch (KB of IFC)"] = Math.round(
      projected.largestProjection / 1024,
    );
    counts["largest worker WASM heap (MB)"] = Math.round(
      projected.largestWasmHeap / 1024 / 1024,
    );
    counts["batch planning (ms)"] = Math.round(projected.planningMs);
  }
  return { output, counts };
};

onmessage = async (event: MessageEvent<ConvertRequest>) => {
  const request = event.data;
  if (request.type !== "convert") return;
  const clock = new PhaseClock();
  const start = performance.now();
  try {
    const convert =
      request.mode === "legacy" ? convertInMemory : convertStreaming;
    const { output, counts } = await convert(request, clock);
    clock.close();
    sampleHeap();
    const stats: ImportStats = {
      mode: request.mode,
      fileBytes: request.file.size,
      outputBytes: output.byteLength,
      totalMs: performance.now() - start,
      phases: clock.phases,
      wasmMemories: wasmMemories.map((memory) => memory.buffer.byteLength),
      peakJsHeap,
      counts,
    };
    post({ type: "done", bytes: output, stats }, [output.buffer]);
  } catch (error) {
    const err = error as Error;
    post({ type: "error", message: String(err?.message ?? err), stack: err?.stack });
  }
};
