/* eslint-disable max-classes-per-file */
import * as WEBIFC from "web-ifc";
import { AlignmentData } from "../../../../FragmentsModels";
import { Hasher } from "./geometry-hash";
import { ExtractorOptions, IfcGeometryExtractor } from "./geometry-extractor";
import { batchTransferables, ExtractedBatch } from "./geometry-records";
import { CivilReader } from "./ifc/civil-reader";
import type { ProjectedGroup } from "./ifc-projector";

// ---------------------------------------------------------------------------
// Running one projection through web-ifc, in this thread or in a worker
// ---------------------------------------------------------------------------

/** web-ifc's typings leave out `delete`, which every embind handle has. */
type EmbindHandle = { delete(): void };

export interface BatchRunnerOptions {
  wasm: { path: string; absolute: boolean };
  loaderSettings: WEBIFC.LoaderSettings;
  extractor: ExtractorOptions;
}

export interface BatchRequest {
  index: number;
  /** A standalone IFC file: see `IfcProjector`. */
  projection: Uint8Array;
  groups: ProjectedGroup[];
  /**
   * How this batch gets the model's origin, when the importer moves the model
   * to it (`COORDINATE_TO_ORIGIN`):
   * - `"probe"`: this batch decides it, as the start of a single pass would,
   *   and reports which element did.
   * - an element id: the element that decided it, which the projection
   *   includes, streamed first so web-ifc derives the very same matrix.
   * - `"none"`: no origin at all — the model is not moved, or it turned out
   *   to already sit on the origin.
   */
  origin: "probe" | "none" | number;
  /** Read the file's alignments instead of streaming meshes. */
  alignments?: boolean;
}

export interface BatchResult {
  index: number;
  batch: ExtractedBatch;
  /** How many `StreamMeshes` callbacks ran. */
  meshCount: number;
  /** The model's coordination matrix after the batch. */
  coordination: number[];
  /** For a probe: the element that set the origin, if one did. */
  primer?: number;
  alignments?: AlignmentData[];
  /** Size of the worker's WASM heap after the batch, in bytes. */
  wasmHeap: number;
}

const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

export const isIdentity = (matrix: number[]) =>
  matrix.every((value, i) => value === identity[i]);

/** Opens projections in one web-ifc instance, one at a time. */
export class IfcBatchRunner {
  private _api: WEBIFC.IfcAPI | null = null;
  private _hasher: Hasher | null = null;

  constructor(private readonly _options: BatchRunnerOptions) {}

  async init() {
    const api = new WEBIFC.IfcAPI();
    api.SetWasmPath(this._options.wasm.path, this._options.wasm.absolute);
    const [, hasher] = await Promise.all([api.Init(), Hasher.init()]);
    api.SetLogLevel(WEBIFC.LogLevel.LOG_LEVEL_OFF);
    this._api = api;
    this._hasher = hasher;
  }

  run(request: BatchRequest): BatchResult {
    const api = this._api!;
    const modelID = api.OpenModel(request.projection, {
      ...this._options.loaderSettings,
      COORDINATE_TO_ORIGIN: request.origin !== "none",
    });
    try {
      if (typeof request.origin === "number") {
        // web-ifc takes its origin from the first geometry it meets, so meet
        // the one a single pass met first. Pinning the matrix instead
        // (SetGeometryTransformation) multiplies in a different order, and
        // rounding then moves a few transforms by the last stored digit.
        api.StreamMeshes(modelID, [request.origin], (mesh) => {
          (mesh.geometries as unknown as EmbindHandle).delete();
        });
      }

      if (request.alignments) {
        return {
          index: request.index,
          batch: { elements: [], shells: [], extrusions: [] },
          meshCount: 0,
          coordination: api.GetCoordinationMatrix(modelID),
          alignments: new CivilReader().read(api),
          wasmHeap: this.heapSize(),
        };
      }

      const extractor = new IfcGeometryExtractor({
        api,
        modelID,
        hasher: this._hasher!,
        options: this._options.extractor,
      });
      let meshCount = 0;
      const onMesh = (category: number) => (mesh: WEBIFC.FlatMesh) => {
        meshCount++;
        try {
          extractor.extract(mesh, category);
        } finally {
          (mesh.geometries as unknown as EmbindHandle).delete();
        }
      };

      let primer: number | undefined;
      for (const { category, ids } of request.groups) {
        if (request.origin !== "probe" || primer !== undefined) {
          api.StreamMeshes(modelID, ids, onMesh(category));
          continue;
        }
        // One at a time, to see which element sets the origin
        for (const id of ids) {
          api.StreamMeshes(modelID, [id], onMesh(category));
          if (primer === undefined && !isIdentity(api.GetCoordinationMatrix(modelID))) {
            primer = id;
          }
        }
      }
      return {
        index: request.index,
        batch: extractor.takeBatch(),
        meshCount,
        coordination: api.GetCoordinationMatrix(modelID),
        primer,
        wasmHeap: this.heapSize(),
      };
    } finally {
      api.CloseModel(modelID);
    }
  }

