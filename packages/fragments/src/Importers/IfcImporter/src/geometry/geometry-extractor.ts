import * as WEBIFC from "web-ifc";
import * as THREE from "three";
import { GeomsFbUtils, GeometryProcessSettings } from "../../../../Utils";
import * as TFB from "../../../../Schema";
import { Hasher } from "./geometry-hash";
import {
  CircleExtrusionData,
  EncodedShell,
  encodeShell,
  ExtractedBatch,
  ExtractedElement,
  ExtractedGeometry,
  EXTRUSION,
  SHELL,
} from "./geometry-records";

/** web-ifc's typings leave out `delete`, which every embind handle has. */
type EmbindHandle = { delete(): void };

export interface ExtractorOptions {
  geometryProcessSettings: GeometryProcessSettings;
  /** See `IfcImporter.distanceThreshold`. */
  distanceThreshold: number | null;
}

/**
 * What assembly already holds, when it runs in the same thread: geometry it
 * has is never needed again, so there is no point building it.
 */
export interface KnownGeometry {
  shell(hash: string): boolean;
  extrusion(gid: number): boolean;
}

const rawCategories = new Set<number>([
  WEBIFC.IFCEARTHWORKSFILL,
  WEBIFC.IFCEARTHWORKSCUT,
]);

/**
 * The part of the geometry pass that depends on one element alone: reads its
 * meshes from an open web-ifc model, hashes them, and builds each shell or
 * circle extrusion the first time it is seen.
 *
 * It keeps no state that decides the output — that is
 * {@link IfcGeometryAssembler}'s — only what avoids recomputing a geometry it
 * has already built, so it can run over any subset of a file, in any worker.
 */
export class IfcGeometryExtractor {
  private _batch: ExtractedBatch = { elements: [], shells: [], extrusions: [] };

  // Built once per distinct geometry within the current batch. The shell key
  // includes what getShellData reads besides the mesh, so a hit is exactly
  // what a fresh build would produce.
  private _shells = new Map<string, number>();
  private _extrusions = new Map<number, number>();

  private _tempObject1 = new THREE.Object3D();
  private _tempObject2 = new THREE.Object3D();
  private _tempMatrix1 = new THREE.Matrix4();

  private readonly _api: WEBIFC.IfcAPI;
  private readonly _modelID: number;
  private readonly _hasher: Hasher;
  private readonly _options: ExtractorOptions;
  private readonly _known: KnownGeometry | null;

  /**
   * @param known What assembly already holds, when it runs in this thread;
   * see {@link KnownGeometry}.
   */
  constructor({
    api,
    modelID,
    hasher,
    options,
    known = null,
  }: {
    api: WEBIFC.IfcAPI;
    modelID: number;
    hasher: Hasher;
    options: ExtractorOptions;
    known?: KnownGeometry | null;
  }) {
    this._api = api;
    this._modelID = modelID;
    this._hasher = hasher;
    this._options = options;
    this._known = known;
  }

  /**
   * The elements extracted since the last call, and the geometry they point
   * at. Starts a new batch: later records never point into this one.
   */
  takeBatch(): ExtractedBatch {
    const batch = this._batch;
    this._batch = { elements: [], shells: [], extrusions: [] };
    this._shells.clear();
    this._extrusions.clear();
    return batch;
  }

