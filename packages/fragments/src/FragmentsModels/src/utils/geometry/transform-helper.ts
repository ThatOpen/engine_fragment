import * as THREE from "three";
import {
  BoundingBox,
  Representation,
  Sample,
  Meshes,
  Transform,
} from "../../../../Schema";
import { ParserHelper } from "./parser-helper";

export class TransformHelper {
  private static _transform = new Transform();
  private static _min = new THREE.Vector3();
  private static _max = new THREE.Vector3();
  private static _center = new THREE.Vector3();
  private static _distance = new THREE.Vector3();
  private static _edge = new THREE.Line3();
  private static _item = new THREE.Matrix4();
  private static _sample = new THREE.Matrix4();
  private static _box = new BoundingBox();
  private static _transformers = {
    x: () => this.setBoxX(),
    y: () => this.setBoxY(),
    z: () => this.setBoxZ(),
  };

  static get(sample: Sample, meshes: Meshes, transform: THREE.Matrix4) {
    this.fetchSampleTransform(sample, meshes);
    this.fetchItemTransform(sample, meshes);
    transform.multiplyMatrices(this._item, this._sample);
  }

  static getBox(representation: Representation, bbox: THREE.Box3) {
    representation.bbox(this._box);
    ParserHelper.parseBox(this._box, bbox);
  }

  private static getBoxData(bbox: THREE.Box3) {
    this._min.copy(bbox.min);
    this._max.copy(bbox.max);
    this._center.addVectors(this._min, this._max);
    this._center.divideScalar(2);
    bbox.getSize(this._distance);
  }

  static boxSize(bbox: THREE.Box3) {
    this.getBoxData(bbox);
    this.applyTransformer();
    this._edge.start = this._min.clone();
    this._edge.end = this._max.clone();
    return this._edge;
  }

  private static applyTransformer() {
    const { x, y, z } = this._distance;
    const max = Math.max(x, y, z);
    if (x === max) {
      this._transformers.x();
    } else if (y === max) {
      this._transformers.y();
    } else {
      this._transformers.z();
    }
  }

  private static fetchItemTransform(sample: Sample, meshes: Meshes) {
    const itemId = sample.item();
    meshes.globalTransforms(itemId, this._transform)!;
    ParserHelper.parseTransform(this._transform, this._item);
  }

  private static fetchSampleTransform(sample: Sample, meshes: Meshes) {
    const localTransformId = sample.localTransform();
    meshes.localTransforms(localTransformId, this._transform)!;
    ParserHelper.parseTransform(this._transform, this._sample);
  }

  private static setBoxZ() {
    this._min.set(this._center.x, this._center.y, this._min.z);
    this._max.set(this._center.x, this._center.y, this._max.z);
  }

  private static setBoxY() {
    this._min.set(this._center.x, this._min.y, this._center.z);
    this._max.set(this._center.x, this._max.y, this._center.z);
  }

  private static setBoxX() {
    this._min.set(this._min.x, this._center.y, this._center.z);
    this._max.set(this._max.x, this._center.y, this._center.z);
  }
}
