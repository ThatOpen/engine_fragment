import * as THREE from "three";
import {
  BoundingBox,
  Transform,
  DoubleVector,
  FloatVector,
  Material,
} from "../../../../Schema";
import { MiscHelper } from "../misc";

export class ParserHelper {
  private static _temp = {
    position: new THREE.Vector3(),
    xDirection: new THREE.Vector3(),
    yDirection: new THREE.Vector3(),
    zDirection: new THREE.Vector3(),
  };

  private static _doubleVector = new DoubleVector();
  private static _floatVector = new FloatVector();

  static parseMaterial(material: Material) {
    const r = material.r() / 255;
    const g = material.g() / 255;
    const b = material.b() / 255;
    const opacity = material.a() / 255;
    const transparent = material.a() < 255;
    // IFC colors are stored in sRGB color space, so we need to tell Three.js
    // to convert them to linear color space.
    const color = new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
    const renderedFaces = material.renderedFaces();
    return {
      color,
      renderedFaces,
      opacity,
      transparent,
      localId: undefined as number | undefined,
    };
  }

  static parseBox(data: BoundingBox, box: THREE.Box3) {
    this.getBox(data, box, "min");
    this.getBox(data, box, "max");
  }

  static parseTransform(transform: Transform, result: THREE.Matrix4) {
    this.getVector(transform, "position", this._doubleVector);
    this.getVector(transform, "xDirection", this._floatVector);
    this.getVector(transform, "yDirection", this._floatVector);
    this.computeZVector();
    this.setTransform(result);
    return result;
  }

  private static setTransform(result: THREE.Matrix4) {
    const { x: xx, y: xy, z: xz } = this._temp.xDirection;
    const { x: yx, y: yy, z: yz } = this._temp.yDirection;
    const { x: zx, y: zy, z: zz } = this._temp.zDirection;
    const { x: ox, y: oy, z: oz } = this._temp.position;
    // prettier-ignore
    result.set(
        xx, yx, zx, ox,
        xy, yy, zy, oy,
        xz, yz, zz, oz,
        0, 0, 0, 1
    );
  }

  private static getBox(
    data: BoundingBox,
    box: THREE.Box3,
    point: "min" | "max"
  ) {
    data[point](this._floatVector);
    const x = this._floatVector.x();
    const y = this._floatVector.y();
    const z = this._floatVector.z();
    box[point].x = MiscHelper.fixNumber(x);
    box[point].y = MiscHelper.fixNumber(y);
    box[point].z = MiscHelper.fixNumber(z);
  }

  private static getVector(
    transform: Transform,
    name: "position" | "xDirection" | "yDirection",
    vector: DoubleVector | FloatVector
  ) {
    transform[name](vector);
    const parsed = this._temp[name] as THREE.Vector3;
    const x = vector.x();
    const y = vector.y();
    const z = vector.z();
    parsed.x = MiscHelper.fixNumber(x);
    parsed.y = MiscHelper.fixNumber(y);
    parsed.z = MiscHelper.fixNumber(z);
  }

  private static computeZVector() {
    this._temp.zDirection.crossVectors(
      this._temp.xDirection,
      this._temp.yDirection
    );
  }
}