  /**
   * Extract one element from inside a `StreamMeshes` callback, and add it to
   * the current batch.
   *
   * @returns the record, or null when the element is skipped for lying beyond
   * `distanceThreshold`.
   */
  extract(mesh: WEBIFC.FlatMesh, category: number): ExtractedElement | null {
    const properties = this._api.GetLine(this._modelID, mesh.expressID);

    const firstGeometryRef = mesh.geometries.get(0);
    const { transformWithoutScale } = this.removeScale(
      firstGeometryRef.flatTransformation,
    );

    // Check that the object is not too far away
    const { distanceThreshold } = this._options;
    if (distanceThreshold !== null) {
      const position = new THREE.Vector3().applyMatrix4(transformWithoutScale);
      if (
        position.x > distanceThreshold ||
        position.y > distanceThreshold ||
        position.z > distanceThreshold
      ) {
        console.log(
          `Fragments: Object ${mesh.expressID} is more than ${distanceThreshold} meters away from the origin and will be skipped.`,
        );
        return null;
      }
    }

    const type = properties.type as number;
    const elementTransform = transformWithoutScale.elements;
    const geometries: ExtractedGeometry[] = [];
    const geometryCount = mesh.geometries.size();
    for (let i = 0; i < geometryCount; i++) {
      // Rebars can be SweptDiskSolid, FacetedBrep, Tessellated, ...
      // if it doesn't have a directrix, it's not a SweptDiskSolid shape representation
      const isExtrusion =
        type === WEBIFC.IFCREINFORCINGBAR && this.hasSweptDiskDirectrix(mesh, i);
      geometries.push(
        isExtrusion
          ? this.extractExtrusion({ mesh, geometryIndex: i, elementTransform })
          : this.extractShell({
              mesh,
              geometryIndex: i,
              elementTransform,
              elementType: type,
              category,
            }),
      );
    }

    const { dxx, dxy, dxz, dyx, dyy, dyz, px, py, pz } = this.decompose(
      transformWithoutScale,
    );

    const element: ExtractedElement = {
      id: mesh.expressID,
      type,
      guid: properties.GlobalId.value,
      position: [px, py, pz],
      xDirection: [dxx, dxy, dxz],
      yDirection: [dyx, dyy, dyz],
      geometries,
    };
    this._batch.elements.push(element);
    return element;
  }

  private extractShell({
    mesh,
    geometryIndex,
    elementTransform,
    elementType,
    category,
  }: {
    mesh: WEBIFC.FlatMesh;
    geometryIndex: number;
    elementTransform: number[];
    elementType: number;
    category: number;
  }): ExtractedGeometry {
    const geometryRef = mesh.geometries.get(geometryIndex);

    // We need to get the units here because each geometry can have different units
    const { units, transformWithoutScale } = this.removeScale(
      geometryRef.flatTransformation,
    );

    const settings = this._options.geometryProcessSettings;
    const { x, y, z } = geometryRef.color;
    let w = geometryRef.color.w;
    if (
      settings.forceTransparentSpaces &&
      category === WEBIFC.IFCSPACE &&
      w === 1
    ) {
      w = 0.5;
    }

    const record: ExtractedGeometry = {
      gid: geometryRef.geometryExpressID,
      kind: SHELL,
      color: [x, y, z, w],
      scale: this.getScaleHash(units),
      local: this.getLocalTransform(elementTransform, transformWithoutScale),
    };

    const buffers = this.getGeometryBuffers(geometryRef);
    if (buffers === null) return record;

    const { position, normals, index } = buffers;

    for (let i = 0; i < position.length - 2; i += 3) {
      position[i] *= units.x;
      position[i + 1] *= units.y;
      position[i + 2] *= units.z;
    }

    record.hash = this.getShellHash(position, index);

    const raw = rawCategories.has(elementType);
    const thresholdCategory = settings.categoryFaceThresholds?.has(category)
      ? category
      : "";
    const key = `${record.hash}|${raw ? 1 : 0}|${thresholdCategory}`;
    let data = this._shells.get(key);
    if (data === undefined && this._known?.shell(record.hash)) return record;
    if (data === undefined) {
      try {
        const shell = GeomsFbUtils.getShellData({
          position,
          normals,
          index,
          raw,
          settings,
          category,
        });
        data = this._batch.shells.push(encodeShell(shell)) - 1;
      } catch (error) {
        data = -1;
      }
      this._shells.set(key, data);
    }
    record.data = data;
    return record;
  }