  dispose() {
    this._api?.Dispose();
    this._api = null;
  }

  private heapSize() {
    return (this._api as any)?.wasmModule?.HEAPU8?.length ?? 0;
  }
}

/** Something batches can be handed to: a runner in this thread, or a worker. */
export interface BatchExecutor {
  run(request: BatchRequest): Promise<BatchResult>;
  dispose(): void;
}

/** Runs batches in this thread. */
export class LocalBatchExecutor implements BatchExecutor {
  private _runner: IfcBatchRunner;
  private _ready: Promise<void>;

  constructor(options: BatchRunnerOptions) {
    this._runner = new IfcBatchRunner(options);
    this._ready = this._runner.init();
  }

  async run(request: BatchRequest) {
    await this._ready;
    return this._runner.run(request);
  }

  dispose() {
    this._runner.dispose();
  }
}

type WorkerReply =
  | { type: "ready" }
  | { type: "result"; result: BatchResult }
  | { type: "error"; message: string; stack?: string };

/**
 * Runs batches in a worker that called {@link serveIfcGeometryWorker}. The
 * projection is transferred, not copied, and so is the geometry coming back.
 */
export class WorkerBatchExecutor implements BatchExecutor {
  private _ready: Promise<void>;
  private _pending: {
    resolve: (result: BatchResult) => void;
    reject: (error: Error) => void;
  } | null = null;

  constructor(
    private readonly _worker: Worker,
    options: BatchRunnerOptions,
  ) {
    this._ready = new Promise((resolve, reject) => {
      this._worker.onmessage = ({ data }: MessageEvent<WorkerReply>) => {
        if (data.type === "ready") {
          resolve();
          return;
        }
        const pending = this._pending;
        this._pending = null;
        if (!pending) return;
        if (data.type === "result") pending.resolve(data.result);
        else pending.reject(Object.assign(new Error(data.message), data));
      };
      this._worker.onerror = (event) => {
        const error = new Error(event.message || "IFC geometry worker failed");
        reject(error);
        this._pending?.reject(error);
        this._pending = null;
      };
    });
    this._worker.postMessage({ type: "init", options });
  }

  async run(request: BatchRequest) {
    await this._ready;
    if (this._pending) throw new Error("Fragments: worker is busy");
    return new Promise<BatchResult>((resolve, reject) => {
      this._pending = { resolve, reject };
      this._worker.postMessage({ type: "batch", request }, [
        request.projection.buffer as ArrayBuffer,
      ]);
    });
  }

  dispose() {
    this._worker.terminate();
  }
}

/**
 * The worker side of {@link WorkerBatchExecutor}. Call it at the top level of
 * a worker script, and hand `IfcImporter` a factory that starts that script.
 *
 * @example
 * ```ts
 * // ifc-geometry-worker.ts
 * import { serveIfcGeometryWorker } from "@thatopen/fragments";
 * serveIfcGeometryWorker();
 * ```
 */
export function serveIfcGeometryWorker(scope: any = globalThis) {
  let runner: IfcBatchRunner | null = null;
  scope.onmessage = async ({ data }: MessageEvent) => {
    try {
      if (data.type === "init") {
        runner = new IfcBatchRunner(data.options);
        await runner.init();
        scope.postMessage({ type: "ready" });
        return;
      }
      if (data.type === "batch") {
        const result = runner!.run(data.request);
        scope.postMessage(
          { type: "result", result },
          batchTransferables(result.batch),
        );
      }
    } catch (error) {
      const err = error as Error;
      scope.postMessage({
        type: "error",
        message: String(err?.message ?? err),
        stack: err?.stack,
      });
    }
  };
}
