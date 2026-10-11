import * as THREE from "three";
import {
  ModelMigration,
  MultiThreadingRequestClass,
  VirtualModelConfig,
} from "./model-types";
import { FragmentsModel } from "./fragments-model";
import {
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
    let result = await model.threads.fetch(message, data);
    this.throwIfRefused(result);
    let migration: ModelMigration | undefined;
    if (result.migration?.pending) {
      // The worker only tells that the file is behind. What brings it up to
      // date is loaded here, the first time a file needs it, so an app whose
      // files are current never downloads it.
      const { prepare } = await import("../../../Migrations/src/core");
      const prepared = await prepare(result.modelData);
      const { bytes, requests, from, to, applied } = prepared;
      if (applied.length > 0) {
        migration = { from, to, applied };
      }
      // What the edit steps ask for goes back with the file: the worker has
      // the editor, and applies it before reading the file.
      const again = this.getCreateModelMessage(model, bytes, true, config);
      again.migrated = true;
      again.requests = requests;
      result = await model.threads.fetch(again, [bytes.buffer]);
    }
    this.updateBox(bbox, result);
    return migration;
  }

  // The worker answers a file it refused to read with the error as data,
  // because an error it throws reaches this thread as a string.
  private throwIfRefused(result: any) {
    const error = result.migration?.error;
    if (!error) {
      return;
    }
    if (error.name === "StaleFragmentsError") {
      throw new StaleFragmentsError(error.revision, error.pending);
    }
    throw new UnknownRevisionError(error.revision, error.latest);
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
