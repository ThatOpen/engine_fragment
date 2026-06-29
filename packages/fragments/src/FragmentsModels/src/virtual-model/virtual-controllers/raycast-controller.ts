import * as THREE from "three";
import { CurrentLod, SnappingClass } from "../../model/model-types";
import { VirtualBoxController } from "../../bounding-boxes";
import { VirtualTilesController, VirtualMeshManager } from "..";
import {
  TransformHelper,
  CameraUtils,
  PlanesUtils,
  MiscHelper,
} from "../../utils";
import { Representation, Sample, Model, Meshes } from "../../../../Schema";
import { ItemConfigController } from "./item-config-controller";

type CastData = {
  ray: THREE.Ray;
  frustum: THREE.Frustum;
  planes: THREE.Plane[];
  snap?: SnappingClass;
  returnAll?: boolean;
};

type Snap = SnappingClass;

export class RaycastController {
  private readonly _meshes: Meshes;
  private readonly _model: Model;
  private readonly _boxes: VirtualBoxController;
  private readonly _tiles: VirtualTilesController;
  private readonly _items: ItemConfigController;
  private readonly _edgeThreshold = 8;
  private readonly _raycastMultiplier = 32;
  private readonly _maxDuration = 512;
  private readonly _precission = 0.001;
  private readonly _temp = {
    sample: new Sample(),
    representation: new Representation(),
    tempPlane: new THREE.Plane(),
    ray: new THREE.Ray(),
    frustum: new THREE.Frustum(),
    m1: new THREE.Matrix4(),
    m2: new THREE.Matrix4(),
    m3: new THREE.Matrix4(),
    v1: new THREE.Vector3(),
    planes: [] as THREE.Plane[],
  };

  constructor(
    model: Model,
    boxes: VirtualBoxController,
    tiles: VirtualTilesController,
    items: ItemConfigController,
  ) {
    this._model = model;
    this._boxes = boxes;
    this._tiles = tiles;
    this._items = items;
    this._meshes = model.meshes() as Meshes;
  }

  static cast(
    mesh: VirtualMeshManager,
    representation: Representation,
    ray: THREE.Ray,
    frustum: THREE.Frustum,
    snap?: SnappingClass,
  ) {
    const reprId = representation.id();

    if (snap === SnappingClass.FACE) {
      return mesh.faceRaycast(reprId, ray, frustum);
    }

    if (snap === SnappingClass.LINE) {
      return mesh.lineRaycast(reprId, ray, frustum);
    }

    if (snap === SnappingClass.POINT) {
      return mesh.pointRaycast(reprId, ray, frustum);
    }

    if (snap === undefined) {
      return mesh.raycast(reprId, ray, frustum);
    }

    return undefined;
  }

  raycast(
    ray: THREE.Ray,
    frustum: THREE.Frustum,
    planes: THREE.Plane[],
    returnAll?: boolean,
  ) {
    const data: CastData = { ray, frustum, planes, returnAll };
    const ids = this.castBox(frustum, planes);
    if (ids.length) {
      return this.computeRaycastList(ids, data);
    }
    return null;
  }

  snapRaycast(
    ray: THREE.Ray,
    frustum: THREE.Frustum,
    snaps: Snap[],
    planes: THREE.Plane[],
  ) {
    const results: any[] = [];
    const data: CastData = { ray, frustum, planes };
    const first = this.raycast(ray, frustum, planes);
    if (!first) {
      return this.snapCastEdges(data, snaps);
    }

    this.getSnaps(first, data, snaps, results);
    if (!first.normal) {
      return results;
    }

    return this.filterOnFront(results);
  }

  rectangleRaycast(
    frustum: THREE.Frustum,
    planes: THREE.Plane[],
    fullyInside: boolean,
  ) {
    const lookup = this._boxes.lookup;
    if (!lookup) {
      return [];
    }
    // Always gather the touching superset (fullyInside=false). Both modes then
    // narrow-phase on real geometry: a concave item can be fully inside the
    // selection even when its AABB is not, and can have its AABB touch the
    // selection while no geometry does. The broad-phase box test alone is wrong
    // for both.
    const itemIds = lookup.collideFrustum(planes, frustum, false);
    let raycastedItemIds = this.filterVisible(itemIds);
    if (raycastedItemIds.length) {
      raycastedItemIds = this.narrowPhaseFrustum(
        raycastedItemIds,
        frustum,
        planes,
        fullyInside,
      );
    }
    return this.localIdsFromItemIds(raycastedItemIds);
  }

