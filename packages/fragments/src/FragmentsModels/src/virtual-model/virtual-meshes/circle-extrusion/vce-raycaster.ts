import * as THREE from "three";
import { Axis, CircleExtrusion, Meshes } from "../../../../../Schema";
import { VceCasterUtils } from "./vce-caster-utils";

export class VceRaycaster {
  private _meshes: Meshes;
  private _results: any[] = [];
  private _circleExtrusion = new CircleExtrusion();
  private _axis = new Axis();

  constructor(meshes: Meshes) {
    this._meshes = meshes;
  }

  raycast(id: number, ray: THREE.Ray) {
    this._results.length = 0;
    this._meshes.circleExtrusions(id, this._circleExtrusion);
    for (let i = 0, l = this._circleExtrusion.axesLength(); i < l; i++) {
      this._circleExtrusion.axes(i, this._axis);
      const radius = this._circleExtrusion.radius(i)!;
      this.traverseAllCurves(ray, radius);
    }
    return this._results;
  }

  private getTraverseWiresEvent(ray: THREE.Ray, radius: number) {
    return (start: THREE.Vector3, end: THREE.Vector3) => {
      this.castCurveExtrusion(start, end, ray, radius);
    };
  }

  private castCurveExtrusion(
    a: THREE.Vector3,
    b: THREE.Vector3,
    ray: THREE.Ray,
    radius: number,
  ) {
    const u = VceCasterUtils;
    const result1 = u.raycastCircleExtr(a, b, ray, radius);
    for (const result of result1) {
      this._results.push(result);
    }
  }

  private getTraverseCircleCurveEvent(ray: THREE.Ray, radius: number) {
    return (
      first: THREE.Vector3,
      mids: THREE.Vector3[],
      last: THREE.Vector3,
    ) => {
      const second = mids[0];
      this.castCurveExtrusion(first, second, ray, radius);
      for (let i = 0; i < mids.length; i++) {
        if (i === 0) continue;
        const first = mids[i - 1];
        const second = mids[i];
        this.castCurveExtrusion(first, second, ray, radius);
      }
      const nextToLast = mids[mids.length - 1];
      this.castCurveExtrusion(nextToLast, last, ray, radius);
    };
  }

  private traverseAllCurves(ray: THREE.Ray, radius: number) {
    const wireEvent = this.getTraverseWiresEvent(ray, radius);
    VceCasterUtils.traverseWires(this._axis, wireEvent);
    const circleCurveEvent = this.getTraverseCircleCurveEvent(ray, radius);
    const divider = VceCasterUtils.circleCurve3Divisions;
    VceCasterUtils.traverseCircleCurve(this._axis, circleCurveEvent, divider);
    const wireSetEvent = this.getTraverseWiresEvent(ray, radius);
    VceCasterUtils.traverseWireSets(this._axis, wireSetEvent);
  }
}
