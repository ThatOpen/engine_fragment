import Pako from "pako";
import {
  LoadAbortedError,
  MultiThreadingRequestClass,
} from "../../model/model-types";
import { ThreadController } from "./thread-controller";
import { VirtualFragmentsModel } from "../../virtual-model";
import {
  StaleFragmentsError,
  UnknownRevisionError,
} from "../../../../Migrations/src/errors";
import { getRevision, migrate } from "../../../../Migrations/src/runner";

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

    this.thread.loading.add(modelId);
    try {
      this.inflate(input);
      notify("decompressing", 1);
      throwIfAborted();

      const refused = await this.migrate(input, notify);
      throwIfAborted();
      if (refused) {
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
   * Brings a file an older version of the package wrote up to date before it
   * is read, since that is the only point where the stale bytes can still be
   * told from current ones. What was done goes back to the main thread on
   * `input.migration`.
   *
   * A file that cannot be read (it needs a layout migration and migrating is
   * off, or it is newer than this package) is answered with the error as
   * data and no model: a thrown error reaches the main thread as a string.
   *
   * @returns Whether the load was refused.
   */
  private async migrate(
    input: any,
    notify: (stage: string, progress: number) => void,
  ) {
    const data: ArrayBuffer | Uint8Array = input.modelData;
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    try {
      const info = getRevision(bytes);
      if (info.pending.length === 0) {
        return false;
      }
      if (input.config?.migrate === false) {
        if (info.readable) {
          return false;
        }
        throw new StaleFragmentsError(info.revision, info.pending);
      }
      const result = await migrate(bytes, { raw: true });
      notify("migrating", 1);
      if (result.applied.length > 0) {
        const { from, to, applied } = result;
        input.modelData = result.bytes;
        input.migration = { from, to, applied };
      }
      return false;
    } catch (error) {
      if (error instanceof StaleFragmentsError) {
        const { name, revision, pending } = error;
        input.migration = { error: { name, revision, pending } };
      } else if (error instanceof UnknownRevisionError) {
        const { name, revision, latest } = error;
        input.migration = { error: { name, revision, latest } };
      } else {
        throw error;
      }
      input.modelData = undefined;
      return true;
    }
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
