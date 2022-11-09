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
      BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
      BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
      Mesh.prototype.raycast = acceleratedRaycast;
      BVH.initialized = true;
    }
    if (!geometry.boundsTree) {
      geometry.computeBoundsTree();
    }
  }

  static dispose(geometry: BufferGeometry) {
    geometry.disposeBoundsTree();
  }
}
