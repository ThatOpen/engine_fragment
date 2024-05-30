import { BufferGeometry, Mesh } from "three";
import {
  computeBoundsTree,
  disposeBoundsTree,
  acceleratedRaycast,
} from "three-mesh-bvh";

// Source: https://github.com/gkjohnson/three-mesh-bvh
export class BVH {
  private static initialized = false;

  static apply(geometry: BufferGeometry) {
    if (!BVH.initialized) {
      // @ts-ignore
      BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
      // @ts-ignore
      BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
      Mesh.prototype.raycast = acceleratedRaycast;
      BVH.initialized = true;
    }
    // @ts-ignore
    if (!geometry.boundsTree) {
      // @ts-ignore
      geometry.computeBoundsTree();
    }
  }

  static dispose(geometry: BufferGeometry) {
    // @ts-ignore
    if (geometry && geometry.disposeBoundsTree) {
      // @ts-ignore
      geometry.disposeBoundsTree();
    }
  }
}
