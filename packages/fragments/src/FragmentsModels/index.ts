import * as THREE from "three";
import { MeshManager, FragmentsModel } from "./src/model";

import {
  VirtualModelConfig,
  LoadProgressEvent,
  MultiThreadingRequestClass,
} from "./src";
import { FragmentsConnection } from "./src/multithreading/fragments-connection";
import { ThreadHandler } from "./src/multithreading/connection-handlers";
import { Event } from "../Utils";
import { Editor } from "./src/edit";

export * from "./src";

declare const __FRAGMENTS_VERSION__: string;

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
      const url = `https://unpkg.com/@thatopen/fragments@${__FRAGMENTS_VERSION__}/dist/worker/worker.mjs`;
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
    /** Force update rate in milliseconds */
    forceUpdateRate: 200,
    /** Force update buffer time in milliseconds */
    forceUpdateBuffer: 200,
    /** Interval in milliseconds to flush queued mesh requests from thread to main thread */
    meshConnectionRate: 64,
    /** Number of queued mesh requests that triggers an immediate flush */
    meshConnectionThreshold: 16,
    /** Delay in milliseconds between worker-side update loops when work is complete */
    threadUpdaterDelay: 128,
  };

  /** Coordinates of the first loaded model, used for coordinate system alignment */
  baseCoordinates: number[] | null = null;

  /** The editor instance for managing model edits and changes */
  editor: Editor;

  private readonly _connection: FragmentsConnection;

  private _progressCallbacks = new Map<
    string,
    (event: LoadProgressEvent) => void
  >();

  private _isDisposed = false;
  private _autoRedrawInterval: any = null;
  private _lastUpdate = 0;

  /**
   * Creates a new FragmentsModels instance.
   * @param workerURL - The URL of the worker script that will handle the fragments processing.
   * The recommended way to obtain this URL is via {@link FragmentsModels.getWorker}, which fetches
   * the version-matched worker from unpkg:
   * ```ts
   * const workerURL = await FragmentsModels.getWorker();
   * const fragments = new FragmentsModels(workerURL);
   * ```
   * If omitted, it falls back to the worker bundled with the package (only works with bundlers
   * that can resolve `new URL("./Worker/worker.mjs", import.meta.url)`).
   * @param options - Optional configuration.
   * @param options.classicWorker - If true, creates classic (non-module) workers. Use together with `toClassicWorker()`.
   */
  constructor(workerURL?: string, options?: { classicWorker?: boolean }) {
    const url =
      workerURL ?? new URL("./Worker/worker.mjs", import.meta.url).href;
    const requestEvent = this.newRequestEvent();
    const updateEvent = this.newUpdateEvent();
    this._connection = new FragmentsConnection(
      requestEvent,
      url,
      options?.classicWorker,
    );
    this.editor = new Editor(this, this._connection);
    this.models = new MeshManager(updateEvent);
    this.models.list.onItemDeleted.add(() => {
      if (this.models.list.size !== 0) return;
      this.baseCoordinates = null;
    });
  }

  /**
   * Loads a fragments model from an ArrayBuffer.
   * @param buffer - The ArrayBuffer containing the fragments data to load.
   * @param options - Configuration options for loading the model.
   * @param options.modelId - Unique identifier for the model.
   * @param options.camera - Optional camera to use for model culling and LOD.
   * @param options.raw - If true, loads raw (uncompressed) data. Default is false.
   * @param options.userData - Optional custom data to attach to the model.
   * @param options.virtualModelConfig - Optional configuration for virtual model setup.
   * @returns Promise resolving to the loaded FragmentsModel instance.
   */
  async load(
    buffer: ArrayBuffer | Uint8Array,
    options: {
      modelId: string;
      camera?: THREE.PerspectiveCamera | THREE.OrthographicCamera;
      raw?: boolean;
      userData?: Record<string, any>;
      virtualModelConfig?: VirtualModelConfig;
      /** Optional callback for receiving loading progress updates. */
      onProgress?: (event: LoadProgressEvent) => void;
    },
  ) {
    const virtualModelConfig: VirtualModelConfig = {
      ...options.virtualModelConfig,
      multithreading: {
        meshConnectionRate: this.settings.meshConnectionRate,
        meshConnectionThreshold: this.settings.meshConnectionThreshold,
        threadUpdaterDelay: this.settings.threadUpdaterDelay,
        ...options.virtualModelConfig?.multithreading,
      },
    };

    const model = new FragmentsModel(
      options.modelId,
      this.models,
      this._connection,
      this.editor,
    );

    if (options.userData) {
      model.object.userData = options.userData;
    }

    // Skip model updates until we have the data set
    model.frozen = true;

    model.graphicsQuality = this.settings.graphicsQuality;

    if (options.onProgress) {
      this._progressCallbacks.set(options.modelId, options.onProgress);
    }

    try {
      this.models.list.set(model.modelId, model);
      await model._setup(buffer, options.raw, virtualModelConfig);
      if (this.settings.autoCoordinate) {
        const coordinates = await model.getCoordinates();
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
      this._progressCallbacks.delete(options.modelId);
      // Fully dispose partial state — this tears down the worker thread
      // (if this was the last model on it), clears transferred materials,
      // removes the model object from its parent, and deletes it from the
      // models list. `model.dispose()` is safe on partially-loaded models
      // because the worker-side `DELETE_MODEL` handler is now idempotent.
      try {
        await model.dispose();
      } catch {
        // best-effort: if disposal fails, still ensure main-thread cleanup
        this.models.list.delete(model.modelId);
      }
      throw e;
    } finally {
      this._progressCallbacks.delete(options.modelId);
    }

    const { camera } = options;

    if (camera) {
      model.useCamera(camera);
    }

    // Model has all the data, so it can start updating
    model.frozen = false;

    this.onModelLoaded.trigger(model);

    return model;
  }

  /**
   * Disposes of all models managed by this FragmentsModels instance.
   * After calling this method, the FragmentsModels instance should not be used anymore.
   */
  async dispose() {
    this._isDisposed = true;
    const models = Array.from(this.models.list.values());
    const promises = [];
    for (const model of models) {
      promises.push(model.dispose());
    }
    await Promise.all(promises);
    this.onModelLoaded.reset();
  }

  /**
   * Disposes of a specific model by its ID.
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
   *
   * @param modelId - The unique identifier of the model to abort.
   */
  abort(modelId: string) {
    // Fire-and-forget — the worker sets an abort flag and the in-flight
    // generate() loop throws at its next yield point. The error unwinds
    // through load() and its catch block cleans up on the main thread.
    this._connection.fetch({
      class: MultiThreadingRequestClass.ABORT_MODEL,
      modelId,
    });
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
    if (now - this._lastUpdate < this.settings.maxUpdateRate) {
      return;
    }
    this._lastUpdate = now;

    // Update the virtual view for all models
    const modelUpdates: Promise<void>[] = [];
    for (const model of this.models.list.values()) {
      modelUpdates.push(model._refreshView());
    }
    await Promise.all(modelUpdates);

    // This might not be ideal
    if (force) {
      await this.models.forceUpdateFinish(
        this.settings.forceUpdateRate,
        this.settings.forceUpdateBuffer,
      );
    } else {
      this.models.update();
    }
  }

  private async manageRequest(message: any): Promise<void> {
    if (message.class === MultiThreadingRequestClass.LOAD_PROGRESS) {
      const callback = this._progressCallbacks.get(message.modelId);
      if (callback) {
        callback({
          modelId: message.modelId,
          stage: message.stage,
          progress: message.progress,
        });
      }
      return;
    }
    const model = this.models.list.get(message.modelId);
    if (model) {
      await model.handleRequest(message);
    }
  }

  private newUpdateEvent() {
    return () => {
      // This limits the maximum update rate to the maxUpdateRate setting
      if (this._autoRedrawInterval) {
        clearTimeout(this._autoRedrawInterval);
      }

      const offset = this.settings.maxUpdateRate + 1;
      this._autoRedrawInterval = setTimeout(() => {
        this.update();
      }, offset);
    };
  }

  private newRequestEvent() {
    return (request: ThreadHandler) => {
      this.manageRequest(request);
    };
  }
}