  // Filters broad-phase sample candidates by testing their real geometry
  // against the selection frustum (+ clipping planes). Mirrors the section/clip
  // generator: builds a transient BVH per representation (cached for this call)
  // and shapecasts it; the frustum is moved into each sample's local space so
  // instanced items that share one local geometry are handled by transform.
  // fullyInside === true keeps only items whose geometry is entirely inside;
  // false keeps items whose geometry touches the selection.
  private narrowPhaseFrustum(
    sampleIds: number[],
    frustum: THREE.Frustum,
    clipPlanes: THREE.Plane[],
    fullyInside: boolean,
  ): number[] {
    const worldPlanes =
      clipPlanes && clipPlanes.length
        ? [...frustum.planes, ...clipPlanes]
        : frustum.planes;
    const geomCache = new Map<number, THREE.BufferGeometry[]>();
    const result: number[] = [];
    const start = performance.now();
    let exceeded = false;

    for (const sampleId of sampleIds) {
      // If we run out of time budget, keep the remaining broad-phase results
      // rather than dropping them (over-select beats losing a selection).
      if (exceeded) {
        result.push(sampleId);
        continue;
      }
      const box = this._boxes.get(sampleId);
      // Fast accept: AABB fully inside the selection volume => all geometry is
      // inside too, so it is selected in both modes.
      if (CameraUtils.isIncluded(box, worldPlanes)) {
        result.push(sampleId);
        continue;
      }
      if (
        this.sampleMatchesFrustum(
          sampleId,
          frustum,
          clipPlanes,
          fullyInside,
          geomCache,
        )
      ) {
        result.push(sampleId);
      }
      exceeded = this.isTimeExceeded(start);
    }

    for (const [, geometries] of geomCache) {
      for (const geometry of geometries) {
        // @ts-ignore three-mesh-bvh prototype augmentation
        geometry.disposeBoundsTree?.();
        geometry.dispose();
      }
    }
    return result;
  }

  private sampleMatchesFrustum(
    sampleId: number,
    frustum: THREE.Frustum,
    clipPlanes: THREE.Plane[],
    fullyInside: boolean,
    geomCache: Map<number, THREE.BufferGeometry[]>,
  ): boolean {
    const sample = this._meshes.samples(sampleId, this._temp.sample);
    if (!sample) return !fullyInside;
    const reprId = sample.representation();

    // Resolve the sample's world transform before building geometry (the build
    // path reuses shared scratch state).
    TransformHelper.get(this._temp.sample, this._meshes, this._temp.m1);
    this._temp.m2.copy(this._temp.m1).invert();

    let geometries = geomCache.get(reprId);
    if (!geometries) {
      geometries = this.buildSampleGeometries(sampleId);
      geomCache.set(reprId, geometries);
    }
    // No triangle geometry (e.g. curve-only representations). For crossing keep
    // the broad-phase result; for window we cannot confirm full containment, so
    // drop it rather than over-select.
    if (geometries.length === 0) return !fullyInside;

    const localPlanes = this.toLocalPlanes(frustum, clipPlanes, this._temp.m2);

    if (fullyInside) {
      // Window: every vertex must be inside the frustum (exact for a convex
      // frustum, since all geometry is a convex combination of its vertices).
      for (const geometry of geometries) {
        if (!this.geometryFullyInside(geometry, localPlanes)) {
          return false;
        }
      }
      return true;
    }

    // Crossing: any triangle intersecting the frustum is enough.
    for (const geometry of geometries) {
      if (this.geometryIntersectsPlanes(geometry, localPlanes)) {
        return true;
      }
    }
    return false;
  }

