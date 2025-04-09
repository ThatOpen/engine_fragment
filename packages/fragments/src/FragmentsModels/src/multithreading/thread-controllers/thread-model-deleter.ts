import { MultiThreadingRequestClass } from "../../model/model-types";
import { ThreadController } from "./thread-controller";

export class ThreadModelDeleter extends ThreadController {
  protected getId() {
    return MultiThreadingRequestClass.DELETE_MODEL;
  }

  protected async execute(input: any) {
    const { modelId } = input;
    const model = this.thread.getModel(modelId);
    model.dispose();
    this.thread.list.delete(modelId);
  }
}
