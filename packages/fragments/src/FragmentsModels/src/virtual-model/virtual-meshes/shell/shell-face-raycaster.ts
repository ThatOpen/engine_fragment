import * as THREE from "three";
import earcut from "earcut";
import { ShellUtils } from "./shell-utils";
import { Meshes, Shell } from "../../../../../Schema";
import { DataBuffer } from "../../../model/model-types";
import { FaceUtils } from "../../../utils";

export class ShellFaceRaycaster {
  private a = new THREE.Vector3();
  private b = new THREE.Vector3();
  private c = new THREE.Vector3();
  private d = new THREE.Vector3();
  private e = new THREE.Vector3();
  private f = new THREE.Vector3();
  private g = new THREE.Vector3();
  private h = new THREE.Vector3();
  private i = new THREE.Vector3();
  private j = new THREE.Vector3();
  private k = new THREE.Vector3();

  private tempTriangle = new THREE.Triangle();

  private tempPlane = new THREE.Plane();
  private includedVertices = <any[]>[];
  private interiorProfiles: Map<number, number[]> = new Map();

  private readonly _meshes: Meshes;

  constructor(meshes: Meshes) {
    this._meshes = meshes;
  }

  faceRaycast(id: number, ray: THREE.Ray) {
    const shell = ShellUtils.getShell(this._meshes, id);
    this.resetData();
    this.getInteriorProfiles(shell);
    const buffer = ShellUtils.getBuffer(shell);
    this.processAllCollisions(shell, buffer, ray);
    return this.includedVertices;
  }

  private resetVectors() {
    this.a.set(0, 0, 0);
    this.b.set(0, 0, 0);
    this.c.set(0, 0, 0);
    this.d.set(0, 0, 0);
  }

  private resetData() {
    this.includedVertices.length = 0;
    this.interiorProfiles.clear();
  }

  private getInteriorProfiles(shell: Shell) {
    const holesLength = ShellUtils.getHolesLength(shell);
    for (let holeId = 0; holeId < holesLength; holeId++) {
      const hole = ShellUtils.getHole(shell, holeId);
      const profileId = hole.profileId();
      if (!this.interiorProfiles.has(profileId)) {
        this.interiorProfiles.set(profileId, []);
      }
      const profiles = this.interiorProfiles.get(profileId)!;
      profiles.push(holeId);
    }
  }

  private processTriangle(
    indices: DataBuffer,
    buffer: DataBuffer,
    ray: THREE.Ray,
  ) {
    const first = indices[0] * 3;
    const second = indices[1] * 3;
    const third = indices[2] * 3;
    this.saveTriPoint(this.e, buffer, first);
    this.saveTriPoint(this.f, buffer, second);
    this.saveTriPoint(this.g, buffer, third);
    const found = this.triangleHit(ray);
    if (found) {
      const triangleBuffer = this.getTriangleBuffer(buffer, indices);
      (found as any).facePoints = triangleBuffer.points;
      (found as any).faceIndices = triangleBuffer.indices;
      this.includedVertices.push(found);
    }
  }

  private processAllCollisions(
    shell: Shell,
    buffer: DataBuffer,
    ray: THREE.Ray,
  ) {
    const count = ShellUtils.getProfilesLength(shell);
    for (let id = 0; id < count; id++) {
      this.resetVectors();
      const indices = this.getIndices(shell, id);
      const valid = this.getValidCollision(indices, buffer, ray, id, shell);
      if (valid) {
        this.processCollision(shell, id, buffer, indices);
      }
    }
  }

  private saveTriPoint(
    vector: THREE.Vector3,
    buffer: DataBuffer,
    first: number,
  ) {
    const x1 = buffer[first];
    const y1 = buffer[first + 1];
    const z1 = buffer[first + 2];
    vector.set(x1, y1, z1);
  }

  private getIndices(shell: Shell, id: number) {
    const currentProfile = ShellUtils.getProfile(shell, id);
    return currentProfile.indicesArray()!;
  }

  private getIsTriangle(indices: DataBuffer) {
    const indexAmount = indices.length;
    return indexAmount === 3;
  }

