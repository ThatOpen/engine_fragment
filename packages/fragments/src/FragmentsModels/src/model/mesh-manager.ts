import * as THREE from "three";
import { MaterialManager } from "./material-manager";
import {
  TileRequestClass,
  ObjectClass,
  CurrentLod,
  BIMMesh,
} from "./model-types";
import { FragmentsModel } from "./fragments-model";
import { DataMap } from "../../../Utils";
import { RequestsManager } from "./requests-manager";
import { LODManager } from "./lod-manager";
import { LODMesh } from "../lod";
import { MultithreadingHelper } from "../multithreading/multithreading-helper";

/**
 * A class that manages the creation and updating of meshes in a Fragments model.
 */
export class MeshManager {
  /**
   * A map of FragmentsModel instances by their model ID.
   */
  readonly list = new DataMap<string, FragmentsModel>();
  readonly materials = new MaterialManager();
  readonly lod = new LODManager(this.materials);
  readonly requests = new RequestsManager();

  private readonly updateThreshold = 4;

  /**
   * Highest seq stamped on any FINISH the worker has emitted to us
   * so far. Updated by `requests.onFinish`. Monotonically increases.
   * `forceUpdateFinish` waiters resolve once this catches up to their
   * snapshotted target seq.
   */
  private _lastSettledSeq = 0;

  /**
   * Pending fence resolvers from `forceUpdateFinish` callers.
   * Each entry's `targetSeq` is what the caller snapshotted at call
   * time; once `_lastSettledSeq >= targetSeq`, we drain the queue
   * to completion and resolve. Sorted insertion order isn't needed
   * — we walk the whole list on each FINISH.
   */
  private _fenceWaiters: { targetSeq: number; resolve: () => void }[] = [];

  private _onUpdate: () => void;

  constructor(onUpdate: () => void) {
    this._onUpdate = onUpdate;
    this.requests.onFinish = (seq) => this.handleFinish(seq);
  }

  /**
   * Wait until every main → worker request issued before this call
   * has been processed by the worker AND its resulting tile updates
   * have been applied on main. Replaces the old polling-based
   * implementation:
   *
   *   - **Old**: `setInterval` re-running `update()` every `rate` ms
   *     until a FINISH arrived, plus a `buffer` setTimeout guarding
   *     against false-positive FINISHes from prior batches. Floor of
   *     ~rate + buffer ms even when the worker had nothing to do.
   *   - **New**: snapshot the next dispatched seq, register a fence
   *     waiter, resolve the moment a FINISH stamped with `seq >=
   *     snapshot` lands and the request queue has been drained.
   *     Zero polling; precise per-call settlement.
   *
   * Called from `FragmentsModels.update(true)`.
   */
  async forceUpdateFinish() {
    const targetSeq = MultithreadingHelper.lastDispatchedSeq;
    // No outbound RPCs have been issued yet, or everything we've sent
    // has already settled — nothing to wait for. Drain whatever's in
    // the queue (may be empty) and return.
    if (this._lastSettledSeq >= targetSeq) {
      this.drainAll();
      return;
    }
    await new Promise<void>((resolve) => {
      this._fenceWaiters.push({ targetSeq, resolve });
    });
  }

  /**
   * Called by `RequestsManager` whenever a FINISH tile request lands
   * on main. The FINISH is stamped with the worker's `lastSeenSeq`
   * at emission time, which is also the highest RPC seq whose effects
   * are reflected in the batch carrying this FINISH.
   *
   * Walks the fence-waiter list and resolves any whose `targetSeq`
   * has now settled, draining the request queue first so the visual
   * effects are on screen by the time the awaiter wakes up.
   */
  private handleFinish(seq: number | undefined) {
    if (typeof seq === "number" && seq > this._lastSettledSeq) {
      this._lastSettledSeq = seq;
    }
    // Drain on every FINISH, whether or not anyone is awaiting a
    // fence. FINISH is the worker's "I'm done with this batch"
    // signal, which is exactly when we want to flush queued tile
    // UPDATEs to the renderer — without this, model-load CREATE
    // tiles, post-LOD UPDATEs, and similar would sit unread until
    // the next force-flush or interaction-driven `update()` call.
    // Bounded cost: FINISH only fires once per worker batch, not
    // per tile request, so this isn't a per-message ripple.
    this.drainAll();
    if (this._fenceWaiters.length === 0) return;
    const ready: (() => void)[] = [];
    const remaining: { targetSeq: number; resolve: () => void }[] = [];
    for (const w of this._fenceWaiters) {
      if (w.targetSeq <= this._lastSettledSeq) ready.push(w.resolve);
      else remaining.push(w);
    }
    if (ready.length === 0) return;
    this._fenceWaiters = remaining;
    for (const r of ready) r();
  }

  /**
   * Process every queued tile request without the per-frame
   * `updateThreshold` cap. Used by force-flush paths where the
   * caller is explicitly waiting for everything to settle —
   * spreading the work across many frames there would just delay
   * the visual.
   */
  private drainAll() {
    while (this.requests.arePending) {
      const request = this.requests.list.shift();
      if (!request) continue;
      this.processTileRequest(request);
      this._onUpdate();
    }
  }

  update() {
    const start = performance.now();
    while (this.requests.arePending) {
      const request = this.requests.list.shift();
      if (!request) continue;
      this.processTileRequest(request);
      this._onUpdate();
      if (performance.now() - start > this.updateThreshold) return;
    }
  }

  private setTileData(mesh: BIMMesh, request: any) {
    const { tileId, itemId, matrix, aabb } = request;
    this.setMeshData(mesh, tileId, itemId, matrix);
    this.setupBoundings(mesh, aabb);
    this.updateStatus(mesh, request);
  }

