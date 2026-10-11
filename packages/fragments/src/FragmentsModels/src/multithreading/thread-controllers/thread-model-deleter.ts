import { MultiThreadingRequestClass } from "../../model/model-types";
import { ThreadController } from "./thread-controller";

export class ThreadModelDeleter extends ThreadController {
  protected getId() {
    return MultiThreadingRequestClass.DELETE_MODEL;
  }

  protected async execute(input: any) {
    const { modelId } = input;
    // A load whose file went to the main thread to be migrated and never came
    // back (the migration failed) leaves nothing here but these.
    if (this.thread.migrating.delete(modelId)) {
      this.thread.aborting.delete(modelId);
    }
    // Idempotent: if the model was already disposed (e.g. after an aborted
    // load that cleaned up partial state on the worker), just return.
    const model = this.thread.list.get(modelId);
    if (!model) return;
    model.dispose();
    this.thread.list.delete(modelId);
  }
}
