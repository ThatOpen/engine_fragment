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
import { MigrationCode, loadMigrations } from "../../../../Migrations/src/load";

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

      const refused = await this.migrate(input, notify, throwIfAborted);
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
   * is read, all of it here: the main thread only gets to know what was
   * done, on `input.migration`.
   *
   * The worker carries the gate, which tells whether a file is behind, and
   * none of the code that migrates. It imports that for a file that needs
   * it, from the URLs the main thread sent along, and lends it its editor
   * for what the edit steps ask for.
   *
   * A file that cannot be read is answered with the error as data and no
   * model, because a thrown error reaches the main thread as a string: one
   * that is newer than this package, one a migration failed on, and one
   * whose layout changed when migrating is off or the code did not load. In
   * those last two cases a file that is only behind on content is read as
   * it is.
   *
   * @returns Whether the load was refused.
   */
  private async migrate(
    input: any,
    notify: (stage: string, progress: number) => void,
    throwIfAborted: () => void,
  ) {
    const data: ArrayBuffer | Uint8Array = input.modelData;
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const { known, pending, readable, revision, latest } = check(bytes, gate);
    if (known && pending.length === 0) {
      return false;
    }
    const refuse = (error: Record<string, unknown>) => {
      input.migration = { error };
      input.modelData = undefined;
      return true;
    };
    if (!known) {
      return refuse({ name: "UnknownRevisionError", revision, latest });
    }
    if (input.config?.migrate === false) {
      if (readable) {
        return false;
      }
      return refuse({ name: "StaleFragmentsError", revision, pending });
    }

    notify("migrating", 0);
    const sources: string[] = input.config?.migrationSources ?? [];
    let code: MigrationCode;
    try {
      code = await loadMigrations(sources, latest);
    } catch (error: any) {
      const reason: string = error.message;
      if (!readable) {
        const name = "MigrationsUnavailableError";
        return refuse({ name, revision, sources, reason });
      }
      console.warn(
        `Fragments: the file is at revision ${revision} and was read without being migrated, because the code that migrates could not be loaded (${reason || "no URL to load it from"}). See the migrationsURL option of FragmentsModels.`,
      );
      return false;
    }
    throwIfAborted();

    try {
      const result = await code.run(bytes, { apply: applyRequests });
      if (result.applied.length > 0) {
        const { from, to, applied } = result;
        input.modelData = result.bytes;
        input.migration = { from, to, applied };
      }
    } catch (error: any) {
      // The class of the error is the one of the imported code, not the one
      // this worker was built with, so it is told by name.
      if (error?.name !== "MigrationError") {
        throw error;
      }
      const { name, migration, title, cause } = error;
      const reason = cause instanceof Error ? cause.message : String(cause);
      return refuse({ name, migration, title, reason });
    }
    notify("migrating", 1);
    return false;
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
