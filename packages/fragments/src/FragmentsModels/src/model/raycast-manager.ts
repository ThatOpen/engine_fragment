import * as THREE from "three";
import {
  MultiThreadingRequestClass,
  RaycastData,
  RaycastResult,
  RectangleRaycastData,
  RectangleRaycastResult,
  SnappingRaycastData,
} from "./model-types";
import { FragmentsModel } from "./fragments-model";
import { MeshManager } from "./mesh-manager";
import { CameraUtils } from "../utils";

interface Point {
  x: number;
  y: number;
}

export class RaycastManager {
  private _caster = new THREE.Raycaster();
  private readonly _ray = new THREE.Ray();
  private readonly _frustum = new THREE.Frustum();
  private readonly _inverseTransform = new THREE.Matrix4();

  private readonly _t = new THREE.Plane();
  private readonly _r = new THREE.Plane();
  private readonly _b = new THREE.Plane();
  private readonly _l = new THREE.Plane();
  private readonly _n = new THREE.Plane();
  private readonly _f = new THREE.Plane();

  private readonly _tl = new THREE.Vector3();
  private readonly _tr = new THREE.Vector3();
  private readonly _bl = new THREE.Vector3();
  private readonly _br = new THREE.Vector3();
  private readonly _tln = new THREE.Vector3();
  private readonly _brn = new THREE.Vector3();
  private readonly _tlp = new THREE.Vector2();
  private readonly _brp = new THREE.Vector2();

  private readonly distance = 10;

  async raycast(model: FragmentsModel, data: RaycastData) {
    const { frustum, ray } = this.getRayAndFrustum(data);
    const request = this.getRequest(model, frustum, ray);
    if (!request) return null;
    const response = await model.threads.fetch(request);
    if (response.results && response.results.length) {
      const [firstHit] = response.results;
      return this.getResult({
        hit: firstHit,
        frustum,
        ray,
        model,
      });
    }
    return null;
  }

  async rectangleRaycast(
    model: FragmentsModel,
    meshes: MeshManager,
    data: RectangleRaycastData,
  ) {
    const frustum = this.getFrustum(data);
    const request = this.getRequest(model, frustum);
    if (!request) return null;
    request.fullyIncluded = data.fullyIncluded;
    const response = await model.threads.fetch(request);
    if (response.localIds && response.localIds.length) {
      return this.newRectangleCastResponse(response, meshes);
    }
    return null;
  }

  async raycastWithSnapping(model: FragmentsModel, data: SnappingRaycastData) {
    const { frustum, ray } = this.getRayAndFrustum(data);
    const request = this.getRequest(model, frustum, ray);
    if (!request) return null;
    request.snappingClass = data.snappingClasses;
    const response = await model.threads.fetch(request);
    if (response.results) {
      return this.newRaycastSnapResult(response, frustum, ray, model);
    }
    return null;
  }

  private screenRectToFrustum(
    screenTopLeft: THREE.Vector2,
    screenBottomRight: THREE.Vector2,
    container: HTMLElement,
    camera: THREE.Camera,
  ) {
    this.screenToCast(screenTopLeft, container, this._tlp);
    this.screenToCast(screenBottomRight, container, this._brp);
    this.setVectors(camera);
    this.setPlanes(camera);
    return this.newFrustum();
  }

  private screenToCasterPoint(point: Point, viewer: any, camera: THREE.Camera) {
    const casterPoint = this.screenToCast(point, viewer);
    this._caster.setFromCamera(casterPoint, camera);
    return this._caster.ray.clone();
  }

  private setPlanes(camera: THREE.Camera) {
    this.setBasePoints();
    camera.getWorldDirection(this._n.normal);
    this.setEnds(camera);
  }

