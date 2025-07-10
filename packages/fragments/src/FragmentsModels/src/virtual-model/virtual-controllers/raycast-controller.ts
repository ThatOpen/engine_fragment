import * as THREE from "three";
import { SnappingClass } from "../../model/model-types";
import { VirtualBoxController } from "../../bounding-boxes";
import { VirtualTilesController, VirtualMeshManager } from "..";
import { TransformHelper, CameraUtils, PlanesUtils } from "../../utils";
import { Representation, Sample, Model, Meshes } from "../../../../Schema";
import { ItemConfigController } from "./item-config-controller";

type CastData = {
  ray: THREE.Ray;
  frustum: THREE.Frustum;
  planes: THREE.Plane[];
  snap?: SnappingClass;
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

  raycast(ray: THREE.Ray, frustum: THREE.Frustum, planes: THREE.Plane[]) {
    const data: CastData = { ray, frustum, planes };
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
    const itemIds = lookup.collideFrustum(planes, frustum, fullyInside);
    const raycastedItemIds = this.filterVisible(itemIds);
    return this.localIdsFromItemIds(raycastedItemIds);
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
        for (let i = 0; i < result.facePoints.length; i += 3) {
          const x = result.facePoints[i];
          const y = result.facePoints[i + 1];
          const z = result.facePoints[i + 2];
          this._temp.v1.set(x, y, z);
          this._temp.v1.applyMatrix4(this._temp.m3);
          result.facePoints[i] = this._temp.v1.x;
          result.facePoints[i + 1] = this._temp.v1.y;
          result.facePoints[i + 2] = this._temp.v1.z;
        }
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
