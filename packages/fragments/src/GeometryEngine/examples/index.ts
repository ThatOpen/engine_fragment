import * as THREE from "three";
import * as WEBIFC from "web-ifc";
import {
  Sweep,
  ExtrusionData,
  Profile,
  ProfileData,
  BooleanOperation,
  BooleanOperationData,
  Arc,
  ArcData,
  BboxData,
  Bbox,
  CircularSweepData,
  CircularSweep,
} from "../src";

export type ImplicitGeometryType = WEBIFC.Extrusion;

export class GeometryEngine {
  api: WEBIFC.IfcAPI;
  private _arc: Arc;
  private _extrusion: Sweep;
  private _profile: Profile;
  private _booleanOperation: BooleanOperation;
  private _bbox: Bbox;
  private _circularSweep: CircularSweep;

  constructor(api: WEBIFC.IfcAPI) {
    this.api = api;
    this._extrusion = new Sweep(api);
    this._profile = new Profile(api);
    this._booleanOperation = new BooleanOperation(api);
    this._arc = new Arc(api);
    this._bbox = new Bbox(api);
    this._circularSweep = new CircularSweep(api);
  }

  getExtrusion(geometry: THREE.BufferGeometry, data: ExtrusionData) {
    const buffers = this._extrusion.get(this.api, data);
    this.applyMesh(geometry, buffers);
  }

  getProfile(geometry: THREE.BufferGeometry, data: ProfileData) {
    const buffers = this._profile.get(this.api, data);
    this.applyCurve(geometry, buffers);
  }

  getBooleanOperation(geometry: THREE.BufferGeometry, data: BooleanOperationData) {
    const buffers = this._booleanOperation.get(this.api, data);
    this.applyMesh(geometry, buffers);
  }

  getBbox(geometry: THREE.BufferGeometry, data: BboxData) {
    const buffers = this._bbox.get(data);
    this.applyMesh(geometry, buffers);
  }

  getCircularSweep(geometry: THREE.BufferGeometry, data: CircularSweepData) {
    const buffers = this._circularSweep.get(this.api, data);
    this.applyMesh(geometry, buffers);
  }

  getArc(geometry: THREE.BufferGeometry, data: ArcData) {
    const buffers = this._arc.get(this.api, data);
    this.applyCurve(geometry, buffers);
  }

  getProfilePoints(data: ProfileData) {
    // TODO: Fix WEBIFC.Buffer.fvertexData type
    const buffers = this._profile.get(this.api, data) as any;
    const vertexSize = buffers.fvertexData.size();
    const points: number[] = [];
    for (let i = 0; i < vertexSize; i++) {
      const value = buffers.fvertexData.get(i);
      points.push(value);
    }
    return points;
  }

  private applyMesh(geometry: THREE.BufferGeometry, buffers: any) {
    // const buffers = this.core.GetBuffers();
    const vertexSize = buffers.fvertexData.size();
    const vertices = new Float32Array(vertexSize);
    for (let i = 0; i < vertexSize; i++) {
      vertices[i] = buffers.fvertexData.get(i);
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));

    const indexSize = buffers.indexData.size();
    const indices: number[] = [];
    for (let i = 0; i < indexSize; i++) {
      indices[i] = buffers.indexData.get(i);
    }

    geometry.setIndex(indices);

    const normalArray = new Float32Array(vertexSize).fill(0);
    geometry.setAttribute("normal", new THREE.BufferAttribute(normalArray, 3));
    geometry.computeVertexNormals();
  }

  private applyCurve(geometry: THREE.BufferGeometry, buffers: any) {
    const vertexSize = buffers.fvertexData.size();
    const vertices = new Float32Array(vertexSize);
    for (let i = 0; i < vertexSize; i++) {
      vertices[i] = buffers.fvertexData.get(i);
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));

    const indices: number[] = [];
    for (let i = 0; i < vertexSize / 3 - 1; i++) {
      indices.push(i, i + 1);
    }
    geometry.setIndex(indices);
  }
}