  private setVectors(camera: THREE.Camera) {
    this.setVector(this._tl, this._tlp, this._tlp, 1, camera);
    this.setVector(this._tr, this._brp, this._tlp, 1, camera);
    this.setVector(this._bl, this._tlp, this._brp, 1, camera);
    this.setVector(this._br, this._brp, this._brp, 1, camera);
    this.setVector(this._tln, this._tlp, this._tlp, 0, camera);
    this.setVector(this._brn, this._brp, this._brp, 0, camera);
  }

  private newFrustum() {
    return new THREE.Frustum(
      this._t,
      this._b,
      this._l,
      this._r,
      this._f,
      this._n,
    );
  }

  private setEnds(camera: THREE.Camera) {
    this._n.constant = camera.position.length();
    this._f.normal = this._n.normal;
    this._f.constant = Infinity;
  }

  private screenToCast(p: Point, element: any, result = new THREE.Vector2()) {
    // src: https://stackoverflow.com/a/69971471
    const rect = element.getBoundingClientRect();
    result.x = ((p.x - rect.left) / element.clientWidth) * 2 - 1;
    result.y = -((p.y - rect.top) / element.clientHeight) * 2 + 1;
    return result;
  }

  private setVector(
    v1: THREE.Vector3,
    v2: THREE.Vector2,
    v3: THREE.Vector2,
    value: number,
    camera: THREE.Camera,
  ) {
    v1.set(v2.x, v3.y, value);
    v1.unproject(camera);
  }

  private setPlane(
    plane: THREE.Plane,
    v1: THREE.Vector3,
    v2: THREE.Vector3,
    v3: THREE.Vector3,
  ) {
    plane.setFromCoplanarPoints(v1, v2, v3);
  }

  private setBasePoints() {
    this.setPlane(this._t, this._tln, this._tl, this._tr);
    this.setPlane(this._r, this._brn, this._tr, this._br);
    this.setPlane(this._b, this._brn, this._br, this._bl);
    this.setPlane(this._l, this._tln, this._bl, this._tl);
  }

  private setupRay(ray: THREE.Ray | undefined, message: any) {
    if (ray) {
      this._ray.copy(ray);
      this._ray.applyMatrix4(this._inverseTransform);
      (message as any).ray = this._ray;
    }
  }

  private setupMatrix(object: THREE.Object3D) {
    this._inverseTransform.copy(object.matrixWorld);
    this._inverseTransform.invert();
  }

  private getRequest(
    model: FragmentsModel,
    frustum: THREE.Frustum,
    ray?: THREE.Ray,
  ) {
    const { object, box, modelId } = model;
    const collidesModel = frustum.intersectsBox(box);
    if (collidesModel) {
      return this.newCastRequest(object, modelId, ray, frustum);
    }
    return null;
  }

  private getRayAndFrustum(data: RaycastData) {
    this.updateCamera(data.camera);
    const { bottomLeft, topRight } = this.getCorners(data.mouse);
    const ray = this.screenToCasterPoint(data.mouse, data.dom, data.camera);
    const frustum = this.screenRectToFrustum(
      bottomLeft,
      topRight,
      data.dom,
      data.camera,
    );
    return { ray, frustum };
  }

  private getFrustum(data: {
    camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
    dom: HTMLCanvasElement;
    topLeft: THREE.Vector2;
    bottomRight: THREE.Vector2;
  }) {
    this.updateCamera(data.camera);
    return this.screenRectToFrustum(
      data.topLeft,
      data.bottomRight,
      data.dom,
      data.camera,
    );
  }

  private getCorners(mouse: THREE.Vector2) {
    const bottomLeft = mouse.clone().subScalar(this.distance);
    const topRight = mouse.clone().addScalar(this.distance);
    return { bottomLeft, topRight };
  }

