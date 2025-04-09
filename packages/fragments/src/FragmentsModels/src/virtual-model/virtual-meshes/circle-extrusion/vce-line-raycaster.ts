import * as THREE from "three";
import { Axis, CircleExtrusion, Meshes } from "../../../../../Schema";
import { VceCasterUtils } from "./vce-caster-utils";

export class VceLineRaycaster {
  private _meshes: Meshes;
  private _found = [] as any[];
  private _circleExtrusion = new CircleExtrusion();
  private _axis = new Axis();
  private _wirePoint = new THREE.Vector3();

  constructor(meshes: Meshes) {
    this._meshes = meshes;
  }

  lineRaycast(id: number, ray: THREE.Ray) {
    this._found.length = 0;
    this._meshes.circleExtrusions(id, this._circleExtrusion);
    const count = this._circleExtrusion.axesLength();
    for (let index = 0; index < count; index++) {
      this._circleExtrusion.axes(index, this._axis);
      this.processLineRaycast(index, ray);
    }
    return this._found;
  }

  private wireSetRaycast(ray: THREE.Ray, radius?: number) {
    const axis = this._axis;
    VceCasterUtils.traverseWireSets(
      axis,
      (start: THREE.Vector3, end: THREE.Vector3) => {
        this.cylinderRaycast(start, end, ray, radius as any);
      },
    );
  }

  private exclusiveCylinderRaycast(ray: THREE.Ray, radius: number) {
    const axis = this._axis;
    const event = this.getCylinderRaycastEvent(ray, radius);
    VceCasterUtils.traverseWires(axis, event);
  }

  private processLineRaycast(id: number, ray: THREE.Ray) {
    const width = this._circleExtrusion.radius(id) as number;
    this.exclusiveCylinderRaycast(ray, width);
    this.circleCurveRaycast(ray, width);
    this.wireSetRaycast(ray, width);
  }

  private getCylinderRaycastEvent(ray: THREE.Ray, radius: number) {
    return (start: THREE.Vector3, end: THREE.Vector3) => {
      this.cylinderRaycast(start, end, ray, radius);
    };
  }

  private processCircleCurveBody(
    body: THREE.Vector3[],
    ray: THREE.Ray,
    radius: number,
  ) {
    for (let i = 0; i < body.length; i++) {
      if (i === 0) continue;
      const mid = body[i];
      const past = body[i - 1];
      this.cylinderRaycast(past, mid, ray, radius);
    }
  }

  private getCircleCurveRaycastEvent(ray: THREE.Ray, radius: number) {
    return (
      first: THREE.Vector3,
      body: THREE.Vector3[],
      last: THREE.Vector3,
    ) => {
      this.cylinderRaycast(first, body[0], ray, radius);
      this.processCircleCurveBody(body, ray, radius);
      const nextToLast = body[body.length - 1];
      this.cylinderRaycast(nextToLast, last, ray, radius);
    };
  }

  private fetchCylinderRaycastResult(
    ray: THREE.Ray,
    first: THREE.Vector3,
    last: THREE.Vector3,
  ) {
    ray.distanceSqToSegment(first, last, undefined, this._wirePoint);
    const resultData = this.newResult(first, last);
    this._found.push(resultData);
  }

  private circleCurveRaycast(ray: THREE.Ray, radius: number) {
    const divisionLogic = VceCasterUtils.circleCurve3Divisions;
    const event = this.getCircleCurveRaycastEvent(ray, radius);
    VceCasterUtils.traverseCircleCurve(this._axis, event, divisionLogic);
  }

  private newResult(first: THREE.Vector3, last: THREE.Vector3) {
    return {
      point: this._wirePoint.clone(),
      raySquaredDistance: undefined,
      snappedEdgeP1: first.clone(),
      snappedEdgeP2: last.clone(),
    };
  }

  private cylinderRaycast(
    first: THREE.Vector3,
    last: THREE.Vector3,
    ray: THREE.Ray,
    radius: number,
  ) {
    const u = VceCasterUtils;
    const results = u.raycastCircleExtr(first, last, ray, radius);
    for (const result of results) {
      if (!result.point) continue;
      this.fetchCylinderRaycastResult(ray, first, last);
    }
  }
}
