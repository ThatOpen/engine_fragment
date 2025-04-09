import * as THREE from "three";

export class BoxUtils {
  private static _temp = {
    vector: new THREE.Vector3(),
  };

  static getWidth(box: THREE.Box3) {
    box.getSize(this._temp.vector);

    if (this._temp.vector.x > this._temp.vector.y) {
      this._temp.vector.set(
        this._temp.vector.y,
        this._temp.vector.x,
        this._temp.vector.z,
      );
    }

    if (this._temp.vector.y > this._temp.vector.z) {
      this._temp.vector.set(
        this._temp.vector.x,
        this._temp.vector.z,
        this._temp.vector.y,
      );
    }

    if (this._temp.vector.x > this._temp.vector.y) {
      this._temp.vector.set(
        this._temp.vector.y,
        this._temp.vector.x,
        this._temp.vector.z,
      );
    }

    return this._temp.vector.y;
  }
}
