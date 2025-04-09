import * as THREE from "three";
import {
  Axis,
  AxisPartClass,
  CircleCurve,
  CircleExtrusion,
  Wire,
  WireSet,
  FloatVector,
} from "../../../../../Schema";
import { normalizationValue, TileBasicData, TileData } from "../types";
import { LinkPoint } from "./types";
import { VceUtils } from "./vce-utils";
import { VceCasterUtils } from "./vce-caster-utils";
import { ObjectClass } from "../../../model/model-types";

export class VceConstructor {
  private readonly _minLinkDistance = 1 / 100000000;

  private _first = new THREE.Vector3();
  private _last = new THREE.Vector3();
  private _currentPoint!: number;
  private _currentIndex!: number;
  private _v1 = new THREE.Vector3();
  private _v2 = new THREE.Vector3();
  private _v3 = new THREE.Vector3();
  private _v4 = new THREE.Vector3();
  private _tempLine = new THREE.Line3();
  private _total = 0;
  private _closest = 0;
  private _result = 0;

  newTemplate(ce: CircleExtrusion, id: number, templates: TileBasicData[]) {
    const width = ce.radius(id) as number;
    const axis = ce.axes(id, VceUtils.temp.axis) as Axis;
    const vertexAmount = VceUtils.vertexLength(width);
    const lastIndex = templates.length - 1;
    let data = templates[lastIndex];
    const count = axis.orderLength();
    for (let i = 0; i < count; i++) {
      data = this.generateTemplate(axis, i, vertexAmount, data, templates);
    }
  }

  construct(circleExtrusion: CircleExtrusion, meshData: TileData[]) {
    const linkPoint = {} as LinkPoint;
    const data: TileData = undefined as any;
    const position = 0;
    let pointAmount = 0;
    for (let i = 0, l = circleExtrusion.axesLength(); i < l; i++) {
      const width = circleExtrusion.radius(i) as number;
      circleExtrusion.axes(i, VceUtils.temp.axis);
      const transvSize = VceUtils.vertexLength(width);
      pointAmount = this.constructVce(
        transvSize,
        linkPoint,
        data,
        pointAmount,
        position,
        meshData,
        width,
      );
    }
  }

  private getTemplateCreationData(
    data: TileBasicData,
    axisPartDimension: { verticesLength: number; indicesLength: number },
    vertexAmount: number,
  ) {
    const isStart = !data;
    let fits = false;
    if (!isStart) {
      const pointAmount = data.positionCount! / 3;
      const extraPoints = axisPartDimension.verticesLength;
      fits = VceUtils.validSize(pointAmount, extraPoints, vertexAmount);
    }
    return { isStart, fits };
  }

  private generateTemplate(
    axis: Axis,
    id: number,
    vertexAmount: number,
    data: TileBasicData,
    templates: TileBasicData[],
  ) {
    const axisPartDimension = VceUtils.getAxisPartSize(axis, id, vertexAmount);

    const { isStart, fits } = this.getTemplateCreationData(
      data,
      axisPartDimension,
      vertexAmount,
    );

    const needsToGenerateNew = isStart || !fits;
    if (needsToGenerateNew) {
      data = this.newTemplateData();
      templates.push(data);
      this.savePrevious(isStart, id, vertexAmount, data);
    }
    data.positionCount! += axisPartDimension.verticesLength * 3;
    data.normalCount! += axisPartDimension.verticesLength * 3;
    data.indexCount! += axisPartDimension.indicesLength;
    return data;
  }

  private savePrevious(
    isStart: boolean,
    id: number,
    amount: number,
    data: TileBasicData,
  ) {
    const vFactor = 3;
    const vOffset = 2;
    const needsSavePreviousData = !isStart && id !== 0;
    if (needsSavePreviousData) {
      const extraIndices = (amount - vOffset) * vFactor;
      data.positionCount! += amount * vFactor;
      data.normalCount! += amount * vFactor;
      data.indexCount! += extraIndices;
    }
  }

  private constructNewVce(
    data: TileData,
    axisPartSize: { verticesLength: number; indicesLength: number },
    pointAmount: number,
    transvSize: number,
    meshData: TileData[],
    position: number,
    id: number,
  ) {
    const isStart = !data;
    let fits = false;
    if (!isStart) {
      const extraPoints = axisPartSize.verticesLength;
      fits = VceUtils.validSize(pointAmount, extraPoints, transvSize);
    }
    const needsNew = isStart || !fits;

    if (needsNew) {
      data = meshData[position++];
      this.setupNewVceBuffers(data);
      const pastOffset = this._currentPoint;
      pointAmount = this.clearOffset(pointAmount);
      const needsCopyPastData = !isStart && id !== 0;
      if (needsCopyPastData) {
        const pastData = meshData[position - 2];
        this.getClone(pastData, data, pastOffset, transvSize);
        pointAmount += transvSize;
      }
    }
    return { data, pointAmount, position };
  }

