import * as THREE from "three";

import {
  Axis,
  AxisPartClass,
  WireSet,
  CircleCurve,
  CircleExtrusion,
} from "../../../../../Schema";
import { VceCasterUtils } from "./vce-caster-utils";
import { limitOf2Bytes } from "../../../model/model-types";

type AxisPartData = {
  indices: number;
  points: number;
  faces: number;
  links: number;
};

type PathData = {
  center: THREE.Vector3;
  last: THREE.Vector3;
  axis: THREE.Vector3;
  first: THREE.Vector3;
  cuts: THREE.Vector3[];
  mids: THREE.Vector3[];
};

export class VceUtils {
  static readonly up = new THREE.Vector3(0, 0, 1);
  static circleCurves: THREE.Vector3[] = [];
  static circleCurvePoints: THREE.Vector3[];

  static temp = {
    circleExtrusion: new CircleExtrusion(),
    circleCurve: new CircleCurve(),
    wireSet: new WireSet(),
    axis: new Axis(),
    rotation: new THREE.Quaternion(),
    vector: new THREE.Vector3(),
  };

  private static readonly _wireSize = 6;
  private static readonly _minSize = 6;
  private static readonly _maxSize = 30;
  private static readonly _axisPartSize = {
    verticesLength: 0,
    indicesLength: 0,
  };

  static newPaths(circleCurve: CircleCurve, size: number) {
    const data: PathData = VceUtils.newPathData();
    this.fetchCircleCurveData(circleCurve, data);
    this.fetchCircleCurveMids(size, data, circleCurve);
    this.fetchCircleCurveEnds(data, circleCurve);
    this.fetchCircleCurveCuts(data);
    return data.cuts;
  }

  static getAxisPartSize(axis: Axis, id: number, vertexSize: number) {
    const part = axis.parts(id)!;
    const order = axis.order(id)!;
    const data = VceUtils.getAxisPartData(part, vertexSize, axis, order);
    VceUtils.fetchAxisPartSize(vertexSize, data);
    return this._axisPartSize;
  }

  static vertexLength(radius: number, factor: number = 200) {
    const count = Math.round(radius * factor);
    const clamped = Math.max(count, VceUtils._minSize);
    return Math.min(clamped, VceUtils._maxSize);
  }

  static setPathVertices(vertexSize: number) {
    const points = this.circleCurvePoints;
    const noPoints = !points;
    const pointsChanged = points && points.length !== vertexSize;
    if (noPoints || pointsChanged) {
      this.circleCurvePoints = [];
      for (let i = 0; i < vertexSize; i++) {
        const halfCircle = 2 * Math.PI;
        const value = halfCircle * i;
        const angle = value / vertexSize;
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);
        const result = new THREE.Vector3(sin, cos, 0);
        this.circleCurvePoints.push(result);
      }
    }
  }

  private static fetchCircleCurveEnds(
    data: PathData,
    circleCurve: CircleCurve,
  ) {
    data.last.copy(data.first);
    data.last.applyAxisAngle(data.axis, circleCurve.aperture());
    data.last.multiplyScalar(circleCurve.radius());
    data.last.add(data.center);
    data.first.multiplyScalar(circleCurve.radius());
    data.first.add(data.center);
  }

  private static getAxisPartData(
    part: AxisPartClass,
    vertexSize: number,
    axis: Axis,
    order: number,
  ) {
    const data = {
      [AxisPartClass.WIRE]: this.getAxisPartWireData,
      [AxisPartClass.WIRE_SET]: this.getAxisPartWireSetData,
      [AxisPartClass.CIRCLE_CURVE]: this.getAxisPartCircleCurveData,
    };
    return data[part as keyof typeof data](axis, order, vertexSize);
  }

  private static newEmptyAxisPartData() {
    return {
      indices: 0,
      points: 0,
      faces: 0,
      links: 0,
    } as AxisPartData;
  }

  private static getAxisPartWireSetData = (
    axis: Axis,
    order: number,
    size: number,
  ) => {
    const defValue = 2;
    const data = this.newEmptyAxisPartData();
    axis.wireSets(order, this.temp.wireSet);
    const wires = this.temp.wireSet.psLength() - 1;
    data.points = wires * defValue * size;
    data.indices = this._wireSize * wires * size;
    data.faces = wires * defValue;
    return data;
  };

  private static fetchCircleCurveMids(
    size: number,
    data: PathData,
    circleCurve: CircleCurve,
  ) {
    const count = size - 2;
    for (let i = 0; i < count; i++) {
      const newMid = new THREE.Vector3();
      newMid.copy(data.first);
      const aperture = circleCurve.aperture();
      const fraction = size - 1;
      const totalAngle = aperture * (i + 1);
      const angle = totalAngle / fraction;
      newMid.applyAxisAngle(data.axis, angle);
      newMid.multiplyScalar(circleCurve.radius());
      newMid.add(data.center);
      data.mids[i] = newMid;
    }
  }

  private static getAxisPartWireData = (
    _axis: Axis,
    _order: number,
    size: number,
  ) => {
    const data = this.newEmptyAxisPartData();
    data.points = 2 * size;
    data.indices = this._wireSize * size;
    data.faces = 2;
    return data;
  };

  static validSize(
    pointsSize: number,
    extraPoints: number,
    vertexSize: number,
  ) {
    const totalSize = pointsSize + extraPoints + vertexSize;
    return limitOf2Bytes >= totalSize;
  }

  private static fetchCircleCurveCuts(data: PathData) {
    data.cuts.push(data.first);
    data.cuts.push(...data.mids);
    data.cuts.push(data.last);
  }

  private static fetchCircleCurveData(
    circleCurve: CircleCurve,
    data: PathData,
  ) {
    const pos = circleCurve.position()!;
    data.center.set(pos.x(), pos.y(), pos.z());
    const xDir = circleCurve.xDirection()!;
    data.axis.set(xDir.x(), xDir.y(), xDir.z());
    const yDir = circleCurve.yDirection()!;
    data.first.set(yDir.x(), yDir.y(), yDir.z());
  }

  private static newPathData() {
    return {
      axis: new THREE.Vector3(),
      cuts: [],
      center: new THREE.Vector3(),
      last: new THREE.Vector3(),
      first: new THREE.Vector3(),
      mids: [],
    } as PathData;
  }

  private static fetchAxisPartSize(vertexSize: number, data: AxisPartData) {
    const indexFactor = vertexSize - 2;
    const coordsCount = 3;
    const indices = data.faces * indexFactor * coordsCount;
    const links = data.links * vertexSize * this._wireSize;
    this._axisPartSize.verticesLength = data.points;
    this._axisPartSize.indicesLength = data.indices + indices + links;
  }

  private static getAxisPartCircleCurveData = (
    axis: Axis,
    order: number,
    size: number,
  ) => {
    const data = this.newEmptyAxisPartData();
    axis.circleCurves(order, this.temp.circleCurve);
    const bends = VceCasterUtils.circleCurve3Divisions(this.temp.circleCurve);
    const pointCount = size * bends;
    data.points = pointCount;
    const indexFactor = size * (bends - 1);
    const indexCount = this._wireSize * indexFactor;
    data.indices = indexCount;
    const defValue = 2;
    data.faces = defValue;
    data.links = defValue;
    return data;
  };
}