  // True only if every vertex of the geometry is inside every plane.
  private geometryFullyInside(
    geometry: THREE.BufferGeometry,
    planes: THREE.Plane[],
  ): boolean {
    const position = geometry.getAttribute("position");
    const array = position.array as ArrayLike<number>;
    const vertex = this._temp.v1;
    for (let i = 0; i < array.length; i += 3) {
      vertex.set(array[i], array[i + 1], array[i + 2]);
      for (const plane of planes) {
        if (plane.distanceToPoint(vertex) < 0) {
          return false;
        }
      }
    }
    return true;
  }

  private buildSampleGeometries(sampleId: number): THREE.BufferGeometry[] {
    const geometries: THREE.BufferGeometry[] = [];
    const sampleGeom = this._tiles.fetchSample(sampleId, CurrentLod.GEOMETRY);
    MiscHelper.forEach(sampleGeom.geometries, (geometryData: any) => {
      if (!geometryData.indexBuffer || !geometryData.positionBuffer) {
        return;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setIndex(Array.from(geometryData.indexBuffer));
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(geometryData.positionBuffer, 3),
      );
      // @ts-ignore three-mesh-bvh prototype augmentation
      geometry.computeBoundsTree();
      geometries.push(geometry);
    });
    return geometries;
  }

  private toLocalPlanes(
    frustum: THREE.Frustum,
    clipPlanes: THREE.Plane[],
    toLocal: THREE.Matrix4,
  ): THREE.Plane[] {
    const local: THREE.Plane[] = [];
    this.pushLocalPlanes(frustum.planes, toLocal, local);
    if (clipPlanes) {
      this.pushLocalPlanes(clipPlanes, toLocal, local);
    }
    return local;
  }

  private pushLocalPlanes(
    planes: THREE.Plane[],
    toLocal: THREE.Matrix4,
    out: THREE.Plane[],
  ): void {
    for (const plane of planes) {
      // The perspective selection frustum's far plane has constant = Infinity
      // (it extends to infinity). Transforming it produces a NaN plane (its
      // coplanar point is at infinity), which would clip away everything. It
      // constrains nothing, so skip any non-finite plane.
      if (!Number.isFinite(plane.constant)) {
        continue;
      }
      out.push(new THREE.Plane().copy(plane).applyMatrix4(toLocal));
    }
  }

  private geometryIntersectsPlanes(
    geometry: THREE.BufferGeometry,
    planes: THREE.Plane[],
  ): boolean {
    let hit = false;
    // @ts-ignore three-mesh-bvh prototype augmentation
    geometry.boundsTree.shapecast({
      intersectsBounds: (box: THREE.Box3) => CameraUtils.collides(box, planes),
      intersectsTriangle: (tri: THREE.Triangle) => {
        if (this.triangleIntersectsFrustum(tri, planes)) {
          hit = true;
          return true; // stop traversal on first intersecting triangle
        }
        return false;
      },
    });
    return hit;
  }

  // Exact triangle-vs-frustum test by clipping. The frustum is the intersection
  // of its plane half-spaces, so clipping the triangle polygon against every
  // plane (Sutherland-Hodgman) yields exactly triangle ∩ frustum. Non-empty
  // result means they really intersect. This avoids the false positives a
  // "not fully outside any single plane" test gives on large triangles.
  private triangleIntersectsFrustum(
    tri: THREE.Triangle,
    planes: THREE.Plane[],
  ): boolean {
    let poly: THREE.Vector3[] = [tri.a, tri.b, tri.c];
    for (const plane of planes) {
      poly = this.clipPolygonByPlane(poly, plane);
      if (poly.length === 0) {
        return false;
      }
    }
    return poly.length > 0;
  }

  // Clips a convex polygon to the inside (distance >= 0) half-space of a plane.
  private clipPolygonByPlane(
    poly: THREE.Vector3[],
    plane: THREE.Plane,
  ): THREE.Vector3[] {
    const out: THREE.Vector3[] = [];
    const count = poly.length;
    for (let i = 0; i < count; i++) {
      const current = poly[i];
      const next = poly[(i + 1) % count];
      const dCurrent = plane.distanceToPoint(current);
      const dNext = plane.distanceToPoint(next);
      if (dCurrent >= 0) {
        out.push(current);
      }
      // Edge crosses the plane: add the intersection point.
      if (dCurrent >= 0 !== dNext >= 0) {
        const t = dCurrent / (dCurrent - dNext);
        out.push(new THREE.Vector3().lerpVectors(current, next, t));
      }
    }
    return out;
  }

