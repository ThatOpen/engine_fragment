import * as THREE from "three";
import { LodHelper } from "./lod-helper";

export class LODGeometry extends THREE.InstancedBufferGeometry {
  isLODGeometry = true;

  isFiltered(): boolean {
    const filter = this.getItemFilter();
    return Boolean(filter);
  }

  constructor() {
    super();
    LodHelper.setupLodAttributes(this);
  }

  override computeBoundingBox() {
    if (!this.boundingBox) {
      this.boundingBox = new THREE.Box3();
    }
    LodHelper.computeLodBox(this);
  }

  override applyMatrix4(matrix: THREE.Matrix4) {
    this.applyTransformToBuffers(matrix);
    this.updateBounds();
    return this;
  }

  override computeBoundingSphere() {
    if (!this.boundingSphere) {
      this.boundingSphere = new THREE.Sphere();
    }
    LodHelper.computeLodSphere(this);
  }

  getItemFilter() {
    return LodHelper.getInstancedAttribute(this, "itemFilter");
  }

  getItemLast() {
    return LodHelper.getInterAttribute(this, "itemLast");
  }

  getItemFirst() {
    return LodHelper.getInterAttribute(this, "itemFirst");
  }

  private applyTransformToBuffers(matrix: THREE.Matrix4) {
    const first = this.getItemFirst();
    first.applyMatrix4(matrix);
    const last = this.getItemLast();
    last.applyMatrix4(matrix);
  }

  private updateBounds() {
    if (this.boundingBox) {
      this.computeBoundingBox();
    }
    if (this.boundingSphere) {
      this.computeBoundingSphere();
    }
  }
}
