import { MultiThreadingRequestClass } from "../../model/model-types";
import { ThreadController } from "./thread-controller";

export class ThreadModelAborter extends ThreadController {
  protected getId() {
    return MultiThreadingRequestClass.ABORT_MODEL;
  }

  protected async execute(input: any) {
    const { uid } = input;
    // Only flag loads that are actually in flight: a flag left behind would
    // never be cleared.
    if (!this.thread.loading.has(uid)) return;
    // The running generate() loop will see this flag at its next yield and
    // throw, unwinding the CREATE_MODEL call. Cleanup of any partial state
    // happens in ThreadModelCreator's catch block.
    this.thread.aborting.add(uid);
  }
}