  private snapCastEdges(data: CastData, snaps: Snap[]) {
    const results: any[] = [];
    const pointSnap = snaps.includes(SnappingClass.POINT);
    const lineSnap = snaps.includes(SnappingClass.LINE);
    if (pointSnap || lineSnap) {
      this.computeEdgesCast(data, snaps, results);
    }
    this.addDistanceToEdgeResult(results, data.ray);
    return results;
  }

  private filterVisible(ids: number[]) {
    const result: number[] = [];
    for (const id of ids) {
      this._meshes.samples(id, this._temp.sample);
      const itemId = this._temp.sample.item();
      const sampleVisible = this._items.visible(itemId);
      if (sampleVisible) {
        result.push(id);
      }
    }
    return result;
  }

  private computeSnaps(
    snaps: Snap[],
    data: CastData,
    id: number,
    results: any[],
  ) {
    for (const snapClass of snaps) {
      const isValidSnap = this.isValidSnap(snapClass);
      if (isValidSnap) {
        const castData = { snap: snapClass, ...data };
        const founds = this.castSample(id, castData);
        for (const found of founds) {
          results.push(found);
        }
      }
    }
  }

  private computeEdgesCast(data: CastData, snaps: Snap[], results: any[]) {
    const raw = this.getRawEdges(data);
    const start = performance.now();
    for (const sample of raw) {
      this.fetchSampleData(sample);
      this.computeSnaps(snaps, data, sample, results);
      const tooMuchTime = this.isTimeExceeded(start);
      if (tooMuchTime) {
        break;
      }
    }
  }

  private addDistanceToEdgeResult(input: any[], ray: THREE.Ray) {
    for (const result of input) {
      const point = result.point;
      result.raySquaredDistance = ray.distanceSqToPoint(point);
    }
  }

  private getRawEdges(data: CastData) {
    const result = this.castBox(data.frustum, data.planes);
    if (result.length <= this._edgeThreshold) {
      return result;
    }
    return this.sortBoxes(data.ray, result, this._edgeThreshold);
  }

  private sortBoxes(ray: THREE.Ray, boxes: number[], limit?: number): number[] {
    const result: number[] = [];
    const tempVector = new THREE.Vector3();
    const origin = ray.origin;

    for (let i = 0; i < boxes.length; i++) {
      const boxId = boxes[i];
      const box = this._boxes.get(boxId);
      ray.intersectBox(box, tempVector);
      const distance = tempVector.distanceToSquared(origin);
      result.push(distance);
    }

    const sortedResult = this.dataSort(boxes, result);
    const limitExceeded = limit && sortedResult.length > limit;
    if (limitExceeded) {
      sortedResult.splice(limit);
    }
    return sortedResult;
  }

  private castBox(input: THREE.Ray | THREE.Frustum, planes: THREE.Plane[]) {
    const lookup = this._boxes.lookup;
    if (!lookup) {
      return [];
    }
    if (input instanceof THREE.Ray) {
      const result = lookup.collideRay(planes, input);
      return this.filterVisible(result);
    }
    const result = lookup.collideFrustum(planes, input);
    return this.filterVisible(result);
  }

  private dataSort(ids: number[], data: number[]) {
    const keys = Array.from(ids.keys());
    const sortedKeys = keys.sort((a, b) => data[a] - data[b]);
    const result: number[] = [];
    for (const key of sortedKeys) {
      const found = ids[key];
      result.push(found);
    }
    return result;
  }

  private localIdsFromItemIds(raycastedItemIds: number[]) {
    const localIds = new Set<number>();
    for (const id of raycastedItemIds) {
      this._meshes.samples(id, this._temp.sample);
      const itemId = this._temp.sample.item();
      const localIdIndex = this._meshes.meshesItems(itemId);
      if (localIdIndex === null) continue;
      const localId = this._model.localIds(localIdIndex);
      if (localId === null) continue;
      localIds.add(localId);
    }
    return Array.from(localIds);
  }

