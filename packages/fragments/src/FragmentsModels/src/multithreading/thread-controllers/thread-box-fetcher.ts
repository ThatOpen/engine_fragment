import { MultiThreadingRequestClass } from "../../model/model-types";
import { ThreadController } from "./thread-controller";

export class ThreadBoxFetcher extends ThreadController {
  protected getId() {
    return MultiThreadingRequestClass.FETCH_BOXES;
  }

  protected async execute(input: any) {
    input.boxes = [];

    if (input.localIds) {
      this.getBoxesFromLocalIds(input);
      return;
    }

    this.getAllBoxes(input);
  }

  private getBoxesFromLocalIds(input: any) {
    const model = this.thread.getModel(input.modelId);
    for (const localIds of input.localIds) {
      const itemIds = model.getItemIdsByLocalIds(localIds);
      const box = model.getBBoxes(itemIds);
      input.boxes.push(box);
    }
    input.localIds = undefined;
  }

  private getAllBoxes(input: any) {
    // This assumes that items geometries are always the first items
    // and that properties are created afterwards
    const model = this.thread.getModel(input.modelId);
    const size = model.getGeometriesLength();
    for (let i = 0; i < size; i++) {
      const box = model.getBBoxes([i]);
      input.boxes.push(box);
    }
    input.localIds = undefined;
  }
}
