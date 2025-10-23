import * as THREE from "three";
import { GeomsFbUtils } from "./index";

export class Plane {
  normal: THREE.Vector3;
  constant: number;
  id: string;

  faces: number[] = [];

  constructor(plane: THREE.Plane, precission: number, normalPrecision: number) {
    // Normals are smaller, so increase precission to avoid problems with almost coplanar faces
    const nx = GeomsFbUtils.round(plane.normal.x, normalPrecision);
    const ny = GeomsFbUtils.round(plane.normal.y, normalPrecision);
    const nz = GeomsFbUtils.round(plane.normal.z, normalPrecision);
    const c = GeomsFbUtils.round(plane.constant, precission);

    this.normal = new THREE.Vector3(nx, ny, nz);
    this.constant = c;

    const planeSeparator = "||";
    this.id = `${nx}${planeSeparator}${ny}${planeSeparator}${nz}${planeSeparator}${c}`;
  }
}
