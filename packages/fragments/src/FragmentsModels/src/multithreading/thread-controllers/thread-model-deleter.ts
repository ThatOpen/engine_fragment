import { MultiThreadingRequestClass } from "../../model/model-types";
import { ThreadController } from "./thread-controller";

export class ThreadModelDeleter extends ThreadController {
  protected getId() {
    return MultiThreadingRequestClass.DELETE_MODEL;
  }

  protected async execute(input: any) {
    const { modelId } = input;
    // Idempotent: if the model was already disposed (e.g. after an aborted
    // load that cleaned up partial state on the worker), just return.
    const model = this.thread.list.get(modelId);
    if (!model) return;
    model.dispose();
    this.thread.list.delete(modelId);
  }
}
