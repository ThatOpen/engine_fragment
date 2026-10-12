import * as THREE from "three";
import {
  ModelMigration,
  MultiThreadingRequestClass,
  VirtualModelConfig,
} from "./model-types";
import { FragmentsModel } from "./fragments-model";
import {
  MigrationError,
  MigrationsUnavailableError,
  StaleFragmentsError,
  UnknownRevisionError,
} from "../../../Migrations/src/errors";

export class SetupManager {
  async setup(
    model: FragmentsModel,
    bbox: THREE.Box3,
    modelData: ArrayBuffer | Uint8Array,
    raw?: boolean,
    config?: VirtualModelConfig,
  ) {
    const message = this.getCreateModelMessage(model, modelData, raw, config);
    const data = this.formatModelData(modelData);
    // A file an older version wrote is migrated by the worker before it
    // reads it. All that comes back is what was done.
    const result = await model.threads.fetch(message, data);
    this.throwIfRefused(result);
    this.updateBox(bbox, result);
    return result.migration as ModelMigration | undefined;
  }

  /**
   * The worker answers a file it could not read with the error as data,
   * because an error it throws reaches this thread as a string.
   */
  private throwIfRefused(result: any) {
    const error = result.migration?.error;
    if (!error) {
      return;
    }
    switch (error.name) {
      case "StaleFragmentsError":
        throw new StaleFragmentsError(error.revision, error.pending);
      case "MigrationsUnavailableError":
        throw new MigrationsUnavailableError(error.url, error.reason);
      case "MigrationError":
        throw new MigrationError(error.migration, error.title, error.reason);
      default:
        throw new UnknownRevisionError(error.revision, error.latest);
    }
  }

  private formatModelData(modelData: ArrayBuffer | Uint8Array) {
    if (modelData instanceof ArrayBuffer) {
      return [modelData];
    }
    // A Uint8Array's backing buffer must be transferred too, otherwise the
    // model bytes get structured-cloned into the worker instead of moved.
    // `ifcLoader.load(new Uint8Array(buffer), ...)` is the common path, so
    // this avoids duplicating large IFC/model data on load.
    if (modelData instanceof Uint8Array) {
      return [modelData.buffer];
    }
    return undefined;
  }

  private updateBox(bbox: THREE.Box3, result: any) {
    bbox.min.copy(result.boundingBox.min);
    bbox.max.copy(result.boundingBox.max);
  }

  private getCreateModelMessage(
    model: FragmentsModel,
    modelData: ArrayBuffer | Uint8Array,
    raw: boolean | undefined,
    config: VirtualModelConfig | undefined,
  ) {
    return {
      class: MultiThreadingRequestClass.CREATE_MODEL,
      modelId: model.modelId,
      modelData,
      raw,
      config,
    } as any;
  }
}
