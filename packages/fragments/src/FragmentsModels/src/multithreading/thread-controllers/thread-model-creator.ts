import Pako from "pako";
import {
  LoadAbortedError,
  MultiThreadingRequestClass,
} from "../../model/model-types";
import { ThreadController } from "./thread-controller";
import { VirtualFragmentsModel } from "../../virtual-model";
import { gate } from "../../../../Migrations/gate";
import { applyRequests } from "../../../../Migrations/src/apply";
import { check } from "../../../../Migrations/src/gate";

export class ThreadModelCreator extends ThreadController {
  protected getId() {
    return MultiThreadingRequestClass.CREATE_MODEL;
  }

  protected async execute(input: any) {
    const { modelId } = input;
    const notify = this.createProgressNotifier(modelId);
    const throwIfAborted = () => {
      if (this.thread.aborting.has(modelId)) {
        throw new LoadAbortedError(modelId);
      }
    };

    this.thread.migrating.delete(modelId);
    this.thread.loading.add(modelId);
    try {
      this.inflate(input);
      notify("decompressing", 1);
      throwIfAborted();

      if (this.isBehind(input, notify)) {
        return;
      }

      // The updater is shared by the whole worker, so the latest loaded model
      // controls the delay for every model assigned to this worker.
      this.thread.controllerManager.updater.setUpdateDelay(
        input.config?.multithreading?.threadUpdaterDelay,
      );

      const model = await this.createModel(input, notify, throwIfAborted);
      this.finalize(input, model);

      notify("done", 1);
    } catch (e) {
      // Clean up any partial state the worker allocated for this model.
      const partial = this.thread.list.get(modelId);
      if (partial) {
        try {
          partial.dispose();
        } catch {
          // swallow — best-effort disposal of partial state
        }
        this.thread.list.delete(modelId);
      }
      throw e;
    } finally {
      this.thread.aborting.delete(modelId);
      this.thread.loading.delete(modelId);
    }
  }

  private finalize(input: any, model: VirtualFragmentsModel) {
    input.boundingBox = model.getFullBBox();
    input.modelData = undefined;
  }

  private async createModel(
    input: any,
    notify: (stage: string, progress: number) => void,
    throwIfAborted: () => void,
  ) {
    const { modelId, modelData, config } = input;
    const { connection } = this.thread;
    const model = new VirtualFragmentsModel(
      modelId,
      modelData,
      connection,
      config,
    );

    // Register early so the catch block can dispose the partial model.
    this.thread.list.set(modelId, model);

    // Resume the update loop now that there is a model to drive. The loop stops
    // itself when the model list empties, so this re-arms it after idle (#234).
    this.thread.controllerManager.updater.start();

    notify("parsing", 1);
    throwIfAborted();

    await model.setupData((progress: number) => {
      notify("generating", progress);
    }, throwIfAborted);

    return model;
  }

  /**
   * Tells whether the file was written by an older version of the package
   * and has something to catch up on. That is all the worker knows about
   * migrations: the code that does them is loaded by the main thread, and
   * only for a file that is behind. Such a file is answered with no model
   * and handed back, inflated, to be migrated and sent again.
   *
   * With migrating turned off, a file that is only behind on content is
   * read as it is, and one that cannot be read (its layout changed, or it is
   * newer than this package) is refused. The refusal is answered as data: a
   * thrown error reaches the main thread as a string.
   *
   * @returns Whether the load ends here.
   */
  private isBehind(
    input: any,
    notify: (stage: string, progress: number) => void,
  ) {
    const data: ArrayBuffer | Uint8Array = input.modelData;
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    if (input.migrated) {
      // The file is back from the main thread, which ran the migrations as
      // far as it could without the editor. What they ask to edit is applied
      // here, where the editor is.
      if (input.requests?.length > 0) {
        input.modelData = applyRequests(bytes, input.requests);
        notify("migrating", 1);
      }
      return false;
    }
    const { known, pending, readable, revision, latest } = check(bytes, gate);
    if (known && pending.length === 0) {
      return false;
    }
    if (input.config?.migrate === false) {
      if (readable) {
        return false;
      }
      const name = known ? "StaleFragmentsError" : "UnknownRevisionError";
      input.migration = { error: { name, revision, latest, pending } };
      input.modelData = undefined;
      return true;
    }
    notify("migrating", 0);
    this.thread.migrating.add(input.modelId);
    input.migration = { pending: true };
    input.modelData = bytes;
    input.transferBack = [bytes.buffer];
    return true;
  }

  private inflate(input: any) {
    if (!input.raw) {
      input.modelData = Pako.inflate(input.modelData);
    }
  }

  private createProgressNotifier(modelId: string) {
    const { connection } = this.thread;
    return (stage: string, progress: number) => {
      // Fire-and-forget (same pattern as CREATE_MATERIAL transfer)
      connection.fetch({
        class: MultiThreadingRequestClass.LOAD_PROGRESS,
        modelId,
        stage,
        progress,
      });
    };
  }
}
