import * as THREE from "three";
import {
  CircleCurve,
  Axis,
  Wire,
  WireSet,
  FloatVector,
} from "../../../../../Schema";

export class VceCasterUtils {
  private static readonly _floats = new FloatVector();
  private static readonly _wire = new Wire();
  private static readonly _wireSet = new WireSet();
  private static readonly _circleCurve = new CircleCurve();

  private static readonly _wireP1 = new THREE.Vector3();
  private static readonly _wireP2 = new THREE.Vector3();
  private static readonly _circleP1 = new THREE.Vector3();
  private static readonly _circleP2 = new THREE.Vector3();
  private static readonly _circleOrigin = new THREE.Vector3();
  private static readonly _circleOrientation = new THREE.Vector3();
  private static readonly _currentWireSetPoint = new THREE.Vector3();
  private static readonly _nextWireSetPoint = new THREE.Vector3();
  // ce: circle extrusion
  private static readonly _ceAxisZ = new THREE.Vector3();
  private static readonly _ceAxisY = new THREE.Vector3();
  private static readonly _ceAxisX = new THREE.Vector3();
  private static readonly _ceRaycastPoint = new THREE.Vector3();

  private static readonly _ceSize = new THREE.Vector3();
  private static readonly _ceAbsoluteX = new THREE.Vector3(0, 0, 1);
  private static readonly _ceAbsoluteZ = new THREE.Vector3(1, 0, 0);

  private static readonly _circlePoints: THREE.Vector3[] = [];

  private static readonly _ceTransform = new THREE.Matrix4();
  private static readonly _ceInverseTransform = new THREE.Matrix4();
  private static readonly _ceRay = new THREE.Ray();

  private static _ceRaycastPoints: any[] = [];

  static circleCurve3Divisions(input: CircleCurve) {
    const factor = 4;
    const min = 4;
    const max = 32;
    const aperture = input.aperture();
    const radius = input.radius();
    const rawResult = aperture * radius * factor;
    const divisions = Math.round(rawResult);
    return Math.min(Math.max(divisions, min), max);
  }

  static traverseCircleCurve(
    axis: Axis,
    callback: (
      first: THREE.Vector3,
      middle: THREE.Vector3[],
      last: THREE.Vector3,
    ) => void,
    getDivisions: (circleCurve: CircleCurve) => number,
  ) {
    const count = axis.circleCurvesLength();
    const startAndEnd = 2;
    for (let i = 0; i < count; i++) {
      this.getAllCircleCurveData(axis, i);
      const divisions = getDivisions(this._circleCurve);
      this._circlePoints.length = divisions - startAndEnd;
      this.getCircleCurveMids(divisions);
      this.getNewCircleCurveData();
      callback(this._circleP1, this._circlePoints, this._circleP2);
    }
  }

  static traverseWireSets(
    axis: Axis,
    callback: (current: THREE.Vector3, next: THREE.Vector3) => void,
  ) {
    const wireSetCount = axis.wireSetsLength();
    for (let i = 0; i < wireSetCount; i++) {
      axis.wireSets(i, this._wireSet);
      this.traverseWireSetWires(callback);
    }
  }

  static raycastCircleExtr(
    first: THREE.Vector3,
    last: THREE.Vector3,
    ray: THREE.Ray,
    radius: number,
  ) {
    const distance = last.distanceTo(first);
    this.setupCircleExtrusionAxes(last, first);
    this.setupCircleExtrusionTransform(first, radius);
    this.setupCircleExtrusionRay(ray);
    return this.computeCircleExtrusionRaycast(distance, radius);
  }

  static traverseWires(
    axis: Axis,
    callback: (p1: THREE.Vector3, p2: THREE.Vector3) => void,
  ) {
    const wiresCount = axis.wiresLength();
    for (let i = 0; i < wiresCount; i++) {
      axis.wires(i, this._wire);
      this.setWire();
      callback(this._wireP1, this._wireP2);
    }
  }

  private static getNewCircleCurveData() {
    this._circleP2.copy(this._circleP1);
    const aperture = this._circleCurve.aperture();
    const radius = this._circleCurve.radius();
    this._circleP2.applyAxisAngle(this._circleOrientation, aperture);
    this._circleP2.multiplyScalar(radius);
    this._circleP2.add(this._circleOrigin);
    this._circleP1.multiplyScalar(radius);
    this._circleP1.add(this._circleOrigin);
  }

  private static setWire() {
    this.setWirePoint("p1", this._wireP1);
    this.setWirePoint("p2", this._wireP2);
  }

  private static getCircleCurveMids(divisions: number) {
    const count = this._circlePoints.length;
    for (let i = 0; i < count; i++) {
      this._circlePoints[i] = this.newCirclePoint(i, divisions);
    }
  }

  private static newCirclePoint(i: number, divisions: number) {
    const divisionCount = divisions - 1;
    const currentSegment = i + 1;
    const point = new THREE.Vector3();
    point.copy(this._circleP1);
    const radius = this._circleCurve.radius();
    const aperture = this._circleCurve.aperture();
    const progress = aperture * currentSegment;
    const angle = progress / divisionCount;
    point.applyAxisAngle(this._circleOrientation, angle);
    point.multiplyScalar(radius);
    point.add(this._circleOrigin);
    return point;
  }

