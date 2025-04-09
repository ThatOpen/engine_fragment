import Pako from "pako";
import { MultiThreadingRequestClass } from "../../model/model-types";
import { ThreadController } from "./thread-controller";
import { VirtualFragmentsModel } from "../../virtual-model";

export class ThreadModelCreator extends ThreadController {
  protected getId() {
    return MultiThreadingRequestClass.CREATE_MODEL;
  }

  protected async execute(input: any) {
    this.inflate(input);
    const model = this.createModel(input);
    this.setupData(input, model);
  }

  private setupData(input: any, model: VirtualFragmentsModel) {
    input.boundingBox = model.getFullBBox();
    input.modelData = undefined;
  }

  private createModel(input: any) {
    const { modelId, modelData, config } = input;
    const { connection } = this.thread;
    const model = new VirtualFragmentsModel(
      modelId,
      modelData,
      connection,
      config,
    );
    model.setupData();
    this.thread.list.set(modelId, model);
    return model;
  }

  private inflate(input: any) {
    if (!input.raw) {
      input.modelData = Pako.inflate(input.modelData);
    }
  }
}
