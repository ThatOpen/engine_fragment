import * as THREE from "three";
import { FragmentsModel, MeshManager } from "./src/model";

import { Event, FRAGMENTS_VERSION } from "../Utils";
import {
  LoadAbortedError,
  LoadProgressEvent,
  ModelUid,
  MultiThreadingRequestClass,
  VirtualModelConfig,
  WorkerRequest,
  isRawBuffer,
} from "./src";
import { Editor } from "./src/edit";
import { ThreadHandler } from "./src/multithreading/connection-handlers";
import { FragmentsConnection } from "./src/multithreading/fragments-connection";

export * from "./src";

export interface FragmentsModelsOptions {
  /**
   * If true, creates classic (non-module) workers. Use together with `toClassicWorker()`.
   */
  classicWorker?: boolean;
  /**
   * Effective max worker cap. Defaults to `navigator.hardwareConcurrency - 3`, floored at 2. Set explicitly for CI environments or when you know your workload.
   */
  maxWorkers?: number;
  /**
   * Reserved worker capacity per named thread group. Workers are spawned lazily (nothing is spawned until the first load targets a pool). A model loaded with `threadGroup: "x"` always lands on group "x"'s pool; default-pool loads never touch a reserved worker. The sum of group sizes must leave at least one slot for the default pool, otherwise init throws.
   */
  threadGroups?: Record<string, number>;
}

/**
 * Settles like `promise`, or rejects as soon as `signal` aborts, whichever
 * comes first. `promise` itself keeps running.
 */
