import * as THREE from "three";
import {
  AxisPartClass,
  Axis,
  CircleExtrusion,
  FloatVector,
} from "../../../../../Schema";
import {
  CurrentLod,
  DataBuffer,
  ObjectClass,
} from "../../../model/model-types";
import { TileBasicData, TileData } from "../types";
import { VceCasterUtils } from "./vce-caster-utils";
import { VceUtils } from "./vce-utils";

export class VceLodConstructor {
  private _currentElement = 0;
  private readonly _wireSize = 6;

  construct(circleExtrusion: CircleExtrusion, mesh: TileData) {
    this._currentElement = 0;
    mesh.positionBuffer = new Float32Array(mesh.positionCount!);
    for (let i = 0, l = circleExtrusion.axesLength(); i < l; i++) {
      circleExtrusion.axes(i, VceUtils.temp.axis);
      this.constructLod(mesh);
    }
    return mesh;
  }

  private constructCircleExtrusionLod(id: number, mesh: TileData) {
    const axis = VceUtils.temp.axis;
    const type = axis.parts(id) as AxisPartClass;
    const index = axis.order(id)!;
    const lodConstructor = this.getLodConstructor(type);
    lodConstructor(axis, index, mesh);
  }

  private newCircleCurveLod = (axis: Axis, index: number, mesh: TileData) => {
    const count = this.newCircleCurveLodPath(axis, index);
    const points = mesh.positionBuffer!;
    for (let i = 1; i < count; i++) {
      const first = VceUtils.circleCurves[i - 1];
      const last = VceUtils.circleCurves[i];
      this.newWire(points, first, last);
    }
  };

  private newWireSetLod = (axis: Axis, index: number, mesh: TileData) => {
    const wireSetSegment = axis.wireSets(index)!;
    const count = wireSetSegment.psLength();
    const points = mesh.positionBuffer!;
    for (let i = 1; i < count; i++) {
      const first = wireSetSegment.ps(i - 1)!;
      const last = wireSetSegment.ps(i)!;
      this.newWire(points, first, last);
    }
  };

  private newWireTemplate = (_index: number, template: TileBasicData) => {
    template.positionCount! += this._wireSize;
  };

  private newCircleCurveLodPath(axis: Axis, index: number) {
    const curve = axis.circleCurves(index)!;
    const count = VceCasterUtils.circleCurve3Divisions(curve);
    VceUtils.circleCurves = VceUtils.newPaths(curve, count);
    return count;
  }

  private selectNextWire() {
    this._currentElement += this._wireSize;
  }

  private getAxisPartVertexSize(id: number, template: TileBasicData): void {
    const axis = VceUtils.temp.axis;
    const partClass = axis.parts(id) as AxisPartClass;
    const order = axis.order(id)!;
    const templateConstructor = this.getTemplateConstructor(partClass);
    templateConstructor(order, template);
  }

  private getIndices() {
    const i1 = this._currentElement;
    const i2 = this._currentElement + 1;
    const i3 = this._currentElement + 2;
    const i4 = this._currentElement + 3;
    const i5 = this._currentElement + 4;
    const i6 = this._currentElement + 5;
    return { i1, i2, i3, i4, i5, i6 };
  }

  private setAxisTemplate(id: number, template: TileBasicData) {
    VceUtils.temp.circleExtrusion.axes(id, VceUtils.temp.axis);
    const count = VceUtils.temp.axis.partsLength();
    for (let id = 0; id < count; id++) {
      this.getAxisPartVertexSize(id, template);
    }
    this.setAxisThickness(template, id);
  }

  private constructLod(mesh: TileData) {
    const count = VceUtils.temp.axis.orderLength();
    for (let id = 0; id < count; id++) {
      this.constructCircleExtrusionLod(id, mesh);
    }
  }

  private getLodConstructor(type: AxisPartClass) {
    const constructors = {
      [AxisPartClass.WIRE]: this.newWireLod,
      [AxisPartClass.WIRE_SET]: this.newWireSetLod,
      [AxisPartClass.CIRCLE_CURVE]: this.newCircleCurveLod,
    };
    return constructors[type as keyof typeof constructors];
  }

  private newWireSetTemplate = (index: number, template: TileBasicData) => {
    const axis = VceUtils.temp.axis;
    const wireSet = axis.wireSets(index, VceUtils.temp.wireSet)!;
    const wires = wireSet.psLength() - 1;
    template.positionCount! += this._wireSize * wires;
  };

  newTemplate() {
    const circularExtrusion = VceUtils.temp.circleExtrusion;
    const template = this.newTemplateData();
    const count = circularExtrusion.axesLength();
    for (let id = 0; id < count; id++) {
      this.setAxisTemplate(id, template);
    }
    return template;
  }

  private setAxisThickness(template: TileBasicData, id: number) {
    const l1 = template.lodThickness!;
    const l2 = VceUtils.temp.circleExtrusion.radius(id)!;
    template.lodThickness = Math.max(l1, l2);
  }

  private newTemplateData() {
    return {
      objectClass: ObjectClass.LINE,
      lod: CurrentLod.WIRES,
      lodThickness: 0,
      positionCount: 0,
    } as TileBasicData;
  }

  private newWireLod = (axis: Axis, index: number, mesh: TileData) => {
    const wire = axis.wires(index)!;
    const first = wire.p1()!;
    const last = wire.p2()!;
    const points = mesh.positionBuffer!;
    this.newWire(points, first, last);
  };

  private getTemplateConstructor(type: AxisPartClass) {
    const constructors = {
      [AxisPartClass.WIRE]: this.newWireTemplate,
      [AxisPartClass.WIRE_SET]: this.newWireSetTemplate,
      [AxisPartClass.CIRCLE_CURVE]: this.newCircleCurveTemplate,
    };
    return constructors[type as keyof typeof constructors];
  }

  private newWire(
    points: DataBuffer,
    first: FloatVector | THREE.Vector3,
    last: FloatVector | THREE.Vector3,
  ) {
    const x1 = first instanceof THREE.Vector3 ? first.x : first.x();
    const y1 = first instanceof THREE.Vector3 ? first.y : first.y();
    const z1 = first instanceof THREE.Vector3 ? first.z : first.z();

    const x2 = last instanceof THREE.Vector3 ? last.x : last.x();
    const y2 = last instanceof THREE.Vector3 ? last.y : last.y();
    const z2 = last instanceof THREE.Vector3 ? last.z : last.z();

    const { i1, i2, i3, i4, i5, i6 } = this.getIndices();

    points[i1] = x1;
    points[i2] = y1;
    points[i3] = z1;
    points[i4] = x2;
    points[i5] = y2;
    points[i6] = z2;

    this.selectNextWire();
  }

  private newCircleCurveTemplate = (index: number, template: TileBasicData) => {
    const axis = VceUtils.temp.axis;
    const circleCurve = axis.circleCurves(index, VceUtils.temp.circleCurve)!;
    const count = VceCasterUtils.circleCurve3Divisions(circleCurve);
    template.positionCount! += this._wireSize * (count - 1);
  };
}
