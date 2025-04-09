import * as THREE from "three";
import { Axis, CircleExtrusion, Meshes } from "../../../../../Schema";
import { VceUtils } from "./vce-utils";
import { VceCasterUtils } from "./vce-caster-utils";

export class VcePointRaycaster {
  private _meshes: Meshes;
  private _results: any[] = [];
  private _circleExtrusion = new CircleExtrusion();
  private _axis = new Axis();
  private readonly _normal = new THREE.Vector3();
  private readonly _point = new THREE.Vector3();
  private readonly _plane = new THREE.Plane();

  constructor(meshes: Meshes) {
    this._meshes = meshes;
  }

  pointRaycast(id: number, ray: THREE.Ray) {
    this._results.length = 0;
    this._meshes.circleExtrusions(id, this._circleExtrusion);
    this.traverseAllCircleExtrusions(ray);
    return this.getCleanResults();
  }

  private fetchOrientation(p1: THREE.Vector3, p2: THREE.Vector3) {
    VceUtils.temp.vector.copy(p1);
    VceUtils.temp.vector.sub(p2);
    VceUtils.temp.vector.normalize();
    const rot = VceUtils.temp.rotation;
    rot.setFromUnitVectors(VceUtils.up, VceUtils.temp.vector);
  }

  private getTraverseWiresEvent(ray: THREE.Ray, radius: number) {
    return (first: THREE.Vector3, last: THREE.Vector3) => {
      this.fetchOrientation(first, last);
      const result1 = this.raycastCutCircleExtrusion(first, ray, radius);
      const result2 = this.raycastCutCircleExtrusion(last, ray, radius);
      this._results.push(result1, result2);
    };
  }

  private traverseAllCircleExtrusions(ray: THREE.Ray) {
    const count = this._circleExtrusion.axesLength();
    for (let i = 0; i < count; i++) {
      this._circleExtrusion.axes(i, this._axis);
      const radius = this._circleExtrusion.radius(i)!;
      const count = VceUtils.vertexLength(radius);
      VceUtils.setPathVertices(count);
      this.traverseAllCurves(ray, radius);
    }
  }

  private setupCuttedCircleExtrusion(origin: THREE.Vector3) {
    this._normal.set(0, 0, 1);
    this._normal.applyQuaternion(VceUtils.temp.rotation);
    this._plane.setFromNormalAndCoplanarPoint(this._normal, origin);
  }

  private getTraverseCircleCurveEvent(ray: THREE.Ray, radius: number) {
    return (
      first: THREE.Vector3,
      mids: THREE.Vector3[],
      last: THREE.Vector3,
    ) => {
      this.fetchOrientation(first, mids[0]);
      const result1 = this.raycastCutCircleExtrusion(first, ray, radius);
      const nextToLast = mids[mids.length - 1];
      this.fetchOrientation(nextToLast, last);
      const result2 = this.raycastCutCircleExtrusion(last, ray, radius);
      this._results.push(result1, result2);
    };
  }

  private computeCutCircleExtrCast(
    origin: THREE.Vector3,
    radius: number,
    ray: THREE.Ray,
  ) {
    ray.intersectPlane(this._plane, this._point);
    const distance = this._point.distanceTo(origin);
    if (distance <= radius) {
      const point = origin.clone();
      return { point };
    }
    return undefined;
  }

  private raycastCutCircleExtrusion(
    origin: THREE.Vector3,
    ray: THREE.Ray,
    radius: number,
  ) {
    this.setupCuttedCircleExtrusion(origin);
    const collides = ray.intersectsPlane(this._plane);
    if (collides) {
      return this.computeCutCircleExtrCast(origin, radius, ray);
    }
    return undefined;
  }

  private getCleanResults() {
    const filtered: any[] = [];
    for (const result of this._results) {
      if (result) {
        filtered.push(result);
      }
    }
    return filtered;
  }

  private traverseAllCurves(ray: THREE.Ray, radius: number) {
    const wiresEvent = this.getTraverseWiresEvent(ray, radius);
    VceCasterUtils.traverseWires(this._axis, wiresEvent);
    const circleEvent = this.getTraverseCircleCurveEvent(ray, radius);
    const divider = VceCasterUtils.circleCurve3Divisions;
    VceCasterUtils.traverseCircleCurve(this._axis, circleEvent, divider);
    const wireSetsEvent = this.getTraverseWiresEvent(ray, radius);
    VceCasterUtils.traverseWireSets(this._axis, wireSetsEvent);
  }
}