  private constructVce(
    transvSize: number,
    linkPoint: LinkPoint,
    data: TileData,
    pointAmount: number,
    position: number,
    meshData: TileData[],
    width: number,
  ) {
    const count = VceUtils.temp.axis.orderLength();
    for (let i = 0; i < count; i++) {
      const axis = VceUtils.temp.axis;
      const axisPartSize = VceUtils.getAxisPartSize(axis, i, transvSize);

      this.setupLink(i, linkPoint);
      ({ data, pointAmount, position } = this.constructNewVce(
        data,
        axisPartSize,
        pointAmount,
        transvSize,
        meshData,
        position,
        i,
      ));

      this.newAxisPart(
        VceUtils.temp.axis,
        i,
        data!,
        width,
        transvSize,
        linkPoint,
      );

      pointAmount += axisPartSize.verticesLength;
    }
    return pointAmount;
  }

  private newTemplateData() {
    return {
      objectClass: ObjectClass.SHELL,
      indexCount: 0,
      positionCount: 0,
      normalCount: 0,
    };
  }

  private setupNewVceBuffers(data: TileData) {
    data.positionBuffer = new Float32Array(data.positionCount!);
    data.normalBuffer = new Int16Array(data.normalCount!);
    data.indexBuffer = new Uint16Array(data.indexCount!);
  }

  private clearOffset(pointAmount: number) {
    this._currentPoint = 0;
    this._currentIndex = 0;
    pointAmount = 0;
    return pointAmount;
  }

  private getClone(inp: TileData, out: TileData, last: number, size: number) {
    const start = size * -3;
    for (let i = start; i < 0; i++) {
      const oPoints = out.positionBuffer!;
      const iPoints = inp.positionBuffer!;
      const oNorm = out.normalBuffer!;
      const iNorm = inp.normalBuffer!;
      oPoints[this._currentPoint] = iPoints![last + i];
      oNorm[this._currentPoint] = iNorm[last + i];
      this._currentPoint++;
    }
  }

  private manageAxisPartCreation(
    axisPartClass: AxisPartClass | null,
    axis: Axis,
    position: number,
    radius: number,
    virtualMesh: TileData,
    vertexSize: number,
    linkPoint: LinkPoint,
  ) {
    if (axisPartClass === AxisPartClass.CIRCLE_CURVE) {
      const current = axis.circleCurves(position)!;
      this.newCircleCurve(current, radius, virtualMesh, vertexSize, linkPoint);
      return;
    }

    if (axisPartClass === AxisPartClass.WIRE_SET) {
      const current = axis.wireSets(position)!;
      this.newWireSet(current, radius, virtualMesh, vertexSize, linkPoint);
      return;
    }

    if (axisPartClass === AxisPartClass.WIRE) {
      const current = axis.wires(position)!;
      this.newWire(current, radius, virtualMesh, vertexSize, linkPoint);
    }
  }

  private newWireSetStart(
    i: number,
    virtualMesh: TileData,
    vertexSize: number,
    linkPoint: LinkPoint,
  ) {
    if (i === 1) {
      this.linkStart(
        virtualMesh,
        vertexSize,
        linkPoint,
        this._first,
        AxisPartClass.WIRE_SET,
      );
    } else {
      this.newPathOrderData(virtualMesh, vertexSize);
    }
  }

  private newWireSet(
    wireSet: WireSet,
    radius: number,
    virtualMesh: TileData,
    vertexSize: number,
    linkPoint: LinkPoint,
  ): void {
    for (let i = 1, length = wireSet.psLength(); i < length; i++) {
      const rot = VceUtils.temp.rotation;
      this.getWireSetPoints(wireSet, i);
      this.setWireSetVector();
      this.newPath(this._first, radius, rot, virtualMesh, vertexSize);
      this.newWireSetStart(i, virtualMesh, vertexSize, linkPoint);
      this.newPath(this._last, radius, rot, virtualMesh, vertexSize);
      this.fillWireSetData(i, length, linkPoint, virtualMesh, vertexSize);
      this.linkPaths(virtualMesh, vertexSize);
    }
  }

