import * as THREE from "three";
import { MeshManager, FragmentsModel } from "./src/model";

import { VirtualModelConfig } from "./src";
import { FragmentsConnection } from "./src/multithreading/fragments-connection";
import { ThreadHandler } from "./src/multithreading/connection-handlers";
import { Event } from "../Utils";

export * from "./src";

/**
 * The main class for managing multiple 3D models loaded from fragments files. Handles loading, disposing, updating, raycasting, highlighting and coordinating multiple FragmentsModel instances. This class acts as the main entry point for working with fragments models.
 *
 */
export class FragmentsModels {
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
  };

  /** Coordinates of the first loaded model, used for coordinate system alignment */
  baseCoordinates: number[] | null = null;

  private readonly _connection: FragmentsConnection;

  private _isDisposed = false;
  private _autoRedrawInterval: any = null;
  private _lastUpdate = 0;

  /**
   * Creates a new FragmentsModels instance.
   * @param workerURL - The URL of the worker script that will handle the fragments processing.
   * This should point to a copy of the fragments worker file from @thatopen/fragments.
   */
  constructor(workerURL: string) {
    const requestEvent = this.newRequestEvent();
    const updateEvent = this.newUpdateEvent();
    this._connection = new FragmentsConnection(requestEvent, workerURL);
    this.models = new MeshManager(updateEvent);
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
    buffer: ArrayBuffer,
    options: {
      modelId: string;
      camera?: THREE.PerspectiveCamera | THREE.OrthographicCamera;
      raw?: boolean;
      userData?: Record<string, any>;
      virtualModelConfig?: VirtualModelConfig;
    },
  ) {
    const model = new FragmentsModel(
      options.modelId,
      this.models,
      this._connection,
    );

    if (options.userData) {
      model.object.userData = options.userData;
    }

    // Skip model updates until we have the data set
    model.frozen = true;

    model.graphicsQuality = this.settings.graphicsQuality;

    try {
      this.models.list.set(model.modelId, model);
      await model._setup(buffer, options.raw, options.virtualModelConfig);
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
      this.models.list.delete(model.modelId);
      throw e;
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
      await this.models.forceUpdateFinish();
    } else {
      this.models.update();
    }
  }

  private async manageRequest(message: any): Promise<void> {
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
