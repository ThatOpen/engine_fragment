import { MultiThreadingRequestClass } from "../../model/model-types";
import { ThreadController } from "./thread-controller";

export class ThreadModelDeleter extends ThreadController {
  protected getId() {
    return MultiThreadingRequestClass.DELETE_MODEL;
  }

  protected async execute(input: any) {
    const { uid } = input;
    // A model still loading is registered before its generate() loop ends,
    // so disposing it here would pull its data from under that loop. Abort
    // the load instead, and let it clean up after itself.
    const loading = this.thread.loading.get(uid);
    if (loading) {
      this.thread.aborting.add(uid);
      await loading;
    }
    // Idempotent: if the model was already disposed (e.g. after an aborted
    // load that cleaned up partial state on the worker), just return.
    const model = this.thread.list.get(uid);
    if (!model) return;
    model.dispose();
    this.thread.list.delete(uid);
  }
}