  private fillWireSetData(
    i: number,
    length: number,
    linkPoint: LinkPoint,
    virtualMesh: TileData,
    vertexSize: number,
  ) {
    if (i !== length - 1 || linkPoint.last) {
      this.newPathOrderData(virtualMesh, vertexSize, true);
    } else {
      linkPoint.placement = this._last;
      linkPoint.axisClass = AxisPartClass.WIRE_SET;
    }
  }

  private setWireSetVector() {
    VceUtils.temp.vector.copy(this._last);
    VceUtils.temp.vector.sub(this._first);
    VceUtils.temp.vector.normalize();
    VceUtils.temp.rotation.setFromUnitVectors(
      VceUtils.up,
      VceUtils.temp.vector,
    );
  }

  private newCircleCurveBody(
    count: number,
    radius: number,
    virtualMesh: TileData,
    vertexSize: number,
  ) {
    const amount = count - 2;
    for (let i = 0; i < amount; i++) {
      const c1 = VceUtils.circleCurves[i];
      const c2 = VceUtils.circleCurves[i + 1];
      const c3 = VceUtils.circleCurves[i + 2];
      const vec = VceUtils.temp.vector;
      vec.copy(c3);
      vec.sub(c1);
      vec.normalize();
      VceUtils.temp.rotation.setFromUnitVectors(VceUtils.up, vec);
      this.newPath(c2, radius, VceUtils.temp.rotation, virtualMesh, vertexSize);
      this.linkPaths(virtualMesh, vertexSize, true);
    }
  }

  private newCircleCurveFinish(
    count: number,
    radius: number,
    mesh: TileData,
    vertexSize: number,
    linkPoint: LinkPoint,
  ) {
    const pos1 = count - 2;
    const pos2 = count - 1;
    const c1 = VceUtils.circleCurves[pos1];
    const c2 = VceUtils.circleCurves[pos2];
    const vec = VceUtils.temp.vector;
    vec.copy(c2);
    vec.sub(c1);
    vec.normalize();
    VceUtils.temp.rotation.setFromUnitVectors(VceUtils.up, vec);
    this.newPath(c2, radius, VceUtils.temp.rotation, mesh, vertexSize);
    if (linkPoint.last) {
      this.newPathOrderData(mesh, vertexSize, true);
      return;
    }
    linkPoint.placement = VceUtils.circleCurves[pos2];
    linkPoint.axisClass = AxisPartClass.CIRCLE_CURVE;
  }

  private setupLink(id: number, linkPoint: LinkPoint) {
    if (id === 0) {
      linkPoint.first = true;
    }
    const count = VceUtils.temp.axis.orderLength();
    if (id === count - 1) {
      linkPoint.last = true;
    }
  }

  private newCircleCurveStart(
    radius: number,
    virtualMesh: TileData,
    vertexSize: number,
    linkPoint: LinkPoint,
  ) {
    const c1 = VceUtils.circleCurves[0];
    const c2 = VceUtils.circleCurves[1];
    const vec = VceUtils.temp.vector;
    vec.copy(c2);
    vec.sub(c1);
    vec.normalize();
    VceUtils.temp.rotation.setFromUnitVectors(VceUtils.up, vec);
    this.newPath(c1, radius, VceUtils.temp.rotation, virtualMesh, vertexSize);
    const aClass = AxisPartClass.CIRCLE_CURVE;
    this.linkStart(virtualMesh, vertexSize, linkPoint, c1, aClass);
  }

  private getWireSetPoints(wireSet: WireSet, i: number) {
    const p1 = wireSet.ps(i - 1) as FloatVector;
    this._first.set(p1.x(), p1.y(), p1.z());
    const p2 = wireSet.ps(i) as FloatVector;
    this._last.set(p2.x(), p2.y(), p2.z());
  }

  private finishWire(
    radius: number,
    mesh: TileData,
    vertexSize: number,
    linkPoint: LinkPoint,
  ) {
    this.newPath(this._last, radius, VceUtils.temp.rotation, mesh, vertexSize);
    if (linkPoint.last) {
      this.newPathOrderData(mesh, vertexSize, true);
    } else {
      linkPoint.placement = this._last;
      linkPoint.axisClass = AxisPartClass.WIRE;
    }
    this.linkPaths(mesh, vertexSize);
  }

  private linkPaths(
    mesh: TileData,
    vertexSize: number,
    getLinked: boolean = false,
  ): void {
    const s = vertexSize;
    const { p1, p2, p3 } = this.getPathPositions(s, getLinked, mesh);

    const index = mesh.indexBuffer!;
    for (let i = 0; i < s; i++) {
      const i0 = (i + 1) % s;
      const { i3, i4, i1, i2 } = this.getLinkPathIndices(p3, i, p1, s, i0, p2);
      index[this._currentIndex++] = i3;
      index[this._currentIndex++] = i4;
      index[this._currentIndex++] = i1;
      index[this._currentIndex++] = i1;
      index[this._currentIndex++] = i4;
      index[this._currentIndex++] = i2;
    }
  }

