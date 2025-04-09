import { MultiThreadingRequestClass } from "../../model/model-types";
import { ThreadController } from "./thread-controller";
import { MultithreadingHelper } from "../multithreading-helper";

enum RaycastType {
  BEAM = 0,
  RECTANGLE = 1,
  WITH_SNAP = 2,
}

export class ThreadRaycaster extends ThreadController {
  protected getId() {
    return MultiThreadingRequestClass.RAYCAST;
  }

  protected async execute(input: any) {
    const raycastType = this.getRaycastType(input);

    if (raycastType === RaycastType.BEAM) {
      this.raycastBeam(input);
      return;
    }

    if (raycastType === RaycastType.WITH_SNAP) {
      this.raycastWithSnap(input);
      return;
    }

    if (raycastType === RaycastType.RECTANGLE) {
      this.raycastRectangle(input);
      return;
    }

    throw new Error("Fragments: Invalid raycast type");
  }

  private getRaycastType(input: any) {
    if (input.snappingClass) {
      return RaycastType.WITH_SNAP;
    }
    if (input.ray) {
      return RaycastType.BEAM;
    }
    return RaycastType.RECTANGLE;
  }

  private raycastRectangle(input: any) {
    const model = this.thread.getModel(input.modelId);
    const frustum = MultithreadingHelper.frustum(input.frustum);
    const fullyIncluded = input.fullyIncluded;
    const localIds = model.rectangleRaycast(frustum, fullyIncluded);
    input.localIds = localIds;
  }

  private raycastWithSnap(input: any) {
    const model = this.thread.getModel(input.modelId);
    const beam = MultithreadingHelper.beam(input.ray);
    const frustum = MultithreadingHelper.frustum(input.frustum);
    const snappingClass = input.snappingClass;
    const results = model.snapRaycast(beam, frustum, snappingClass);
    input.results = results;
  }

  private raycastBeam(input: any) {
    const model = this.thread.getModel(input.modelId);
    const beam = MultithreadingHelper.beam(input.ray);
    const frustum = MultithreadingHelper.frustum(input.frustum);
    const hit = model.raycast(beam, frustum);
    if (hit) {
      input.results = [hit];
    }
  }
}