  private getNormal() {
    this.tempTriangle.a = this.e;
    this.tempTriangle.b = this.f;
    this.tempTriangle.c = this.g;
    const result = new THREE.Vector3();
    this.tempTriangle.getNormal(result);
    return result;
  }

  private isHole(id: number, shell: Shell, buffer: DataBuffer) {
    if (this.interiorProfiles.has(id)) {
      const interiorProfiles = this.interiorProfiles.get(id)!;
      return this.holeContains(interiorProfiles, shell, buffer);
    }
    return false;
  }

  private computeNormal(data: DataBuffer, indices: DataBuffer) {
    this.d.set(0, 0, 0);
    const count = indices.length;
    for (let i1 = 0; i1 < count; i1++) {
      const i2 = (i1 + 1) % count;
      const a = indices[i1] * 3;
      const b = indices[i2] * 3;
      this.processNormal(data, a, b);
    }
    this.d.normalize();
  }

  private holeContains(indices: number[], shell: Shell, data: DataBuffer) {
    const count = indices.length;
    for (let i = 0; i < count; i++) {
      const shellHole = ShellUtils.getHole(shell, indices[i]);
      const index = shellHole.indicesArray()!;
      const contained = this.polygonContains(data, index);
      if (contained) {
        return true;
      }
    }
    return false;
  }

  private triangleHit(ray: THREE.Ray) {
    const e = this.e;
    const f = this.f;
    const g = this.g;
    const hits = ray.intersectTriangle(e, f, g, false, this.h);
    if (!hits) {
      return undefined;
    }
    const normal = this.getNormal();
    const point = this.h.clone();
    return { point, normal };
  }

  private getValidCollision(
    indices: DataBuffer,
    buffer: DataBuffer,
    ray: THREE.Ray,
    id: number,
    shell: Shell,
  ) {
    const isTriangle = this.getIsTriangle(indices);
    if (isTriangle) {
      this.processTriangle(indices, buffer, ray);
      return false;
    }

    const collidesPlane = this.getCollidesPlane(indices, buffer, ray);
    if (!collidesPlane) {
      return false;
    }

    const isHole = this.isHole(id, shell, buffer);
    if (isHole) {
      return false;
    }

    return true;
  }

  private processCollision(
    shell: Shell,
    profileId: number,
    buffer: DataBuffer,
    indices: DataBuffer,
  ) {
    const contains = this.polygonContains(buffer, indices);
    if (!contains) return;
    const point = this.b.clone();
    const normal = this.tempPlane.normal.clone();

    const faceBuffer = this.getFaceBuffer(shell, profileId, buffer);

    this.includedVertices.push({
      point,
      normal,
      facePoints: faceBuffer.points,
      faceIndices: faceBuffer.indices,
    });
  }

  private newOrthoNormalBasis() {
    const a1 = this.tempPlane.normal;
    const a2 = this.j;
    const a3 = this.i;
    const n1 = Math.abs(a1.x);
    const n2 = Math.abs(a1.y);
    if (n1 >= n2) {
      const inverse = 1.0 / Math.sqrt(a1.x * a1.x + a1.z * a1.z);
      const a2x = -a1.z * inverse;
      const a2y = 0.0;
      const a2z = a1.x * inverse;
      a2.set(a2x, a2y, a2z);
      const a3x = a1.y * a2.z;
      const a3y = a1.z * a2.x - a1.x * a2.z;
      const a3z = -a1.y * a2.x;
      a3.set(a3x, a3y, a3z);
    } else {
      const inverse = 1.0 / Math.sqrt(a1.y * a1.y + a1.z * a1.z);
      const a2x = 0.0;
      const a2y = a1.z * inverse;
      const a2z = -a1.y * inverse;
      a2.set(a2x, a2y, a2z);
      const a3x = a1.y * a2.z - a1.z * a2.y;
      const a3y = -a1.x * a2.z;
      const a3z = a1.x * a2.y;
      a3.set(a3x, a3y, a3z);
    }
    a2.normalize();
    a3.normalize();
  }