  private startWire(
    radius: number,
    mesh: TileData,
    vertexSize: number,
    linkPoint: LinkPoint,
  ) {
    this.newPath(this._first, radius, VceUtils.temp.rotation, mesh, vertexSize);
    const aClass = AxisPartClass.WIRE;
    this.linkStart(mesh, vertexSize, linkPoint, this._first, aClass);
  }

  private setupWireVectors() {
    const vec = VceUtils.temp.vector;
    vec.copy(this._last);
    vec.sub(this._first);
    vec.normalize();
    VceUtils.temp.rotation.setFromUnitVectors(VceUtils.up, vec);
  }

  private getLinkPathIndices(
    p3: number,
    i: number,
    p1: number,
    s: number,
    i0: number,
    p2: number,
  ) {
    let i1 = 0;
    let i2 = 0;
    let i3 = 0;
    let i4 = 0;

    if (p3 + i >= p1) {
      i1 = p3 + i - s;
    } else {
      i1 = p3 + i;
    }

    if (p3 + i0 >= p1) {
      i2 = p3 + i0 - s;
    } else {
      i2 = p3 + i0;
    }

    if (p2 + i >= p1 + s) {
      i3 = p2 + i - s;
    } else {
      i3 = p2 + i;
    }

    if (p2 + i0 >= p1 + s) {
      i4 = p2 + i0 - s;
    } else {
      i4 = p2 + i0;
    }
    return { i3, i4, i1, i2 };
  }

  private fetchWirePoints(wire: Wire) {
    const p1 = wire.p1() as FloatVector;
    const p2 = wire.p2() as FloatVector;
    this._first.set(p1.x(), p1.y(), p1.z());
    this._last.set(p2.x(), p2.y(), p2.z());
  }

  private findLinkedVertex(
    selected: number,
    limit: number,
    mesh: TileData,
    size: number,
    offset: number,
  ) {
    for (let i = selected; i < limit; i++) {
      this.point(i, mesh, this._v1);
      const pos = i - size + offset;
      const p1 = pos >= selected ? pos - size : pos;
      this.point(p1, mesh, this._v2);
      const p2 = pos + 1 >= selected ? pos + 1 - size : pos + 1;
      this.point(p2, mesh, this._v3);
      this._tempLine.set(this._v2, this._v3);
      this._tempLine.closestPointToPoint(this._v1, true, this._v4);
      this._total += this._v4.distanceTo(this._v1);
    }
  }

  private newPath(
    point: THREE.Vector3,
    radius: number,
    rotation: THREE.Quaternion,
    mesh: TileData,
    vertexSize: number,
  ) {
    VceUtils.setPathVertices(vertexSize);
    const pathStep = 3;
    for (let i = 0; i < vertexSize; i++) {
      this.setPathPosition(i, radius, rotation, point, mesh);
      this.setPathNormal(i, rotation, mesh);
      this._currentPoint += pathStep;
    }
  }

  private linkStart(
    mesh: TileData,
    vertexSize: number,
    linkPoint: LinkPoint,
    position: THREE.Vector3,
    partClass: AxisPartClass,
  ): void {
    const isStart = linkPoint.first;
    if (isStart) {
      this.newPathOrderData(mesh, vertexSize);
      return;
    }

    const curveClass = AxisPartClass.CIRCLE_CURVE;
    const isCircle1 = linkPoint.axisClass === curveClass;
    const isCircle2 = partClass === curveClass;
    const compatible = isCircle1 || isCircle2;
    const distance = linkPoint.placement.distanceToSquared(position);
    const isLinked = distance < this._minLinkDistance;
    if (!compatible || !isLinked) {
      this.newPathOrderData(mesh, vertexSize, true, true);
      this.newPathOrderData(mesh, vertexSize);
      return;
    }

    this.linkPaths(mesh, vertexSize, true);
  }

  private setPathPosition(
    id: number,
    radius: number,
    rotation: THREE.Quaternion,
    point: THREE.Vector3,
    mesh: TileData,
  ) {
    const vec = VceUtils.temp.vector;
    vec.copy(VceUtils.circleCurvePoints[id]);
    vec.multiplyScalar(radius);
    vec.applyQuaternion(rotation);
    vec.add(point);

    const pos = mesh.positionBuffer!;
    const location1 = this._currentPoint;
    const location2 = this._currentPoint + 1;
    const location3 = this._currentPoint + 2;

    pos[location1] = vec.x;
    pos[location2] = vec.y;
    pos[location3] = vec.z;
  }

