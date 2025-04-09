import { MultiThreadingRequestClass } from "../../model/model-types";
import { MultithreadingHelper } from "../multithreading-helper";
import { ThreadController } from "./thread-controller";

export class ThreadViewRefresher extends ThreadController {
  protected getId() {
    return MultiThreadingRequestClass.REFRESH_VIEW;
  }

  protected async execute(input: any) {
    const model = this.thread.list.get(input.modelId);
    if (model) {
      this.safeCopyFrustum(input);
      this.safeCopyPosition(input);
      this.safeCopyPlanes(input);
      model.refreshView(input.view);
    }
  }

  private safeCopyFrustum(input: any) {
    const frustum = input.view.cameraFrustum;
    input.view.cameraFrustum = MultithreadingHelper.frustum(frustum);
  }

  private safeCopyPosition(input: any) {
    const position = input.view.cameraPosition;
    input.view.cameraPosition = MultithreadingHelper.array(position);
  }

  private safeCopyPlanes(input: any) {
    const planes = input.view.clippingPlanes;
    input.view.clippingPlanes = MultithreadingHelper.planeSet(planes);
  }
}
