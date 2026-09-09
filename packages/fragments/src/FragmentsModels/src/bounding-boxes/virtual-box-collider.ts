import * as THREE from "three";
import { VirtualBox } from "./virtual-box";
import { CameraUtils } from "../utils";
import { VirtualSpatialPoint } from "./virtual-spatial-point";
import { VirtualBoxCompressor } from "./virtual-box-compressor";

type BoxEvent = (box: THREE.Box3) => boolean;

export class VirtualBoxCollider {
  private readonly _data;
  private readonly _compressor: VirtualBoxCompressor;

  constructor(
    compressor: VirtualBoxCompressor,
    data: {
      points: Array<VirtualSpatialPoint>;
      limits: {
        primary: Array<VirtualBox>;
        secondary: Array<VirtualBox>;
      };
    },
  ) {
    this._data = data;
    this._compressor = compressor;
  }

  frustumCollide(
    bounds: THREE.Plane[],
    frustum: THREE.Frustum,
    fullyIncluded = false,
  ): number[] {
    const planes = this.getFrustumPlanes(frustum, bounds);
    const onCollide = this.getFrustumOnCollide(planes);
    const onIncludes = this.getFrustumOnIncludes(planes);
    const onSeen = this.newDefaultCallback(true);
    return this.collide(onCollide, onIncludes, onSeen, fullyIncluded);
  }

  /**
   * Marks every point whose box does NOT touch the given frustum (plus
   * optional clipping planes) with 1 in `mask`, and every candidate
   * with 0. Same traversal and plane semantics as {@link frustumCollide},
   * but writes into a caller-owned mask instead of allocating a result
   * array — the culling hot path calls this on every view change, and
   * with everything on screen a result array would hold every sample.
   */
  frustumFillOutsideMask(
    bounds: THREE.Plane[],
    frustum: THREE.Frustum,
    mask: Uint8Array,
  ) {
    mask.fill(1);
    const planes = this.getFrustumPlanes(frustum, bounds);
    const onCollide = this.getFrustumOnCollide(planes);
    const onIncludes = this.getFrustumOnIncludes(planes);
    const onSeen = this.newDefaultCallback(true);
    this.traverse(onCollide, onIncludes, onSeen, (data) => {
      mask[data] = 0;
    });
  }

  rayCollide(bounds: THREE.Plane[], ray: THREE.Ray): number[] {
    const onCollide = this.getRayOnCollide(ray);
    const onIncludes = this.newDefaultCallback(false);
    const onSeen = this.getRayOnSeen(bounds);
    return this.collide(onCollide, onIncludes, onSeen);
  }

  private getPointData(position: number): number {
    const point = this.getPoint(position);
    return point.data;
  }

  private getBounds(position: number): THREE.Box3 {
    const point = this.getPoint(position);
    return this._compressor.inflate(point.box);
  }

  private isPoint(position: number): boolean {
    const point = this.getPoint(position);
    return point.isPoint;
  }

  private newDefaultCallback(value: boolean) {
    return (_args: any) => value;
  }

  private groupSize(position: number): number {
    const point = this.getPoint(position);
    return point.size;
  }

  private getPoint(position: number) {
    return this._data.points[position];
  }

  private getRayOnSeen(bounds: THREE.Plane[]) {
    let onSeen = this.newDefaultCallback(true);
    const boundsExists = bounds?.length > 0;
    if (boundsExists) {
      onSeen = (box: THREE.Box3) => {
        return CameraUtils.collides(box, bounds);
      };
    }
    return onSeen;
  }

  private getRayOnCollide(beam: THREE.Ray) {
    return (box: THREE.Box3) => {
      return beam.intersectsBox(box);
    };
  }

  private collide(
    onCollide: BoxEvent,
    onIncludes: BoxEvent,
    onSeen: BoxEvent,
    fullyIncluded = false,
  ): number[] {
    const result: number[] = [];
    this.traverse(onCollide, onIncludes, onSeen, (data, includes) => {
      if (!fullyIncluded || includes) {
        result.push(data);
      }
    });
    return result;
  }

  // Shared hierarchy walk: groups whose box misses the query are skipped
  // wholesale, fully-included groups collect their leaves without further
  // box tests, and each surviving leaf is handed to `onLeaf` together
  // with whether it sits in a fully-included group.
  private traverse(
    onCollide: BoxEvent,
    onIncludes: BoxEvent,
    onSeen: BoxEvent,
    onLeaf: (data: number, includes: boolean) => void,
  ) {
    const pointAmount = this._data.points.length;
    let currentPosition = 0;

    const addAllPoints = (bound: THREE.Box3, includes: boolean) => {
      const finalPosition = currentPosition + this.groupSize(currentPosition);
      for (; currentPosition < finalPosition; currentPosition++) {
        const isPoint = this.isPoint(currentPosition);
        if (isPoint && onSeen(bound)) {
          onLeaf(this.getPointData(currentPosition), includes);
        }
      }
    };

    const processCollisions = () => {
      const bound = this.getBounds(currentPosition);
      const includes = onIncludes(bound);
      const isPoint = this.isPoint(currentPosition);
      const collides = includes || onCollide(bound);

      if (isPoint && collides && onSeen(bound)) {
        onLeaf(this.getPointData(currentPosition), includes);
      }

      if (collides || isPoint) {
        currentPosition++;
        if (includes && !isPoint) {
          addAllPoints(bound, includes);
        }
      } else {
        currentPosition += this.groupSize(currentPosition);
      }
    };

    while (currentPosition < pointAmount) {
      processCollisions();
    }
  }

  private getFrustumOnIncludes(planes: THREE.Plane[]) {
    return (box: THREE.Box3) => {
      return CameraUtils.isIncluded(box, planes);
    };
  }

  private getFrustumOnCollide(planes: THREE.Plane[]) {
    return (box: THREE.Box3) => {
      return CameraUtils.collides(box, planes);
    };
  }

  private getFrustumPlanes(frustum: THREE.Frustum, bounds: THREE.Plane[]) {
    const planes: THREE.Plane[] = [];
    for (const plane of frustum.planes) {
      planes.push(plane);
    }
    if (bounds) {
      for (const plane of bounds) {
        planes.push(plane);
      }
    }
    return planes;
  }

}