  private getNearest(hits: any[]) {
    let nearest = hits[0];
    for (let i = 1; i < hits.length; i++) {
      const current = hits[i];
      if (nearest.raySquaredDistance && current.raySquaredDistance) {
        const nearestScore = this.getNearScore(nearest);
        const currentScore = this.getNearScore(current);
        if (currentScore < nearestScore) {
          nearest = current;
        }
      } else if (
        current.cameraSquaredDistance < nearest.cameraSquaredDistance
      ) {
        nearest = current;
      }
    }
    return nearest;
  }

  private getEdges(data: CastData, snaps: Snap[], results: any[]) {
    const founds = this.snapCastEdges(data, snaps);
    if (founds) {
      for (const found of founds) {
        results.push(found);
      }
    }
  }

  private getNearScore(input: any) {
    const factor = this._raycastMultiplier;
    const nearestRay = input.raySquaredDistance * factor;
    const nearScore = nearestRay + input.cameraSquaredDistance;
    return nearScore;
  }

  private setupSampleCastData(data: CastData) {
    TransformHelper.get(this._temp.sample, this._meshes, this._temp.m1);
    this._temp.m2.copy(this._temp.m1).invert();
    this._temp.ray.copy(data.ray).applyMatrix4(this._temp.m2);
    CameraUtils.transform(data.frustum, this._temp.m2, this._temp.frustum);
  }

  private addLocalId(raycast: any) {
    if (!raycast) {
      return;
    }
    const localIdIndex = this._meshes.meshesItems(raycast.itemId);
    if (localIdIndex === null) {
      return;
    }
    raycast.localId = this._model.localIds(localIdIndex);
  }

  private fetchSampleData(sampleId: number) {
    this._meshes.samples(sampleId, this._temp.sample);
    const reprId = this._temp.sample.representation();
    this._meshes.representations(reprId, this._temp.representation);
  }

  private computeRaycastList(ids: number[], data: CastData) {
    const uniqueIds = Array.from(new Set(ids));
    const sorted = this.sortBoxes(data.ray, uniqueIds);
    const byRay = this.castBox(data.ray, data.planes);
    const results = this.findAll(sorted, byRay, data);
    if (results.length) {
      if (data.returnAll) {
        for (const result of results) {
          this.addLocalId(result);
        }
        return results;
      }
      const result = this.getNearest(results);
      this.addLocalId(result);
      return result;
    }
    return null;
  }

  private formatRaycastResult(results: any[], id: number, data: CastData) {
    for (const result of results) {
      result.point.applyMatrix4(this._temp.m1);

      if (result.normal) {
        result.normal.transformDirection(this._temp.m1);
      }

      if ("facePoints" in result) {
        const sample = this._meshes.samples(id, this._temp.sample)!;
        TransformHelper.get(sample, this._meshes, this._temp.m3);
        const sourceFacePoints = result.facePoints;
        const transformedFacePoints = new Float64Array(sourceFacePoints.length);
        for (let i = 0; i < sourceFacePoints.length; i += 3) {
          const x = sourceFacePoints[i];
          const y = sourceFacePoints[i + 1];
          const z = sourceFacePoints[i + 2];
          this._temp.v1.set(x, y, z);
          this._temp.v1.applyMatrix4(this._temp.m3);
          transformedFacePoints[i] = this._temp.v1.x;
          transformedFacePoints[i + 1] = this._temp.v1.y;
          transformedFacePoints[i + 2] = this._temp.v1.z;
        }
        result.facePoints = transformedFacePoints;
      }

      result.sampleId = id;
      result.itemId = this._temp.sample.item();
      const distance = data.ray.origin.distanceToSquared(result.point);
      result.cameraSquaredDistance = distance;

      if (!result.snappingClass) {
        result.snappingClass = data.snap;
      }

      if (result.snappedEdgeP1) {
        result.snappedEdgeP1.applyMatrix4(this._temp.m1);
      }

      if (result.snappedEdgeP2) {
        result.snappedEdgeP2.applyMatrix4(this._temp.m1);
      }
    }
  }