  // Determine whether the geometry is duplicated by computing some properties
  // Like areas, volumes, and some vertices
  // We'll just deduplicate exact geometries, without taking transforms into account
  private getShellHash(position: Float32Array, index: Uint32Array) {
    const vertexCount = position.length / 3;
    const triangleCount = index.length / 3;

    let biggestArea = 0;
    let areaSum = 0;

    const triangle = new THREE.Triangle();

    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    const v3 = new THREE.Vector3();

    // Compute volume, area and biggest/smallest triangles

    const volume = this.getVolume(index, position);

    const centroid = new THREE.Vector3();

    for (let i = 0; i < index.length - 2; i += 3) {
      const i1 = index[i];
      const i2 = index[i + 1];
      const i3 = index[i + 2];

      v1.set(position[i1 * 3], position[i1 * 3 + 1], position[i1 * 3 + 2]);
      v2.set(position[i2 * 3], position[i2 * 3 + 1], position[i2 * 3 + 2]);
      v3.set(position[i3 * 3], position[i3 * 3 + 1], position[i3 * 3 + 2]);

      centroid.add(v1);
      centroid.add(v2);
      centroid.add(v3);

      triangle.set(v1, v2, v3);
      const area = triangle.getArea();

      if (area > biggestArea) {
        biggestArea = area;
      }

      areaSum += area;
    }

    centroid.divideScalar(index.length);

    const p = 10000;
    const hashAreaSum = GeomsFbUtils.round(areaSum, p);
    const hashBigArea = GeomsFbUtils.round(biggestArea, p);
    const hashVolume = GeomsFbUtils.round(volume, p);

    // Cheap early discriminator: the AABB corners reject differently sized
    // geometry before the per-vertex fold below has to separate anything, and
    // unlike the first vertex used before they don't depend on vertex ordering.
    const aabb = GeomsFbUtils.getAABB(position);
    const minX = GeomsFbUtils.round(aabb.min.x, p);
    const minY = GeomsFbUtils.round(aabb.min.y, p);
    const minZ = GeomsFbUtils.round(aabb.min.z, p);
    const maxX = GeomsFbUtils.round(aabb.max.x, p);
    const maxY = GeomsFbUtils.round(aabb.max.y, p);
    const maxZ = GeomsFbUtils.round(aabb.max.z, p);

    const cx = GeomsFbUtils.round(centroid.x, p);
    const cy = GeomsFbUtils.round(centroid.y, p);
    const cz = GeomsFbUtils.round(centroid.z, p);

    // Everything above is blind to where interior detail sits: two plates with
    // the same outline, area, volume, centroid and bounding box hash alike even
    // when their bolt holes are in different places (#237). Folding the vertex
    // positions in is what separates them; see `hashCoordinates` for how they
    // are quantized and why the fold is order-sensitive.
    const vertexKey = this._hasher.hashCoordinates(position, p);

    // Digested: the full key is ~150 characters, and it is sent from a worker
    // and held by assembly once per geometry.
    return this._hasher.hashString(
      `${vertexCount}-${triangleCount}-${hashAreaSum}-${hashBigArea}-${hashVolume}-${cx}-${cy}-${cz}-${minX}-${minY}-${minZ}-${maxX}-${maxY}-${maxZ}-${vertexKey}`,
    );
  }

  private extractExtrusion({
    mesh,
    geometryIndex,
    elementTransform,
  }: {
    mesh: WEBIFC.FlatMesh;
    geometryIndex: number;
    elementTransform: number[];
  }): ExtractedGeometry {
    const geometryRef = mesh.geometries.get(geometryIndex);

    // We need to get the units here because each geometry can have different units
    const { units, transformWithoutScale } = this.removeScale(
      geometryRef.flatTransformation,
    );

    const { x, y, z, w } = geometryRef.color;

    const record: ExtractedGeometry = {
      gid: geometryRef.geometryExpressID,
      kind: EXTRUSION,
      color: [x, y, z, w],
      scale: this.getScaleHash(units),
      local: this.getLocalTransform(elementTransform, transformWithoutScale),
    };

    let data = this._extrusions.get(record.gid);
    if (data === undefined && this._known?.extrusion(record.gid)) return record;
    if (data === undefined) {
      const extrusion = this.buildExtrusion(geometryRef, units);
      data = extrusion ? this._batch.extrusions.push(extrusion) - 1 : -1;
      this._extrusions.set(record.gid, data);
    }
    record.data = data;
    return record;
  }

