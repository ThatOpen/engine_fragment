import { MultiThreadingRequestClass } from "../../model/model-types";
import { MultithreadingHelper } from "../multithreading-helper";
import { ThreadController } from "./thread-controller";

export class ThreadExecutor extends ThreadController {
  protected getId() {
    return MultiThreadingRequestClass.EXECUTE;
  }

  protected async execute(input: any) {
    const model = this.thread.getModel(input.modelId) as any;
    this.safeCopyData(input);
    input.result = await model[input.function](...input.parameters);
    input.parameters = undefined;
  }

  private safeCopyData(input: any) {
    for (let i = 0; i < input.parameters.length; i++) {
      const data = input.parameters[i];
      if (!data) continue;
      input.parameters[i] = MultithreadingHelper.data(data);
    }
  }
}