  private findAll(sortedIds: number[], byRay: number[], data: CastData) {
    const allResults: any[] = [];
    const start = performance.now();
    for (const sample of sortedIds) {
      this.fetchSampleData(sample);
      if (!byRay.includes(sample)) {
        continue;
      }

      const results = this.castSample(sample, data);
      for (const raycasted of results) {
        allResults.push(raycasted);
      }

      const tooMuchTime = this.isTimeExceeded(start);
      if (tooMuchTime) {
        break;
      }
    }
    return allResults;
  }

  private isTimeExceeded(start: number) {
    const finish = performance.now();
    const duration = finish - start;
    return duration > this._maxDuration;
  }

  private getFilteredSampleCast(data: CastData) {
    const rawResult = this._tiles.raycast(
      this._temp.representation,
      this._temp.ray,
      this._temp.frustum,
      data.snap,
    );

    if (this._temp.planes.length === 0) {
      return rawResult;
    }

    const filteredResult: any[] = [];
    if (rawResult) {
      for (const result of rawResult) {
        const planes = this._temp.planes;
        const point = result.point;
        const contained = PlanesUtils.containedInParallelPlanes(planes, point);
        if (contained) {
          filteredResult.push(result);
        }
      }
    }

    return filteredResult;
  }

  private getSnaps(first: any, data: CastData, snaps: Snap[], results: any[]) {
    this.fetchSampleData(first.sampleId);
    if (first.normal) {
      this.setCastSide(first, data.ray);
      this.setCastPlane(first);
    }
    this.getFaces(snaps, data, first, results);
    this.getEdges(data, snaps, results);
    for (const found of results) {
      this.addLocalId(found);
    }
  }

  private filterOnFront(results: any[]) {
    const resultsOnFront: any[] = [];
    for (const result of results) {
      const plane = this._temp.tempPlane;
      const distance = plane.distanceToPoint(result.point);
      const isInFront = distance >= 0;
      if (isInFront) {
        resultsOnFront.push(result);
      }
    }
    return resultsOnFront;
  }

  private setCastSide(input: any, ray: THREE.Ray) {
    const p1 = input.point.clone();
    const vec = p1.sub(ray.origin);
    const sameSide = input.normal.dot(vec) > 0;
    if (sameSide) {
      input.normal.negate();
    }
  }

  private getFaces(snaps: Snap[], data: CastData, first: any, results: any[]) {
    for (const snap of snaps) {
      const snapData: CastData = { snap, ...data };
      const founds = this.castSample(first.sampleId, snapData);
      for (const found of founds) {
        results.push(found);
      }
    }
  }

  private setCastPlane(input: any) {
    const plane = this._temp.tempPlane;
    const point = input.point.clone();
    const normal = input.normal.clone();
    normal.multiplyScalar(this._precission);
    point.sub(normal);
    plane.setFromNormalAndCoplanarPoint(input.normal, point);
  }

  private castSample(id: number, data: CastData) {
    this.setupSampleCastData(data);
    this.setupPlanesForSampleCast(data);
    const results = this.getFilteredSampleCast(data);
    if (results) {
      this.formatRaycastResult(results, id, data);
    }
    return results;
  }

  private isValidSnap(snapClass: SnappingClass) {
    const isLine = snapClass === SnappingClass.LINE;
    const isPoint = snapClass === SnappingClass.POINT;
    return isLine || isPoint;
  }

  private transform(planes: THREE.Plane[], transform: THREE.Matrix4) {
    const result: THREE.Plane[] = [];
    if (planes) {
      for (const plane of planes) {
        const clone = new THREE.Plane().copy(plane);
        clone.applyMatrix4(transform);
        result.push(clone);
      }
    }
    return result;
  }

  private setupPlanesForSampleCast(data: CastData) {
    this._temp.planes.length = 0;
    if (data.planes && data.planes.length > 0) {
      const tranformedPlanes = this.transform(data.planes, this._temp.m2);
      for (const plane of tranformedPlanes) {
        this._temp.planes.push(plane);
      }
    }
  }
}
