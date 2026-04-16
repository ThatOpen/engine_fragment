import Pako from "pako";
import { MultiThreadingRequestClass } from "../../model/model-types";
import { ThreadController } from "./thread-controller";
import { VirtualFragmentsModel } from "../../virtual-model";

export class ThreadModelCreator extends ThreadController {
  protected getId() {
    return MultiThreadingRequestClass.CREATE_MODEL;
  }

  protected async execute(input: any) {
    const { modelId } = input;
    const notify = this.createProgressNotifier(modelId);

    this.inflate(input);
    notify("decompressing", 1);

    const model = await this.createModel(input, notify);
    this.setupData(input, model);

    notify("done", 1);
  }

  private setupData(input: any, model: VirtualFragmentsModel) {
    input.boundingBox = model.getFullBBox();
    input.modelData = undefined;
  }

  private async createModel(
    input: any,
    notify: (stage: string, progress: number) => void,
  ) {
    const { modelId, modelData, config } = input;
    const { connection } = this.thread;
    const model = new VirtualFragmentsModel(
      modelId,
      modelData,
      connection,
      config,
    );

    notify("parsing", 1);

    await model.setupData((progress: number) => {
      notify("generating", progress);
    });

    this.thread.list.set(modelId, model);
    return model;
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
