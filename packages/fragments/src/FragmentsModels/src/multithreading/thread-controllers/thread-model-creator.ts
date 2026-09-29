import Pako from "pako";
import {
  LoadAbortedError,
  LoadProgressEvent,
  ModelUid,
  MultiThreadingRequestClass,
  WorkerRequest,
} from "../../model/model-types";
import { ThreadController } from "./thread-controller";
import { VirtualFragmentsModel } from "../../virtual-model";

export class ThreadModelCreator extends ThreadController {
  protected getId() {
    return MultiThreadingRequestClass.CREATE_MODEL;
  }

  protected async execute(input: any) {
    const { uid } = input;
    const load = this.load(input);
    // A DELETE that lands mid-load aborts it and waits for it to unwind.
    this.thread.loading.set(
      uid,
      load.then(
        () => {},
        () => {},
      ),
    );
    try {
      await load;
    } finally {
      this.thread.aborting.delete(uid);
      this.thread.loading.delete(uid);
    }
  }

  private async load(input: any) {
    const { uid } = input;
    const notify = this.createProgressNotifier(uid);
    const throwIfAborted = () => {
      if (this.thread.aborting.has(uid)) {
        // The main thread rebuilds this error with the model's modelId.
        throw new LoadAbortedError(String(uid));
      }
    };

    try {
      this.inflate(input);
      notify("decompressing", 1);
      throwIfAborted();

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
      const partial = this.thread.list.get(uid);
      if (partial) {
        try {
          partial.dispose();
        } catch {
          // swallow — best-effort disposal of partial state
        }
        this.thread.list.delete(uid);
      }
      throw e;
    }
  }

  private finalize(input: any, model: VirtualFragmentsModel) {
    input.boundingBox = model.getFullBBox();
    input.modelData = undefined;
  }

  private async createModel(
    input: any,
    notify: (stage: LoadProgressEvent["stage"], progress: number) => void,
    throwIfAborted: () => void,
  ) {
    const { uid, modelData, config } = input;
    const { connection } = this.thread;
    const model = new VirtualFragmentsModel(uid, modelData, connection, config);

    // Register early so the catch block can dispose the partial model.
    this.thread.list.set(uid, model);

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

  private inflate(input: any) {
    if (!input.raw) {
      input.modelData = Pako.inflate(input.modelData);
    }
  }

  private createProgressNotifier(uid: ModelUid) {
    const { connection } = this.thread;
    return (stage: LoadProgressEvent["stage"], progress: number) => {
      // Fire-and-forget: if the main thread fails to handle it, it logs the
      // error itself, and there is nothing to do about it here.
      connection
        .fetch({
          class: MultiThreadingRequestClass.LOAD_PROGRESS,
          uid,
          stage,
          progress,
        } satisfies WorkerRequest)
        .catch(() => {});
    };
  }
}