  private getResult(data: {
    hit: any;
    frustum: THREE.Frustum;
    model: FragmentsModel;
    ray?: THREE.Ray;
  }) {
    const { hit, frustum, ray, model } = data;
    const result: Partial<RaycastResult> = {};
    this.setPoint(model, hit, result);
    this.setNormal(model, hit, result);
    this.setDistance(model, hit, result);
    this.setRayDistance(model, hit, result);
    this.setBasicHitData(model, hit, result, ray, frustum);
    this.setSnapEdge(model, hit, result, "snappedEdgeP1");
    this.setSnapEdge(model, hit, result, "snappedEdgeP2");
    return result as RaycastResult;
  }

  private updateCamera(
    camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
  ) {
    camera.updateProjectionMatrix();
    camera.updateWorldMatrix(true, true);
  }

  private newCastRequest(
    object: THREE.Object3D,
    modelId: string,
    ray: THREE.Ray | undefined,
    frustum: THREE.Frustum,
  ) {
    this.setupMatrix(object);
    const request: any = {};
    request.class = MultiThreadingRequestClass.RAYCAST;
    request.modelId = modelId;
    this.setupRay(ray, request);
    CameraUtils.transform(frustum, this._inverseTransform, this._frustum);
    request.frustum = this._frustum;
    return request;
  }

  private setSnapEdge(
    model: FragmentsModel,
    hit: any,
    result: Partial<RaycastResult>,
    key: "snappedEdgeP1" | "snappedEdgeP2",
  ) {
    if (hit[key]) {
      const edge = new THREE.Vector3();
      edge.copy(hit[key]);
      edge.applyMatrix4(model.object.matrixWorld);
      result[key] = edge;
    }
    result[key] = undefined;
  }

  private setNormal(
    model: FragmentsModel,
    hit: any,
    result: Partial<RaycastResult>,
  ) {
    if (hit.normal) {
      const normal = new THREE.Vector3();
      normal.copy(hit.normal);
      normal.transformDirection(model.object.matrixWorld);
      normal.normalize();
      result.normal = normal;
      return;
    }
    result.normal = undefined;
  }

  private setDistance(
    model: FragmentsModel,
    hit: any,
    result: Partial<RaycastResult>,
  ) {
    const cameraDist = Math.sqrt(hit.cameraSquaredDistance);
    const modelScale = model.object.matrixWorld.getMaxScaleOnAxis();
    result.distance = cameraDist * modelScale;
  }

  private setPoint(
    model: FragmentsModel,
    hit: any,
    result: Partial<RaycastResult>,
  ) {
    const point = new THREE.Vector3();
    point.copy(hit.point);
    point.applyMatrix4(model.object.matrixWorld);
    result.point = point;
  }

  private newRaycastSnapResult(
    response: any,
    frustum: THREE.Frustum,
    ray: THREE.Ray,
    model: FragmentsModel,
  ) {
    const results: RaycastResult[] = [];
    for (const hit of response.results) {
      const result = this.getResult({ hit, frustum, ray, model });
      results.push(result);
    }
    return results;
  }

  private newRectangleCastResponse(response: any, meshes: MeshManager) {
    const result: RectangleRaycastResult = {
      localIds: response.localIds,
      fragments: meshes.list.get(response.modelId)!,
    };
    return result;
  }

  private setRayDistance(
    model: FragmentsModel,
    hit: any,
    result: Partial<RaycastResult>,
  ) {
    if (hit.raySquaredDistance !== undefined) {
      const modelScale = model.object.matrixWorld.getMaxScaleOnAxis();
      const rayDist = Math.sqrt(hit.raySquaredDistance);
      result.rayDistance = rayDist * modelScale;
      return;
    }
    result.rayDistance = undefined;
  }

  private setBasicHitData(
    model: FragmentsModel,
    hit: any,
    result: Partial<RaycastResult>,
    ray: THREE.Ray | undefined,
    frustum: THREE.Frustum,
  ) {
    result.itemId = hit.itemId;
    result.localId = hit.localId;
    result.object = model.object;
    result.fragments = model;
    result.ray = ray;
    result.frustum = frustum;
    result.representationClass = hit.representationClass;
    result.snappingClass = hit.snappingClass;
  }
}
