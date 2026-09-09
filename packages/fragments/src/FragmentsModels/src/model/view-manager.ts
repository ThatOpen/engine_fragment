import * as THREE from "three";
import { LodMode, MultiThreadingRequestClass } from "./model-types";
import { FragmentsModel } from "./fragments-model";
import { MeshManager } from "./mesh-manager";
import { CameraUtils, GPU } from "../utils";

export class ViewManager {
  getClippingPlanesEvent: () => THREE.Plane[] = () => [];

  currentCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera | null =
    null;

  private _noCameraWarned = false;
  private readonly _tempMatrix = new THREE.Matrix4();
  private readonly _tempVec = new THREE.Vector3();
  private readonly _tempFrustum = new THREE.Frustum();

  private _updateCameraPositionEvent: (vector: THREE.Vector3) => void =
    () => {};

  private _updateCameraFrustumEvent: (frustum: THREE.Frustum) => void =
    () => {};

  private _updateFOVEvent: () => number | void = () => {};

  private _updateOrthoSizeEvent: () => number | void = () => {};

  async refreshView(model: FragmentsModel, meshes: MeshManager) {
    const fov = this.setup(meshes, model);
    // With no camera there is nothing to cull against, so send a frustum
    // sized to the model rather than the default one, whose six identical
    // planes silently discard the negative-X half space (#255). Encoding
    // this in the frustum instead of a companion flag keeps the wire
    // format unchanged, so a worker older than this fix — a real pairing,
    // since the worker is separately pinned — reads it correctly without
    // knowing the fix exists.
    if (!this.currentCamera) {
      this.warnNoCameraOnce(model);
      // `box` is world space; `_tempMatrix` is the inverse model matrix,
      // so this lands in the model space the worker culls in.
      const bounds = model.box;
      if (!bounds.isEmpty()) {
        bounds.applyMatrix4(this._tempMatrix);
      }
      const containing = CameraUtils.containing(bounds, this._tempFrustum);
      await model.threads.fetch(this.newViewRequest(containing, fov, model));
      return;
    }
    const frustum = CameraUtils.transform(this._tempFrustum, this._tempMatrix);
    await model.threads.fetch(this.newViewRequest(frustum, fov, model));
  }

  useCamera(camera: THREE.PerspectiveCamera | THREE.OrthographicCamera) {
    const projScreenMatrix = new THREE.Matrix4();
    this.setCameraPosition(camera);
    this.setCameraFrustum(camera, projScreenMatrix);
    this.setFov(camera);
    this.setOrtho();
    this.currentCamera = camera;
  }

  async setLodMode(model: FragmentsModel, lodMode: LodMode) {
    return model.threads.invoke(model.modelId, "setLodMode", [
      lodMode,
    ]) as Promise<void>;
  }

  private getOrthoSize() {
    let orthoSize = this._updateOrthoSizeEvent();
    if (orthoSize) {
      const modelScale = this._tempMatrix.getMaxScaleOnAxis();
      orthoSize *= modelScale;
    }
    return orthoSize;
  }

  private setup(meshes: MeshManager, model: FragmentsModel) {
    meshes.requests.clean(model.modelId);
    this._tempMatrix.copy(model.object.matrixWorld).invert();
    this._updateCameraPositionEvent(this._tempVec);
    this._updateCameraFrustumEvent(this._tempFrustum);
    const fov = this._updateFOVEvent();
    return fov;
  }

  private warnNoCameraOnce(model: FragmentsModel) {
    if (this._noCameraWarned) {
      return;
    }
    console.warn(
      `Fragments: model "${model.modelId}" is being rendered before ` +
        "useCamera() has been called. Frustum culling is disabled until " +
        "a camera is set.",
    );
    this._noCameraWarned = true;
  }

  private newViewRequest(
    frustum: THREE.Frustum,
    fov: number | void,
    model: FragmentsModel,
  ) {
    const view: any = this.newView(frustum, fov, model);
    const request: any = {};
    request.class = MultiThreadingRequestClass.REFRESH_VIEW;
    request.modelId = model.modelId;
    request.cameraFrustum = frustum;
    request.view = view;
    return request;
  }

  private newView(
    frustum: THREE.Frustum,
    fov: number | void,
    model: FragmentsModel,
  ) {
    const view: any = {};
    view.cameraFrustum = frustum;
    view.cameraPosition = this._tempVec.applyMatrix4(this._tempMatrix);
    view.fov = fov;
    view.orthogonalDimension = this.getOrthoSize();
    view.viewSize = Math.max(window.innerWidth, window.innerHeight);
    view.graphicThreshold = GPU.estimateCapacity();
    view.graphicQuality = model.graphicsQuality * -1.5 + 2;
    view.clippingPlanes = this.getPlanes();
    view.modelPlacement = model.object.matrixWorld;
    return view;
  }

  private setOrtho() {
    // TODO: return ortho size in meters of biggest camera dimension (width or height)
    this._updateOrthoSizeEvent = () => {
      return undefined;
    };
  }

  private setFov(camera: THREE.PerspectiveCamera | THREE.OrthographicCamera) {
    this._updateFOVEvent = () => {
      if (camera instanceof THREE.PerspectiveCamera) {
        return camera.fov;
      }
      return undefined;
    };
  }

  private getPlanes() {
    const planes: THREE.Plane[] = [];
    const originalPlanes = this.getClippingPlanesEvent();
    for (const plane of originalPlanes) {
      const cloned = plane.clone();
      cloned.applyMatrix4(this._tempMatrix);
      planes.push(cloned);
    }
    return planes;
  }

  private setCameraPosition(
    camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
  ) {
    this._updateCameraPositionEvent = (position: THREE.Vector3) => {
      position.copy(camera.position);
    };
  }

  private setCameraFrustum(
    camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
    projScreenMatrix: THREE.Matrix4,
  ) {
    this._updateCameraFrustumEvent = (frustum: THREE.Frustum) => {
      camera.updateProjectionMatrix();
      camera.updateWorldMatrix(true, true);
      const { projectionMatrix, matrixWorldInverse } = camera;
      projScreenMatrix.multiplyMatrices(projectionMatrix, matrixWorldInverse);
      frustum.setFromProjectionMatrix(projScreenMatrix);
    };
  }
}
