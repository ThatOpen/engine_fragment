import * as THREE from "three";
import { VirtualSpatialPoint } from "./virtual-spatial-point";
import { VirtualBox } from "./virtual-box";
import { VirtualBoxController } from "./virtual-box-controller";
import { VirtualBoxCompressor } from "./virtual-box-compressor";
import { VirtualBoxCollider } from "./virtual-box-collider";
import { VirtualBoxMaker } from "./virtual-box-maker";

export class VirtualBoxStructure {
  private static readonly _boxSize = 6;
  private static readonly _limitThreshold = 32;
  private readonly _compressor: VirtualBoxCompressor;
  private readonly _collider: VirtualBoxCollider;
  private readonly _maker: VirtualBoxMaker;

  private readonly _data: {
    points: Array<VirtualSpatialPoint>;
    limits: {
      primary: Array<VirtualBox>;
      secondary: Array<VirtualBox>;
    };
  };

  private readonly _boxes: VirtualBoxController;

  constructor(boxes: VirtualBoxController) {
    this._boxes = boxes;
    this._compressor = new VirtualBoxCompressor(boxes);
    this._data = this.getData();
    this._collider = new VirtualBoxCollider(this._compressor, this._data);
    this._maker = new VirtualBoxMaker(
      this._boxes,
      this._compressor,
      this._data,
    );
    this.initData();
  }

  collideFrustum(
    bounds: THREE.Plane[],
    frustum: THREE.Frustum,
    fullyIncluded = false,
  ): number[] {
    return this._collider.frustumCollide(bounds, frustum, fullyIncluded);
  }

  collideRay(bounds: THREE.Plane[], beam: THREE.Ray): number[] {
    return this._collider.rayCollide(bounds, beam);
  }

  private setupLimits() {
    for (let i = 0; i < VirtualBoxStructure._limitThreshold; i++) {
      this._data.limits.primary.push(new VirtualBox());
      this._data.limits.secondary.push(new VirtualBox());
    }
  }

  private getPointBuffer() {
    const count = this._boxes.getCount();
    const pointBuffer = new Uint32Array(count);
    for (let i = 0; i < pointBuffer.length; i++) {
      pointBuffer[i] = i;
    }
    return pointBuffer;
  }

  private getPointsAmount(pointBuffer: Uint32Array) {
    const result = pointBuffer.length * 2;
    return result - 1;
  }

  private initData() {
    const pointBuffer = this.getPointBuffer();
    const pointsAmount = this.getPointsAmount(pointBuffer);
    const size = pointsAmount * VirtualBoxStructure._boxSize;
    const data = new Float64Array(size);
    for (let i = 0; i < pointsAmount; i++) {
      const position = i * VirtualBoxStructure._boxSize;
      const newPoint = new VirtualSpatialPoint(position, data);
      this._data.points.push(newPoint);
    }
    this.setupLimits();
    const root = new VirtualBox();
    this._maker.make(pointBuffer, root, pointBuffer.length);
  }

  private getData() {
    return {
      points: [],
      limits: {
        primary: [],
        secondary: [],
      },
    };
  }
}