  private newWire(
    wire: Wire,
    radius: number,
    mesh: TileData,
    vertexSize: number,
    linkPoint: LinkPoint,
  ): void {
    this.fetchWirePoints(wire);
    this.setupWireVectors();
    this.startWire(radius, mesh, vertexSize, linkPoint);
    this.finishWire(radius, mesh, vertexSize, linkPoint);
  }

  private newCircleCurve(
    circleCurve: CircleCurve,
    radius: number,
    mesh: TileData,
    vertexSize: number,
    linkPoint: LinkPoint,
  ): void {
    const count = VceCasterUtils.circleCurve3Divisions(circleCurve);
    VceUtils.circleCurves = VceUtils.newPaths(circleCurve, count);
    this.newCircleCurveStart(radius, mesh, vertexSize, linkPoint);
    this.newCircleCurveBody(count, radius, mesh, vertexSize);
    this.newCircleCurveFinish(count, radius, mesh, vertexSize, linkPoint);
    this.linkPaths(mesh, vertexSize, true);
  }

  private newPathOrderData(
    mesh: TileData,
    vertexSize: number,
    reverse: boolean = false,
    past: boolean = false,
  ) {
    const step1 = 1;
    const step2 = 2;
    const count = vertexSize - 2;
    const index = mesh.indexBuffer!;
    for (let i = 0; i < count; i++) {
      const p = this._currentPoint / 3;
      const rawOffset = past ? step2 : step1;
      const offset = vertexSize * rawOffset;
      const indexValue1 = p - offset;
      index[this._currentIndex] = indexValue1;
      this._currentIndex++;
      const offset2 = reverse ? step2 : step1;
      const indexValue2 = p + i + offset2 - offset;
      index[this._currentIndex] = indexValue2;
      this._currentIndex++;
      const offset3 = reverse ? step1 : step2;
      const indexValue3 = p + i + offset3 - offset;
      index[this._currentIndex] = indexValue3;
      this._currentIndex++;
    }
  }

  private getPathPositions(
    vertexSize: number,
    getLinked: boolean,
    mesh: TileData,
  ) {
    const p1 = this._currentPoint / 3 - vertexSize;
    const p2 = p1;
    let p3 = p1 - vertexSize;
    if (getLinked) {
      p3 = this.fetchLinkedVertex(p1, mesh, vertexSize);
    }
    return { p3, p1, p2 };
  }

  private newAxisPart(
    axis: Axis,
    id: number,
    virtualMesh: TileData,
    radius: number,
    vertexSize: number,
    linkPoint: LinkPoint,
  ): void {
    const axisPartClass = axis.parts(id);
    const position = axis.order(id)!;
    this.manageAxisPartCreation(
      axisPartClass,
      axis,
      position,
      radius,
      virtualMesh,
      vertexSize,
      linkPoint,
    );
    linkPoint.first = false;
    linkPoint.last = false;
  }

  private fetchLinkedVertex(selected: number, mesh: TileData, size: number) {
    this._closest = Number.MAX_VALUE;
    for (let i = 0; i < size; i++) {
      this._total = 0;
      const limit = selected + size;
      this.findLinkedVertex(selected, limit, mesh, size, i);
      const closerFound = this._total < this._closest;
      if (!closerFound) continue;
      this._closest = this._total;
      this._result = selected - size + i + 1;
    }
    return this._result;
  }

  private setPathNormal(
    id: number,
    rotation: THREE.Quaternion,
    mesh: TileData,
  ) {
    const vec = VceUtils.temp.vector;
    const currentPoint = VceUtils.circleCurvePoints[id];
    vec.copy(currentPoint);
    vec.applyQuaternion(rotation);
    const nor = mesh.normalBuffer!;

    const location1 = this._currentPoint;
    const location2 = this._currentPoint + 1;
    const location3 = this._currentPoint + 2;

    nor[location1] = vec.x * normalizationValue;
    nor[location2] = vec.y * normalizationValue;
    nor[location3] = vec.z * normalizationValue;
  }

  private point(
    selected: number,
    virtualMesh: TileData,
    result: THREE.Vector3,
  ) {
    const pos = virtualMesh.positionBuffer!;
    const ix = selected * 3;
    const iy = selected * 3 + 1;
    const iz = selected * 3 + 2;
    const x = pos[ix];
    const y = pos[iy];
    const z = pos[iz];
    result.set(x, y, z);
    return result;
  }
}