function untilAborted<T>(promise: Promise<T>, signal: AbortSignal) {
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    if (signal.aborted) {
      onAbort();
    } else {
      signal.addEventListener("abort", onAbort, { once: true });
    }
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

/**
 * The main class for managing multiple 3D models loaded from fragments files. Handles loading, disposing, updating, raycasting, highlighting and coordinating multiple FragmentsModel instances. This class acts as the main entry point for working with fragments models. A FragmentsModels instance needs a worker to process fragments off the main thread. The recommended way to obtain the worker URL is via the static FragmentsModels.getWorker method, which fetches the version-matched worker from unpkg. Check the method docs for more info.
 */
export class FragmentsModels {
  private static _workerURL: string | null = null;
  private static _workerPromise: Promise<string> | null = null;

  /**
   * Fetches the fragments worker from unpkg for the exact version of this
   * `@thatopen/fragments` package and returns a blob URL you can pass to the
   * `FragmentsModels` constructor. The result is cached, so calling this
   * method more than once is cheap.
   *
   * This is the recommended way to obtain the worker URL — it guarantees the
   * worker version matches the library version and requires no copying of
   * files into your project.
   *
   * @example
   * ```ts
   * const workerURL = await FragmentsModels.getWorker();
   * const fragments = new FragmentsModels(workerURL);
   * ```
   *
   * @returns A blob URL pointing to the fragments worker script.
   */
  static async getWorker(): Promise<string> {
    if (FragmentsModels._workerURL) return FragmentsModels._workerURL;
    if (FragmentsModels._workerPromise) return FragmentsModels._workerPromise;

    FragmentsModels._workerPromise = (async () => {
      const url = `https://unpkg.com/@thatopen/fragments@${FRAGMENTS_VERSION}/dist/worker/worker.mjs`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch fragments worker from ${url}: ${response.status} ${response.statusText}`,
        );
      }
      const blob = await response.blob();
      const file = new File([blob], "worker.mjs", { type: "text/javascript" });
      const objectURL = URL.createObjectURL(file);
      FragmentsModels._workerURL = objectURL;
      return objectURL;
    })();

    try {
      return await FragmentsModels._workerPromise;
    } catch (error) {
      FragmentsModels._workerPromise = null;
      throw error;
    }
  }

  /**
   * Event triggered when a model is loaded.
   * @event
   * @type {Event<FragmentsModel>}
   */
  readonly onModelLoaded = new Event<FragmentsModel>();

  /**
   * The manager that handles all loaded fragments models.
   * Provides functionality to:
   * - Store and retrieve models by ID
   * - Track model loading/unloading
   * - Coordinate updates across models
   * - Handle model disposal
   */
  models: MeshManager;

  /** Settings that control the behavior of the FragmentsModels system */
  settings = {
    /** Whether to automatically coordinate model positions relative to the first loaded model */
    autoCoordinate: true,
    /** Maximum rate (in milliseconds) at which visual updates are performed */
    maxUpdateRate: 100,
    /** Graphics quality level - 0 is low quality, 1 is high quality */
    graphicsQuality: 0,
    /**
     * @deprecated The polling-based force-flush implementation has
     * been replaced by a sequence-fence one (`forceUpdateFinish`
     * resolves the moment a FINISH stamped with the relevant seq
     * arrives). These knobs are no longer read; kept only to avoid
     * breaking apps that set them.
     */
    forceUpdateRate: 200,
    /** @deprecated See {@link forceUpdateRate}. */
    forceUpdateBuffer: 200,
    /**
     * Interval in milliseconds to flush queued mesh requests from thread to
     * main thread. Set this once at FragmentsModels construction; changing
     * it after a model has been loaded has no effect on already-loaded
     * models (they keep the value they were created with).
     *
     * Default 16 ms (one frame at 60 Hz). The previous 64 ms default
     * left tile updates sitting in the worker's outflow buffer for up
     * to ~1 frame longer than necessary; lowering it tightens the
     * latency between worker work and visible result on every
     * interaction. Apps with very heavy worker output may want to
     * raise this to reduce postMessage frequency.
     */
    meshConnectionRate: 16,
    /**
     * Number of queued mesh requests that triggers an immediate flush.
     * Same setup-time semantics as {@link meshConnectionRate}. Default
     * 4 — bursts of work flush within a frame instead of being
     * pinned to the rate timer.
     */
    meshConnectionThreshold: 4,
    /**
     * Delay in milliseconds between worker-side update loops when work is
     * complete. Note: each worker has a single shared update loop, so when
     * multiple models share a worker (default round-robin pool, or any
     * `threadGroup`), the most recently loaded model's value applies to
     * every model on that worker. Set this once at FragmentsModels
     * construction and treat it as a global tuning knob.
     *
     * Default 32 ms (~30 Hz). The previous 128 ms default left the
     * worker idling for up to ~8 frames between iterations, which on
     * interactive workloads showed up as visible lag between RPC and
     * visual settle. Apps with low-end CPUs may want to raise it to
     * reduce idle-loop overhead.
     */
    threadUpdaterDelay: 32,
  };

  /** Coordinates of the first loaded model, used for coordinate system alignment */
  baseCoordinates: number[] | null = null;

  /** The editor instance for managing model edits and changes */
  editor: Editor;

  private readonly _connection: FragmentsConnection;

  private _progressCallbacks = new Map<
    ModelUid,
    (event: LoadProgressEvent) => void
  >();

  private _lastUid = 0;

  /** How to abort each load in flight, see {@link abort}. */
  private readonly _loadAborts = new Map<ModelUid, () => void>();

  private _isDisposed = false;
  private _autoRedrawInterval: any = null;
  private _lastUpdate = 0;
  private _pendingForcedUpdate: Promise<void> | null = null;
  // Handle and resolver of the coalesced forced update, kept so dispose()
  // can cancel the timer and still release whoever is awaiting it.
  private _pendingForcedTimer: ReturnType<typeof setTimeout> | null = null;
  private _pendingForcedResolve: (() => void) | null = null;

  /**
   * Creates a new FragmentsModels instance.
   *
   * The recommended way to obtain the worker URL is via {@link FragmentsModels.getWorker},
   * which fetches the version-matched worker from unpkg. See its docs for an example.
   *
   * @param workerURL - The URL of the worker script that will handle the fragments processing. If omitted, it falls back to the worker bundled with the package (only works with bundlers that can resolve `new URL("./Worker/worker.mjs", import.meta.url)`).
   * @param options - Optional configuration.
   */
  constructor(workerURL?: string, options?: FragmentsModelsOptions) {
    const url =
      workerURL ?? new URL("./Worker/worker.mjs", import.meta.url).href;
    const updateEvent = () => {
      // A tile batch can land after dispose(); it must not re-arm the loop.
      if (this._isDisposed) return;
      // This limits the maximum update rate to the maxUpdateRate setting
      if (this._autoRedrawInterval) {
        clearTimeout(this._autoRedrawInterval);
      }

      const offset = this.settings.maxUpdateRate + 1;
      this._autoRedrawInterval = setTimeout(() => {
        this._autoRedrawInterval = null;
        this.update();
      }, offset);
    };
    this._connection = new FragmentsConnection(this.manageRequest, url, {
      classicWorker: options?.classicWorker,
      maxWorkers: options?.maxWorkers,
      threadGroups: options?.threadGroups,
    });
    this.editor = new Editor(this);
    this.models = new MeshManager(updateEvent);
    this.models.list.onItemDeleted.add(() => {
      if (this.models.list.size !== 0) return;
      this.baseCoordinates = null;
    });
  }

  /**
   * Effective max worker cap for this instance. Surfaces the value derived
   * from `navigator.hardwareConcurrency - 3` (floored at 2) or the explicit
   * `maxWorkers` override passed to the constructor.
   */
  get maxWorkers(): number {
    return this._connection.maxWorkers;
  }

  /**
   * Reserved worker capacity per named thread group, as declared at init.
   * Empty object if no groups were declared.
   */
  get threadGroups(): Record<string, number> {
    return this._connection.threadGroups;
  }

  /**
   * Loads a fragments model from an ArrayBuffer.
   * @param buffer - The ArrayBuffer containing the fragments data to load.
   * @param options - Configuration options for loading the model.
   * @param options.modelId - Unique identifier for the model. Loading an ID that is already loaded or still loading throws; dispose the existing model first (the ID is free as soon as `dispose()` is called).
   * @param options.camera - Optional camera to use for model culling and LOD.
   * @param options.clippingPlanes - Optional clipping planes (world space) to cull against. The array is kept by reference and read on every view refresh; see {@link FragmentsModel.useClippingPlanes}.
   * @param options.raw - Whether the buffer is raw (uncompressed) or deflated. If omitted, it is auto-detected from the buffer (see {@link isRawBuffer}).
   * @param options.userData - Optional custom data to attach to the model.
   * @param options.virtualModelConfig - Optional configuration for virtual model setup.
   * @returns Promise resolving to the loaded FragmentsModel instance.
   * @throws {LoadAbortedError}
   */
  async load(
    buffer: ArrayBuffer | Uint8Array,
    {
      modelId,
      camera,
      clippingPlanes,
      raw: explicitRaw,
      userData,
      virtualModelConfig: customVirtualModelConfig,
      onProgress,
      threadGroup,
      signal,
    }: {
      modelId: string;
      camera?: THREE.PerspectiveCamera | THREE.OrthographicCamera;
      clippingPlanes?: THREE.Plane[];
      /**
       * @deprecated derived from {@link buffer} bytes under the hood, @see {@link isRawBuffer}
       */
      raw?: boolean;
      userData?: Record<string, any>;
      virtualModelConfig?: VirtualModelConfig;
      /** Optional callback for receiving loading progress updates. */
      onProgress?: (event: LoadProgressEvent) => void;
      /**
       * Routes the model to a thread group declared at init time. Models
       * sharing a group also share workers, isolated from other groups and
       * from the default pool. Throws if the group was not declared.
       */
      threadGroup?: string;
      /**
       * Aborts the load when the signal fires, same as calling
       * {@link FragmentsModels.abort} with this model's ID: `load()` rejects
       * with a {@link LoadAbortedError} and the partial model is disposed. If
       * the signal is already aborted, `load()` rejects without doing any work.
       */
      signal?: AbortSignal;
    },
  ) {
    if (signal?.aborted) {
      throw new LoadAbortedError(modelId);
    }

    // Only live models count: a disposed model finishes its teardown under
    // its own uid, so its modelId is free as soon as it is disposed.
    if (this.models.list.has(modelId)) {
      throw new Error(
        `Fragments: model "${modelId}" is already loaded or loading. Dispose it first or use a different modelId.`,
      );
    }

    const virtualModelConfig: VirtualModelConfig = {
      ...customVirtualModelConfig,
      multithreading: {
        meshConnectionRate: this.settings.meshConnectionRate,
        meshConnectionThreshold: this.settings.meshConnectionThreshold,
        threadUpdaterDelay: this.settings.threadUpdaterDelay,
        ...customVirtualModelConfig?.multithreading,
      },
    };

    // Auto-detect compression when the caller did not specify it, so a raw or
    // deflated buffer both just work. An explicit `raw` always wins.
    const bytes =
      buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const raw = explicitRaw ?? isRawBuffer(bytes);

    const model = this._createModel(modelId, threadGroup);

    if (userData) {
      model.object.userData = userData;
    }

    // Skip model updates until we have the data set
    model.frozen = true;

    model.graphicsQuality = this.settings.graphicsQuality;

    if (onProgress) {
      this._progressCallbacks.set(model._uid, onProgress);
    }

    // Aborted by the caller's signal and by disposing the model mid-load.
    const loading = new AbortController();
    const abortLoading = () => loading.abort();
    model._disposedSignal.addEventListener("abort", abortLoading, {
      once: true,
    });
    const onAbort = () => {
      // Only once, whether it comes from the signal or from abort().
      if (loading.signal.aborted) return;
      abortLoading();
      // Fire-and-forget — the worker sets an abort flag and the in-flight
      // generate() loop throws at its next yield point.
      this._connection
        .fetch({
          class: MultiThreadingRequestClass.ABORT_MODEL,
          uid: model._uid,
        })
        // Rejects only if the model never got a thread, so there is nothing to
        // abort on the worker.
        .catch(() => {});
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    this._loadAborts.set(model._uid, onAbort);

    try {
      this.models._add(model);
      // An abort rejects right away instead of waiting for the worker to
      // unwind, which it does on its own. It can also land after a step
      // settled but before the load moves on, hence the checks.
      await untilAborted(
        model._setup(buffer, raw, virtualModelConfig),
        loading.signal,
      );
      loading.signal.throwIfAborted();
      if (this.settings.autoCoordinate) {
        const coordinates = await untilAborted(
          model.getCoordinates(),
          loading.signal,
        );
        loading.signal.throwIfAborted();
        if (this.baseCoordinates === null) {
          this.baseCoordinates = coordinates;
        } else {
          const [px, py, pz] = coordinates;
          const [baseX, baseY, baseZ] = this.baseCoordinates;
          const transform = new THREE.Vector3(
            baseX - px,
            baseY - py,
            baseZ - pz,
          );
          model.object.position.add(transform);
        }
      }
    } catch (e) {
      // Read first: disposing the model below aborts the load too.
      const aborted = loading.signal.aborted;
      // Fully dispose partial state: the model leaves the models list and
      // the scene, its modelId is free again, and the worker drops whatever
      // it built. A no-op if the load was aborted by disposing it.
      model.dispose();
      // A worker-side abort arrives as its serialized error string, not as a
      // LoadAbortedError instance, so rebuild the error here.
      throw aborted ? new LoadAbortedError(modelId) : e;
    } finally {
      model._disposedSignal.removeEventListener("abort", abortLoading);
      signal?.removeEventListener("abort", onAbort);
      this._loadAborts.delete(model._uid);
      this._progressCallbacks.delete(model._uid);
    }

    if (camera) {
      model.useCamera(camera);
    }

    if (clippingPlanes) {
      model.useClippingPlanes(clippingPlanes);
    }

    // Model has all the data, so it can start updating
    model.frozen = false;

    this.onModelLoaded.trigger(model);

    return model;
  }

  /**
   * Internal method to create a model under a new uid. Don't use this
   * directly; use {@link load} instead.
   */
  _createModel(modelId: string, threadGroup?: string) {
    const uid = ++this._lastUid as ModelUid;
    // Record the model's group before we issue any worker request so the
    // pool routing in fragments-connection picks the right thread.
    this._connection.setModelThreadGroup(uid, threadGroup);
    return new FragmentsModel({
      modelId,
      uid,
      meshManager: this.models,
      threads: this._connection,
      editor: this.editor,
      threadGroup,
    });
  }

  /**
   * Disposes of all models managed by this FragmentsModels instance.
   * After calling this method, the FragmentsModels instance should not be used anymore.
   * Like {@link FragmentsModel.dispose}, it takes effect before it returns;
   * the returned promise resolves once the workers have deleted the models.
   */
  async dispose() {
    this._isDisposed = true;
    if (this._autoRedrawInterval) {
      clearTimeout(this._autoRedrawInterval);
      this._autoRedrawInterval = null;
    }
    if (this._pendingForcedTimer) {
      clearTimeout(this._pendingForcedTimer);
      this._pendingForcedTimer = null;
    }
    if (this._pendingForcedResolve) {
      this._pendingForcedResolve();
      this._pendingForcedResolve = null;
    }
    this._pendingForcedUpdate = null;
    const models = Array.from(this.models.list.values());
    const promises = [];
    for (const model of models) {
      promises.push(model.dispose());
    }
    this.onModelLoaded.reset();
    await Promise.all(promises);
  }

  /**
   * Disposes of a specific model by its ID. See {@link FragmentsModel.dispose}.
   * @param modelId - The unique identifier of the model to dispose.
   */
  async disposeModel(modelId: string) {
    const model = this.models.list.get(modelId);
    if (model) {
      await model.dispose();
    }
  }

  /**
   * Aborts an in-flight `load()` for the given model ID. The pending `load()`
   * promise will reject with a `LoadAbortedError` and any partial state
   * (on both the main thread and the worker) is disposed.
   *
   * Has no effect if the model finished loading or isn't currently loading.
   * It aborts the load under that ID at the time of the call: after a load
   * was aborted or disposed, a new load of the same ID is a different load.
   * To tie a load to an `AbortController`, pass its signal to `load()` instead.
   *
   * @param modelId - The unique identifier of the model to abort.
   */
  abort(modelId: string) {
    const model = this.models.list.get(modelId);
    if (!model) return;
    this._loadAborts.get(model._uid)?.();
  }

  /**
   * Updates all models managed by this FragmentsModels instance.
   * @param force - If true, it will force all the models to finish all the pending requests.
   */
  async update(force = false) {
    if (this._isDisposed) {
      return;
    }
    const now = performance.now();
    const elapsed = now - this._lastUpdate;
    if (elapsed < this.settings.maxUpdateRate) {
      if (!force) {
        // Keep the poll alive: view changes are detected by these
        // periodic checks, so a throttled call must still leave a
        // scheduled one behind. Cheap — no worker traffic happens
        // until a view actually changes.
        this.scheduleNextUpdate();
        return;
      }
      // Forced updates must not be dropped (callers await them as a
      // fence), but they must not bypass the rate limit either: camera
      // controls emit "rest" — and the components layer forces an
      // update on it — on nearly every frame of a programmatic orbit,
      // and each forced refresh is a full re-cull plus an unbounded
      // drain on the main thread. Coalesce every forced call inside
      // the window into one trailing forced update; awaiting callers
      // are released when that one has settled, which covers all the
      // RPCs they could have been waiting for.
      if (!this._pendingForcedUpdate) {
        const delay = this.settings.maxUpdateRate - elapsed + 1;
        this._pendingForcedUpdate = new Promise<void>((resolve) => {
          this._pendingForcedResolve = resolve;
          this._pendingForcedTimer = setTimeout(() => {
            this._pendingForcedTimer = null;
            this._pendingForcedResolve = null;
            this._pendingForcedUpdate = null;
            this.performUpdate(true).then(resolve, () => resolve());
          }, delay);
        });
      }
      return this._pendingForcedUpdate;
    }
    return this.performUpdate(force);
  }

  private async performUpdate(force: boolean) {
    if (this._isDisposed) {
      return;
    }
    this._lastUpdate = performance.now();

    // Update the virtual view for all models. Unforced refreshes are
    // skipped per model when its view is unchanged (no RPC at all);
    // forced ones always dispatch because their FINISH acts as the
    // completion fence for forceUpdateFinish below.
    const modelUpdates: Promise<void>[] = [];
    for (const model of this.models.list.values()) {
      modelUpdates.push(model._refreshView(force));
    }
    await Promise.all(modelUpdates);

    if (force) {
      // Sequence-fence based: resolves precisely when every RPC
      // dispatched up to this call has had its effects flushed to
      // main and applied. No polling, no buffer.
      await this.models.forceUpdateFinish();
    } else {
      this.models.update();
    }
    this.scheduleNextUpdate();
  }

  /**
   * (Re)schedules the next automatic update. The view-change gating
   * means an idle scene produces no worker messages and thus no
   * FINISH-driven update events, so the loop sustains itself with
   * this timer instead. Skipped when disposed or no models exist —
   * the next model load (or any mesh update event) restarts it.
   */
  private scheduleNextUpdate() {
    if (this._isDisposed || this.models.list.size === 0) {
      return;
    }
    if (this._autoRedrawInterval) {
      clearTimeout(this._autoRedrawInterval);
    }
    const offset = this.settings.maxUpdateRate + 1;
    this._autoRedrawInterval = setTimeout(() => {
      this._autoRedrawInterval = null;
      this.update();
    }, offset);
  }

  private manageRequest: ThreadHandler<WorkerRequest> = async (request) => {
    const model = this.models._get(request.uid);
    // A disposed model's messages are dropped: nothing they'd change is left.
    if (!model) {
      if (request.class === MultiThreadingRequestClass.RECOMPUTE_MESHES) {
        this.models._dropRequests(request.list);
        // The answer is this request: don't copy the tiles back with it.
        request.list = [];
      }
      return;
    }
    if (request.class === MultiThreadingRequestClass.LOAD_PROGRESS) {
      const callback = this._progressCallbacks.get(model._uid);
      if (callback) {
        callback({
          modelId: model.modelId,
          stage: request.stage,
          progress: request.progress,
        });
      }
      return;
    }
    await model.handleRequest(request);
  };
}