  private static getAllCircleCurveData(axis: Axis, i: number) {
    axis.circleCurves(i, this._circleCurve);
    this.getCircleCurveData(this._circleOrigin, "position");
    this.getCircleCurveData(this._circleOrientation, "xDirection");
    this.getCircleCurveData(this._circleP1, "yDirection");
  }

  private static setWirePoint(point: "p1" | "p2", vector: THREE.Vector3) {
    this._wire[point](this._floats);
    const x = this._floats.x();
    const y = this._floats.y();
    const z = this._floats.z();
    vector.set(x, y, z);
  }

  private static getCircleCurveData(
    vector: THREE.Vector3,
    key: "position" | "xDirection" | "yDirection",
  ) {
    const data = this._circleCurve[key]() as FloatVector;
    this.getVectorData(data, vector);
  }

  private static getVectorData(data: FloatVector, vector: THREE.Vector3) {
    const x = data.x();
    const y = data.y();
    const z = data.z();
    vector.set(x, y, z);
  }

  private static traverseWireSetWires(
    callback: (current: THREE.Vector3, next: THREE.Vector3) => void,
  ) {
    const pointsCount = this._wireSet.psLength();
    const wiresCount = pointsCount - 1;
    for (let i = 0; i < wiresCount; i++) {
      this.getWiresetPoint(this._currentWireSetPoint, i);
      this.getWiresetPoint(this._nextWireSetPoint, i + 1);
      callback(this._currentWireSetPoint, this._nextWireSetPoint);
    }
  }

  private static getWiresetPoint(point: THREE.Vector3, index: number) {
    const pointData = this._wireSet.ps(index) as FloatVector;
    this.getVectorData(pointData, point);
  }

  private static setupCircleExtrusionTransform(
    first: THREE.Vector3,
    radius: number,
  ) {
    this._ceTransform.identity();
    this._ceTransform.makeBasis(this._ceAxisX, this._ceAxisY, this._ceAxisZ);
    this._ceTransform.setPosition(first);
    this._ceSize.set(radius, radius, radius);
    this._ceTransform.scale(this._ceSize);
  }

  private static computeCircleExtrusionRaycastFactors() {
    const c1 = 2;
    const c2 = 4;
    const d = this._ceRay.direction;
    const o = this._ceRay.origin;
    const x = d.x * d.x + d.y * d.y;
    const y = c1 * o.x * d.x + c1 * o.y * d.y;
    const z = o.x * o.x + o.y * o.y - 1;
    const v1 = c2 * x * z;
    const v2 = y * y;
    const nothingFound = v1 > v2;
    if (nothingFound) {
      return null;
    }
    const v3 = c1 * x;
    const v4 = Math.sqrt(v2 - v1);
    const factorA = (-y + v4) / v3;
    const factorB = (-y - v4) / v3;
    return { factorA, factorB };
  }

  private static computeCircleExtrusionRaycast(
    distance: number,
    radius: number,
  ) {
    const result = this.computeCircleExtrusionRaycastFactors();
    if (result === null) {
      return [];
    }
    const { factorA, factorB } = result;
    this._ceInverseTransform.transpose();
    this._ceRaycastPoints = [];
    this.computeCircleExtrusionRaycastPoints(factorA, distance, radius);
    this.computeCircleExtrusionRaycastPoints(factorB, distance, radius);
    return this._ceRaycastPoints;
  }

  private static setupCircleExtrusionRay(ray: THREE.Ray) {
    this._ceInverseTransform.copy(this._ceTransform);
    this._ceInverseTransform.invert();
    this._ceRay.copy(ray);
    this._ceRay.applyMatrix4(this._ceInverseTransform);
  }

  private static computeCircleExtrusionRaycastPoints(
    factor: number,
    size: number,
    radius: number,
  ) {
    const clashes = this.checkIfCircleExtrusionClashes(factor, size, radius);
    if (!clashes) return;
    this._ceRaycastPoint.applyMatrix4(this._ceTransform);
    const point = this._ceRaycastPoint.clone();
    this._ceRaycastPoints.push({ point });
  }

  private static setupCircleExtrusionAxes(
    last: THREE.Vector3,
    first: THREE.Vector3,
  ) {
    this._ceAxisZ.copy(last);
    this._ceAxisZ.sub(first);
    this._ceAxisZ.normalize();
    this.computeNormal(this._ceAxisZ, this._ceAxisX);
    this._ceAxisY.crossVectors(this._ceAxisZ, this._ceAxisX);
  }

  private static computeNormal(source: THREE.Vector3, target: THREE.Vector3) {
    const threshold = 0.9;
    const dot = source.dot(this._ceAbsoluteX);
    const absDot = Math.abs(dot);
    const isLookingAtX = absDot > threshold;
    const v = isLookingAtX ? this._ceAbsoluteZ : this._ceAbsoluteX;
    target.crossVectors(source, v);
    target.normalize();
  }

  private static setupCircleExtrusionRaycastPoint(factor: number) {
    this._ceRaycastPoint.copy(this._ceRay.direction);
    this._ceRaycastPoint.normalize();
    this._ceRaycastPoint.multiplyScalar(factor);
    this._ceRaycastPoint.add(this._ceRay.origin);
  }

  private static checkIfCircleExtrusionClashes(
    factor: number,
    size: number,
    radius: number,
  ) {
    this.setupCircleExtrusionRaycastPoint(factor);
    const rel = size / radius;
    const z = this._ceRaycastPoint.z;
    const clashes = z >= 0 && z <= rel;
    return clashes;
  }
}