  private buildExtrusion(
    geometryRef: WEBIFC.PlacedGeometry,
    units: THREE.Vector3,
  ): CircleExtrusionData | null {
    const geometry = this._api.GetGeometry(
      this._modelID,
      geometryRef.geometryExpressID,
    );

    try {
      // @ts-ignore
      const circleExtrusion = geometry.GetSweptDiskSolid();
      const circleCurves: number[][] = [];
      const axisPoints: any[][] = [];

      // @ts-ignore
      const axisSize = circleExtrusion.axis.size();

      for (let i = 0; i < axisSize; i++) {
        // @ts-ignore
        const axis = circleExtrusion.axis.get(i);

        const circleCurveTemp: number[] = [];
        for (let j = 0; j < axis.arcSegments.size(); j++) {
          circleCurveTemp.push(axis.arcSegments.get(j));
        }
        circleCurves.push(circleCurveTemp);
        const axisTemp: any[] = [];
        for (let j = 0; j < axis.points.size(); j++) {
          const p = axis.points.get(j);
          axisTemp.push({
            x: p.x * units.x,
            y: p.y * units.y,
            z: p.z * units.z,
          });
        }
        axisPoints.push(axisTemp);
      }

      // Now we create serialized circle curve data

      const indicesArray: number[] = [];
      const typesArray: number[] = [];
      const segments: number[][] = [];
      const circleCurveData: number[][] = [];

      for (let i = 0; i < axisPoints.length; i++) {
        const axisPointsList: any[] = axisPoints[i];
        const curves: number[] = circleCurves[i];
        const pointsSize = axisPointsList.length;
        for (let j = 0; j < pointsSize - 1; j++) {
          let startCircleCurve = -1;
          let endCircleCurve = -1;
          for (let k = 0; k < curves.length; k += 2) {
            if (curves[k] === j) {
              startCircleCurve = j;
              endCircleCurve = curves[k + 1];
              break;
            }
          }
          if (startCircleCurve === -1) {
            const newSegment: number[] = [];
            const currentPoint = axisPointsList[j];
            const nextPoint = axisPointsList[j + 1];
            indicesArray.push(segments.length);
            newSegment.push(
              currentPoint.x,
              currentPoint.y,
              currentPoint.z,
              nextPoint.x,
              nextPoint.y,
              nextPoint.z,
            );
            segments.push(newSegment);
            typesArray.push(TFB.AxisPartClass.WIRE);
          } else {
            const newCircleCurve: number[] = [];
            const firstPointIndex = startCircleCurve;
            const midPointIndex = Math.round(
              (startCircleCurve + endCircleCurve) / 2,
            );
            const lastPointIndex = endCircleCurve;
            const point1 = axisPointsList[firstPointIndex];
            const point2 = axisPointsList[midPointIndex];
            const point3 = axisPointsList[lastPointIndex];
            const circleCurveProperties = this.computeCircleCurveProperties(
              point1,
              point2,
              point3,
            );
            const dx = point1.x - circleCurveProperties.center.x;
            const dy = point1.y - circleCurveProperties.center.y;
            const dz = point1.z - circleCurveProperties.center.z;
            let dd = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dd === 0) {
              dd = 1;
            }
            const dx1 = dx / dd;
            const dy1 = dy / dd;
            const dz1 = dz / dd;
            const dxb = point2.x - circleCurveProperties.center.x;
            const dyb = point2.y - circleCurveProperties.center.y;
            const dzb = point2.z - circleCurveProperties.center.z;
            let dd2 = Math.sqrt(dxb * dxb + dyb * dyb + dzb * dzb);
            if (dd2 === 0) {
              dd2 = 1;
            }
            const dx2 = dxb / dd2;
            const dy2 = dyb / dd2;
            const dz2 = dzb / dd2;
            let v3 = this.crossProduct(
              { x: dx1, y: dy1, z: dz1 },
              { x: dx2, y: dy2, z: dz2 },
            );
            dd = Math.sqrt(v3.x * v3.x + v3.y * v3.y + v3.z * v3.z);
            if (dd === 0) {
              dd = 1;
            }
            v3 = { x: v3.x / dd, y: v3.y / dd, z: v3.z / dd };
            indicesArray.push(circleCurveData.length);
            newCircleCurve.push(
              circleCurveProperties.center.x,
              circleCurveProperties.center.y,
              circleCurveProperties.center.z,
              circleCurveProperties.radius,
              circleCurveProperties.angle,
              dx1,
              dy1,
              dz1,
              v3.x,
              v3.y,
              v3.z,
            );
            circleCurveData.push(newCircleCurve);
            typesArray.push(TFB.AxisPartClass.CIRCLE_CURVE);
            j = lastPointIndex - 1;
          }
        }
      }

      // TODO: Deduplicate the bars with a geometry hash, like with shells

      const buffers = this.getGeometryBuffers(geometryRef);
      if (buffers === null) return null;

      const { position } = buffers;

      for (let i = 0; i < position.length - 2; i += 3) {
        position[i] *= units.x;
        position[i + 1] *= units.y;
        position[i + 2] *= units.z;
      }

      const bbox = GeomsFbUtils.getAABB(position);

      // TODO: This might fail? What units should we use?
      const radius = circleExtrusion.profileRadius * units.x;

      return {
        type: TFB.RepresentationClass.CIRCLE_EXTRUSION,
        indicesArray,
        typesArray,
        segments,
        circleCurveData,
        radius,
        bbox,
      };
    } finally {
      geometry.delete();
    }
  }

  private getScaleHash(units: THREE.Vector3) {
    return `${units.x}-${units.y}-${units.z}`;
  }

  /**
   * The geometry's transform relative to its element's, rounded as it is
   * stored, or null when that is the identity.
   */
  private getLocalTransform(
    elementTransform: number[],
    transformWithoutScale: THREE.Matrix4,
  ): number[] | null {
    this._tempObject1.position.set(0, 0, 0);
    this._tempObject1.rotation.set(0, 0, 0);
    this._tempObject1.scale.set(1, 1, 1);
    this._tempObject1.updateMatrix();
    this._tempMatrix1.fromArray(elementTransform);
    this._tempObject1.applyMatrix4(this._tempMatrix1);

    this._tempObject2.position.set(0, 0, 0);
    this._tempObject2.rotation.set(0, 0, 0);
    this._tempObject2.scale.set(1, 1, 1);
    this._tempObject2.updateMatrix();
    this._tempObject2.applyMatrix4(transformWithoutScale);

    this._tempObject1.attach(this._tempObject2);

    const { px, py, pz, dxx, dxy, dxz, dyx, dyy, dyz } = this.decompose(
      this._tempObject2.matrix,
    );

    this._tempObject2.removeFromParent();

    // prettier-ignore
    const isOrigin = px === 0 && py === 0 && pz === 0 &&
    dxx === 1 && dxy === 0 && dxz === 0 &&
    dyx === 0 && dyy === 1 && dyz === 0;

    return isOrigin ? null : [px, py, pz, dxx, dxy, dxz, dyx, dyy, dyz];
  }

  private removeScale(elements: number[]) {
    const matrix = new THREE.Matrix4().fromArray(elements);
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    matrix.decompose(position, quaternion, scale);

    // To convert models to meters

    const units = scale;

    const transformWithoutScale = new THREE.Matrix4();
    transformWithoutScale.compose(
      position,
      quaternion,
      new THREE.Vector3(1, 1, 1),
    );

    return { units, transformWithoutScale };
  }

  decompose(transform: THREE.Matrix4) {
    const p = 1000;
    const ap = 100000;
    const dxx = GeomsFbUtils.round(transform.elements[0], p);
    const dxy = GeomsFbUtils.round(transform.elements[1], p);
    const dxz = GeomsFbUtils.round(transform.elements[2], p);
    const dyx = GeomsFbUtils.round(transform.elements[4], ap);
    const dyy = GeomsFbUtils.round(transform.elements[5], ap);
    const dyz = GeomsFbUtils.round(transform.elements[6], ap);
    const dzx = GeomsFbUtils.round(transform.elements[8], ap);
    const dzy = GeomsFbUtils.round(transform.elements[9], ap);
    const dzz = GeomsFbUtils.round(transform.elements[10], ap);
    const px = GeomsFbUtils.round(transform.elements[12], ap);
    const py = GeomsFbUtils.round(transform.elements[13], ap);
    const pz = GeomsFbUtils.round(transform.elements[14], ap);
    return { dxx, dxy, dxz, dyx, dyy, dyz, dzx, dzy, dzz, px, py, pz };
  }

  // https://stackoverflow.com/a/1568551
  private getVolume(index: Uint32Array, pos: Float32Array) {
    let volume = 0;
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    const p3 = new THREE.Vector3();

    for (let i = 0; i < index.length - 2; i += 3) {
      const i1 = index[i] * 3;
      const i2 = index[i + 1] * 3;
      const i3 = index[i + 2] * 3;
      p1.set(pos[i1], pos[i1 + 1], pos[i1 + 2]);
      p2.set(pos[i2], pos[i2 + 1], pos[i2 + 2]);
      p3.set(pos[i3], pos[i3 + 1], pos[i3 + 2]);
      volume += this.getSignedVolumeOfTriangle(p1, p2, p3);
    }

    return Math.abs(volume);
  }

  private getSignedVolumeOfTriangle(
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    p3: THREE.Vector3,
  ) {
    const v321 = p3.x * p2.y * p1.z;
    const v231 = p2.x * p3.y * p1.z;
    const v312 = p3.x * p1.y * p2.z;
    const v132 = p1.x * p3.y * p2.z;
    const v213 = p2.x * p1.y * p3.z;
    const v123 = p1.x * p2.y * p3.z;
    return (1.0 / 6.0) * (-v321 + v231 + v312 - v132 - v213 + v123);
  }

  private getGeometryBuffers(geometryRef: WEBIFC.PlacedGeometry) {
    const geometry = this._api.GetGeometry(
      this._modelID,
      geometryRef.geometryExpressID,
    );

    const index = this._api.GetIndexArray(
      geometry.GetIndexData(),
      geometry.GetIndexDataSize(),
    ) as Uint32Array;

    const vertexData = this._api.GetVertexArray(
      geometry.GetVertexData(),
      geometry.GetVertexDataSize(),
    ) as Float32Array;

    if (index.length === 0 || vertexData.length === 0) {
      geometry.delete();
      return null;
    }

    const position = new Float32Array(vertexData.length / 2);
    const normals = new Float32Array(vertexData.length / 2);

    for (let i = 0; i < vertexData.length; i += 6) {
      position[i / 2] = vertexData[i];
      position[i / 2 + 1] = vertexData[i + 1];
      position[i / 2 + 2] = vertexData[i + 2];

      normals[i / 2] = vertexData[i + 3];
      normals[i / 2 + 1] = vertexData[i + 4];
      normals[i / 2 + 2] = vertexData[i + 5];
    }

    geometry.delete();

    return { position, normals, index };
  }

  // Function to compute cross product
  private crossProduct(v1: any, v2: any): any {
    return {
      x: v1.y * v2.z - v1.z * v2.y,
      y: v1.z * v2.x - v1.x * v2.z,
      z: v1.x * v2.y - v1.y * v2.x,
    };
  }

  private computeCircleCurveProperties(point1: any, point2: any, point3: any) {
    function computeCircleCenter(point1: any, point2: any, point3: any): any {
      // Compute D21 = P2 - P1
      const D21x = point2.x - point1.x;
      const D21y = point2.y - point1.y;
      const D21z = point2.z - point1.z;

      // Compute D31 = P3 - P1
      const D31x = point3.x - point1.x;
      const D31y = point3.y - point1.y;
      const D31z = point3.z - point1.z;

      // Compute F2 and F3
      const F2 = 0.5 * (D21x ** 2 + D21y ** 2 + D21z ** 2);
      const F3 = 0.5 * (D31x ** 2 + D31y ** 2 + D31z ** 2);

      // Compute cross products M23xy, M23yz, M23xz
      const M23xy = D21x * D31y - D21y * D31x;
      const M23yz = D21y * D31z - D21z * D31y;
      const M23xz = D21z * D31x - D21x * D31z;

      // Compute F23 components
      const F23x = F2 * D31x - F3 * D21x;
      const F23y = F2 * D31y - F3 * D21y;
      const F23z = F2 * D31z - F3 * D21z;

      // Compute denominator (magnitude squared of M23 vector)
      const m23magsq = M23xy ** 2 + M23yz ** 2 + M23xz ** 2;

      if (m23magsq === 0) {
        throw new Error(
          "Fragments: Points are collinear, no unique circle exists.",
        );
      }

      // Compute the center (Cx, Cy, Cz)
      const Cx = point1.x + (M23xy * F23y - M23xz * F23z) / m23magsq;
      const Cy = point1.y + (M23yz * F23z - M23xy * F23x) / m23magsq;
      const Cz = point1.z + (M23xz * F23x - M23yz * F23y) / m23magsq;

      return { x: Cx, y: Cy, z: Cz };
    }

    // Function to compute vector subtraction
    function subtract(p1: any, p2: any): any {
      return { x: p1.x - p2.x, y: p1.y - p2.y, z: p1.z - p2.z };
    }

    // Function to compute vector length
    function length(v: any): number {
      return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    }

    // Direction vectors of the segments
    const dirAB = subtract(point2, point1);
    const dirBC = subtract(point3, point2);

    // Normal to the plane
    const normal = this.crossProduct(dirAB, dirBC);
    const center = computeCircleCenter(point1, point2, point3);

    const dirAcen = subtract(point1, center);
    const dirBcen = subtract(point3, center);

    // Compute radius
    const radius = length(subtract(center, point1));

    // Compute initial tangent (direction from center to first point)
    const initialTangent = subtract(point1, center);
    const tangentMagnitude = length(initialTangent);
    initialTangent.x /= tangentMagnitude;
    initialTangent.y /= tangentMagnitude;
    initialTangent.z /= tangentMagnitude;

    // Compute angle subtended by circle curve. Guard two degenerate cases:
    //   1. length(dirAcen) or length(dirBcen) === 0 (point coincides with
    //      center) → division by zero yields Infinity → acos returns NaN.
    //   2. floating-point precision pushes the cosine slightly outside
    //      [-1, 1] on tight arcs → acos returns NaN.
    // Either would write NaN as aperture to the flatbuffer and crash the
    // circle-extrusion constructor downstream.
    const lenA = length(dirAcen);
    const lenB = length(dirBcen);
    const denom = lenA * lenB;
    const rawCos =
      denom === 0
        ? 1
        : (dirAcen.x * dirBcen.x +
            dirAcen.y * dirBcen.y +
            dirAcen.z * dirBcen.z) /
          denom;
    const cos = Math.max(-1, Math.min(1, rawCos));
    const angle = Math.acos(cos);

    return {
      center,
      radius,
      normal,
      initialTangent,
      angle: (angle * 180) / Math.PI, // Convert to degrees
    };
  }

  private hasSweptDiskDirectrix(mesh: any, geometryIndex: number): boolean {
    try {
      const geometryRef = mesh.geometries.get(geometryIndex);
      if (!geometryRef) return false;

      const geometry = this._api.GetGeometry(
        this._modelID,
        geometryRef.geometryExpressID,
      );

      try {
        if (!geometry?.GetSweptDiskSolid) return false;
        const swept = geometry.GetSweptDiskSolid();
        // @ts-ignore
        return !!swept?.axis && swept.axis.size() > 0;
      } finally {
        (geometry as unknown as EmbindHandle | undefined)?.delete();
      }
    } catch {
      return false;
    }
  }
}

export type { EncodedShell };