  private processTileRequest(request: any) {
    const { tileRequestClass, tileId, modelId } = request;
    const model = this.list.get(modelId);
    if (!model) return;
    if (tileRequestClass === TileRequestClass.CREATE) {
      if (request.objectClass === undefined) return;
      const tile = this.create(request);
      this.setTileData(tile, request);
      const uniqueIds = this.extractUniqueItemIds(request.itemIds);
      tile.userData.itemIds = uniqueIds;
      this.trackVisibleItems(model, uniqueIds, true);
      model.tiles.set(tile.userData.tileId, tile);
    } else if (tileRequestClass === TileRequestClass.DELETE) {
      const tile = model.tiles.get(tileId);
      if (tile?.userData.itemIds) {
        this.trackVisibleItems(model, tile.userData.itemIds, false);
      }
      model.tiles.delete(tileId);
    } else if (tileRequestClass === TileRequestClass.UPDATE) {
      const tileObject = model.tiles.get(tileId);
      if (tileObject) this.updateStatus(tileObject, request);
    } else if (tileRequestClass === TileRequestClass.FINISH) {
      model._finishProcessing();
    }
  }

  private extractUniqueItemIds(itemIds: any): Set<number> {
    const unique = new Set<number>();
    if (!itemIds) return unique;
    for (let i = 0; i < itemIds.length; i++) {
      unique.add(itemIds[i]);
    }
    return unique;
  }

  private trackVisibleItems(
    model: FragmentsModel,
    itemIds: Set<number>,
    added: boolean,
  ) {
    for (const itemId of itemIds) {
      if (added) {
        model.visibleItems.add(itemId);
      } else {
        model.visibleItems.delete(itemId);
      }
    }
  }

  private createMesh(request: any) {
    const { indices, positions, normals, itemIds, faceIds } = request;
    const geometry = new THREE.BufferGeometry();
    this.setIndex(geometry, indices);
    this.setPositions(positions, geometry);
    this.setNormals(normals, geometry);
    this.setItemIds(itemIds, geometry);
    this.setFaceIds(faceIds, geometry);
    const material = this.materials.getFromRequest(request);
    return new THREE.Mesh(geometry, [material]);
  }

  private setupBoundings(mesh: BIMMesh, aabb: any) {
    const { geometry } = mesh;
    const box = new THREE.Box3().copy(aabb);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    geometry.boundingBox = box;
    geometry.boundingSphere = sphere;
  }

  private create(request: any): BIMMesh {
    if (request.objectClass === ObjectClass.SHELL)
      return this.createMesh(request);
    if (request.objectClass === ObjectClass.LINE) {
      const geometry = new THREE.BufferGeometry();
      return this.lod.createMesh(geometry, request);
    }
    throw new Error(
      `Fragments: object class ${request.objectClass} is not supported.`,
    );
  }

  private updateStatus(mesh: BIMMesh, request: any) {
    const {
      tileData: { highlightData },
      currentLod,
    } = request;

    const { geometry } = mesh;
    geometry.clearGroups();
    this.lod.processMesh(mesh, request);

    if (!highlightData) return;

    if (currentLod === CurrentLod.WIRES) {
      this.lod.applyHighlight(mesh as LODMesh, request);
      return;
    }

    const materials = this.materials.createHighlights(mesh, request);
    mesh.material = materials;
  }

  private cleanAttributeMemory(geometry: THREE.BufferGeometry, name: string) {
    const attr = geometry.attributes[name] as THREE.BufferAttribute;
    attr.onUpload(this.deleteAttribute(geometry));
  }

  private setPositions(positions: any, geometry: THREE.BufferGeometry) {
    if (!positions) {
      throw new Error("Fragments: no positions provided to create the mesh.");
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.cleanAttributeMemory(geometry, "position");
  }

  private setFaceIds(faceIds: any, geometry: THREE.BufferGeometry) {
    if (faceIds) {
      geometry.setAttribute("color", new THREE.BufferAttribute(faceIds, 3));
      this.cleanAttributeMemory(geometry, "color");
    }
  }

  private setIndex(geometry: THREE.BufferGeometry, indices: any) {
    if (!indices) {
      throw new Error("Fragments: no indices provided to create the mesh.");
    }
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.index!.onUpload(this.deleteAttribute(geometry));
  }

  private setNormals(normals: any, geometry: THREE.BufferGeometry) {
    if (normals) {
      geometry.setAttribute(
        "normal",
        new THREE.BufferAttribute(normals, 3, true),
      );
    }
    this.cleanAttributeMemory(geometry, "normal");
  }

  private setItemIds(itemIds: any, geometry: THREE.BufferGeometry) {
    if (itemIds) {
      // 4 bytes per vertex (the four bytes of the localId, big-
      // endian). Bound as `vec4` so the picker shader can pass
      // them straight to `gl_FragColor` and decode the full uint32
      // at the readback step.
      geometry.setAttribute("id", new THREE.BufferAttribute(itemIds, 4, false));
      this.cleanAttributeMemory(geometry, "id");
    }
  }

  private deleteAttribute(_geometry: THREE.BufferGeometry) {
    function callback(this: any) {
      delete this.array;
    }
    return callback;
  }

  private setMeshData(mesh: BIMMesh, tileId: any, itemId: any, matrix: any) {
    mesh.userData = { tileId, itemId };
    mesh.matrixAutoUpdate = false;
    mesh.applyMatrix4(matrix);
    mesh.matrix.copy(matrix);
  }
}