  private polygonContains(data: DataBuffer, indices: DataBuffer) {
    let contains = false;
    this.newOrthoNormalBasis();
    this.setPolyContainVec(indices, data);
    let a = this.k.dot(this.i);
    let b = this.k.dot(this.j);
    for (let i = 0; i < indices.length; i++) {
      const current = indices[i] * 3;
      const x = data[current];
      const y = data[current + 1];
      const z = data[current + 2];
      this.k.set(x, y, z);
      this.k.sub(this.b);
      const c = this.k.dot(this.i);
      const d = this.k.dot(this.j);
      const n1 = d > 0;
      const n2 = b > 0;
      if (n1 !== n2) {
        const crosses = ((a - c) * -d) / (b - d) + c > 0;
        if (crosses) {
          contains = !contains;
        }
      }
      a = c;
      b = d;
    }
    return contains;
  }

  private processNormal(data: DataBuffer, i1: number, i2: number) {
    const x1 = data[i1 + 0];
    const x2 = data[i2 + 0];
    const y1 = data[i1 + 1];
    const y2 = data[i2 + 1];
    const z1 = data[i1 + 2];
    const z2 = data[i2 + 2];
    this.d.x += (y1 - y2) * (z1 + z2);
    this.d.y += (z1 - z2) * (x1 + x2);
    this.d.z += (x1 - x2) * (y1 + y2);
  }

  private getCollidesPlane(
    indices: DataBuffer,
    buffer: DataBuffer,
    ray: THREE.Ray,
  ) {
    const first = indices[0] * 3;
    const x = buffer[first];
    const y = buffer[first + 1];
    const z = buffer[first + 2];
    this.a.set(x, y, z);
    this.computeNormal(buffer, indices);
    this.tempPlane.setFromNormalAndCoplanarPoint(this.d, this.a);
    const collidesPlane = ray.intersectPlane(this.tempPlane, this.b);
    return collidesPlane;
  }

  private setPolyContainVec(indices: DataBuffer, data: DataBuffer) {
    const end = indices[indices.length - 1] * 3;
    const x = data[end];
    const y = data[end + 1];
    const z = data[end + 2];
    this.k.set(x, y, z);
    this.k.sub(this.b);
  }

  private getTriangleBuffer(buffer: DataBuffer, indices: DataBuffer) {
    const points: number[] = [];
    const newIndices: number[] = [];
    for (let i = 0; i < indices.length; i++) {
      const index = indices[i] * 3;
      points.push(buffer[index], buffer[index + 1], buffer[index + 2]);
      newIndices.push(i);
    }

    return { points: new Float32Array(points), indices: newIndices };
  }

  private getFaceBuffer(shell: Shell, profileId: number, buffer: DataBuffer) {
    const indices = ShellUtils.getProfileIndices(shell, profileId);
    const { outer, inners } = indices;

    const points: number[] = [];
    for (let i = 0; i < outer.length; i++) {
      const index = outer[i] * 3;
      points.push(buffer[index], buffer[index + 1], buffer[index + 2]);
    }

    const holesIndices = [];

    for (let i = 0; i < inners.length; i++) {
      const currentHole = inners[i];
      holesIndices.push(points.length / 3);
      for (let j = 0; j < currentHole.length; j++) {
        const index = currentHole[j] * 3;
        points.push(buffer[index], buffer[index + 1], buffer[index + 2]);
      }
    }

    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    a.set(points[0], points[1], points[2]);
    b.set(points[3], points[4], points[5]);
    c.set(points[6], points[7], points[8]);
    const tri = new THREE.Triangle();
    tri.set(a, b, c);
    const normal = new THREE.Vector3();
    tri.getNormal(normal);

    const [dim1, dim2] = FaceUtils.getEarcutDimensions(normal);

    const projectedPoints = [];
    for (let i = 0; i < points.length; i += 3) {
      const x = points[i];
      const y = points[i + 1];
      const z = points[i + 2];
      const point = [x, y, z];
      projectedPoints.push(point[dim1], point[dim2]);
    }

    const result = earcut(projectedPoints, holesIndices);
    return { points: new Float32Array(points), indices: result };
  }
}
