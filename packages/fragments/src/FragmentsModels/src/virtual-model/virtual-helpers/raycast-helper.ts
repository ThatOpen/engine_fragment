import * as THREE from "three";
import { VirtualFragmentsModel } from "../virtual-fragments-model";
import { SnappingClass } from "../../model/model-types";

export class RaycastHelper {
  raycast(
    model: VirtualFragmentsModel,
    ray: THREE.Ray,
    frustum: THREE.Frustum,
  ): any {
    if (model.view) {
      return model.raycaster.raycast(ray, frustum, model.view.clippingPlanes);
    }
    return undefined;
  }

  snapRaycast(
    model: VirtualFragmentsModel,
    ray: THREE.Ray,
    frustum: THREE.Frustum,
    snappingClass: SnappingClass[],
  ): any[] {
    if (model.view) {
      return model.raycaster.snapRaycast(
        ray,
        frustum,
        snappingClass,
        model.view.clippingPlanes,
      );
    }
    return [];
  }

  rectangleRaycast(
    model: VirtualFragmentsModel,
    frustum: THREE.Frustum,
    fullyIncluded: boolean,
  ): number[] {
    if (model.view) {
      return model.raycaster.rectangleRaycast(
        frustum,
        model.view.clippingPlanes,
        fullyIncluded,
      );
    }
    return [];
  }
}
