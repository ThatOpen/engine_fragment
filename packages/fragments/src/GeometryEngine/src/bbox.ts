import * as THREE from "three";
import * as WEBIFC from "web-ifc";

export type BboxData = {
  min?: THREE.Vector3;
  max?: THREE.Vector3;
};

export class Bbox {
  core: WEBIFC.AABB;

  constructor(api: WEBIFC.IfcAPI) {
    this.core = api.CreateAABB() as WEBIFC.AABB;
  }

  get(data: BboxData) {
    const min = data.min ?? new THREE.Vector3(0, 0, 0);
    const max = data.max ?? new THREE.Vector3(1, 1, 1);
    const { x: minX, y: minY, z: minZ } = min;
    const { x: maxX, y: maxY, z: maxZ } = max;
    this.core.SetValues(minX, minY, minZ, maxX, maxY, maxZ);
    return this.core.GetBuffers();
  }
}
