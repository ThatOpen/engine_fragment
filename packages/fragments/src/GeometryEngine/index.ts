import * as THREE from "three";
import * as WEBIFC from "web-ifc";
import * as GE from "./src";

export * from "./src";

/**
 * The geometry engine is responsible for generating geometry using web-ifc. It provides a high-level API to generate common BIM shapes like extrusions, sweeps, walls, and profiles.
 */
export class GeometryEngine {
  /**
   * The WebIFC API instance that contains the geometry engine.
   */
  api: WEBIFC.IfcAPI;

  private _arc: GE.Arc;
  private _parabola: GE.Parabola;
  private _extrusion: GE.Extrusion;
  private _profile: GE.Profile;
  private _booleanOperation: GE.BooleanOperation;
  private _bbox: GE.Bbox;
  private _circularSweep: GE.CircularSweep;
  private _clothoid: GE.Clothoid;
  private _cylindricalRevolve: GE.CylindricalRevolve;
  private _revolve: GE.Revolve;
  private _sweep: GE.Sweep;
  private _wall: GE.Wall;

  /**
   * Creates a new geometry engine instance.
   * @param api - The WebIFC API instance that contains the geometry engine.
   */
  constructor(api: WEBIFC.IfcAPI) {
    this.api = api;
    this._extrusion = new GE.Extrusion(api);
    this._profile = new GE.Profile(api);
    this._booleanOperation = new GE.BooleanOperation(api);
    this._arc = new GE.Arc(api);
    this._bbox = new GE.Bbox(api);
    this._clothoid = new GE.Clothoid(api);
    this._circularSweep = new GE.CircularSweep(api);
    this._cylindricalRevolve = new GE.CylindricalRevolve(api);
    this._revolve = new GE.Revolve(api);
    this._parabola = new GE.Parabola(api);
    this._sweep = new GE.Sweep(api);
    this._wall = new GE.Wall(api);
  }

  /**
   * Generates an extrusion geometry from the given data.
   * @param geometry - The geometry to store the result.
   * @param data - The data to generate the extrusion.
   */
  getExtrusion(geometry: THREE.BufferGeometry, data: GE.ExtrusionData) {
    const buffers = this._extrusion.get(this.api, data);
    this.applyMesh(geometry, buffers);
  }

  /**
   * Generates a sweep geometry from the given data.
   * @param geometry - The geometry to store the result.
   * @param data - The data to generate the sweep.
   */
  getSweep(geometry: THREE.BufferGeometry, data: GE.SweepData) {
    const buffers = this._sweep.get(this.api, data);
    this.applyMesh(geometry, buffers);
  }

  /**
   * Generates a wall geometry from the given data.
   * @param geometry - The geometry to store the result.
   * @param data - The data to generate the wall.
   */
  getWall(geometry: THREE.BufferGeometry, data: GE.WallData) {
    const buffers = this._wall.get(this.api, data);
    this.applyMesh(geometry, buffers);
  }

  /**
   * Generates a profile geometry from the given data.
   * @param geometry - The geometry to store the result.
   * @param data - The data to generate the profile.
   */
  getProfile(geometry: THREE.BufferGeometry, data: GE.ProfileData) {
    const buffers = this._profile.get(this.api, data);
    this.applyCurve(geometry, buffers);
  }

  /**
   * Generates a boolean operation geometry from the given data.
   * @param geometry - The geometry to store the result.
   * @param data - The data to generate the boolean operation.
   */
  getBooleanOperation(
    geometry: THREE.BufferGeometry,
    data: GE.BooleanOperationData,
  ) {
    const buffers = this._booleanOperation.get(this.api, data);
    this.applyMesh(geometry, buffers);
  }

  /**
   * Generates a bounding box geometry from the given data.
   * @param geometry - The geometry to store the result.
   * @param data - The data to generate the bounding box.
   */
  getBbox(geometry: THREE.BufferGeometry, data: GE.BboxData) {
    const buffers = this._bbox.get(data);
    this.applyMesh(geometry, buffers);
  }

  /**
   * Generates a circular sweep geometry from the given data.
   * @param geometry - The geometry to store the result.
   * @param data - The data to generate the circular sweep.
   */
  getCircularSweep(geometry: THREE.BufferGeometry, data: GE.CircularSweepData) {
    const buffers = this._circularSweep.get(this.api, data);
    this.applyMesh(geometry, buffers);
  }

  /**
   * Generates a revolve geometry from the given data.
   * @param geometry - The geometry to store the result.
   * @param data - The data to generate the revolve.
   */
  getRevolve(geometry: THREE.BufferGeometry, data: GE.RevolveData) {
    const buffers = this._revolve.get(this.api, data);
    this.applyMesh(geometry, buffers);
  }

  /**
   * Generates a cylindrical revolve geometry from the given data.
   * @param geometry - The geometry to store the result.
   * @param data - The data to generate the cylindrical revolve.
   */
  getCylindricalRevolve(
    geometry: THREE.BufferGeometry,
    data: GE.CylindricalRevolveData,
  ) {
    const buffers = this._cylindricalRevolve.get(this.api, data);
    this.applyMesh(geometry, buffers);
  }

  /**
   * Generates an arc geometry from the given data.
   * @param geometry - The geometry to store the result.
   * @param data - The data to generate the arc.
   */
  getArc(geometry: THREE.BufferGeometry, data: GE.ArcData) {
    const buffers = this._arc.get(this.api, data);
    this.applyCurve(geometry, buffers);
  }

  /**
   * Generates a parabola geometry from the given data.
   * @param geometry - The geometry to store the result.
   * @param data - The data to generate the parabola.
   */
  getParabola(geometry: THREE.BufferGeometry, data: GE.ParabolaData) {
    const buffers = this._parabola.get(data);
    this.applyCurve(geometry, buffers);
  }

  /**
   * Generates a clothoid geometry from the given data.
   * @param geometry - The geometry to store the result.
   * @param data - The data to generate the clothoid.
   */
  getClothoid(geometry: THREE.BufferGeometry, data: GE.ClothoidData) {
    const buffers = this._clothoid.get(data);
    this.applyCurve(geometry, buffers);
  }

  /**
   * Generates profile points from the given data.
   * @param data - The data to generate the profile points.
   * @returns The profile points.
   */
  getProfilePoints(data: GE.ProfileData) {
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

  /**
   * Transforms points from the given data.
   * @param points - The points to transform.
   * @param transform - The transform to apply to the points.
   * @returns The transformed points.
   */
  transformPoints(points: number[], transform: THREE.Matrix4) {
    const rotatedPoints: number[] = [];
    const tempPoint = new THREE.Vector3();
    for (let i = 0; i < points.length; i += 3) {
      tempPoint.set(points[i], points[i + 1], points[i + 2]);
      tempPoint.applyMatrix4(transform);
      rotatedPoints.push(tempPoint.x, tempPoint.y, tempPoint.z);
    }
    return rotatedPoints;
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
