import * as THREE from "three";
import {
  Shell,
  ShellHole,
  ShellProfile,
  FloatVector,
  BigShellProfile,
  ShellType,
  BigShellHole,
} from "../../../../../Schema";
import { AnyTileData, TileData } from "../types";
import { DataSizes, PolygonSize, ShellHoleData } from "./types";
import { ShellUtils } from "./shell-utils";
import { limitOf2Bytes, ObjectClass } from "../../../model/model-types";
import { ShellFaceX } from "./shell-face-x";
import { ShellFace4 } from "./shell-face-4";
import { ShellFace3 } from "./shell-face-3";

export class ShellConstructor {
  private point = new FloatVector();
  private _shellHole = new ShellHole();
  private _bigShellHole = new BigShellHole();
  private interiorProfiles = new Map<number, ShellHoleData>();
  private normalsAvgInterior = new Int16Array();
  private _pointsPerProfile = new Map<number, number[]>();
  private _shellProfile = new ShellProfile();
  private _bigShellProfile = new BigShellProfile();
  private _normalsAvg = new Int16Array();
  private _normals: THREE.Vector3[] = [];
  private _indices = 0;
  private _sizes: DataSizes = {
    vertices: 0,
    indices: 0,
    verticesAmount: 0,
    normalsAmount: 0,
    normals: 0,
  };

  private _tileData!: TileData;
  private _faceIdPerProfile = new Map<number, number>();

  // Indices (into the bufferGeometries array passed to construct()) of
  // buffers this pass had to create on its own, because
  // ShellTemplateConstructor's own sizing pass didn't predict them - see
  // setTileData/createOverflowTileData. These need a real, exact
  // indexCount/positionCount/normalCount patched in once their
  // construction finishes (finalizeCurrentIfDynamic), unlike a normal
  // Pass-1-provided buffer, whose predicted counts are already exact and
  // must NOT be touched.
  private _dynamicTileIndices = new Set<number>();
  // The array index _tileData currently represents. NOT the same as
  // this._indices once nextBuffer's own trailing this._indices++ has run -
  // this._indices then already points at the NEXT buffer (or, on the
  // following nextBuffer() call, is read again before that call's own
  // setTileData reassigns things) - using this._indices directly in
  // finalizeCurrentIfDynamic would finalize (or fail to finalize) the
  // wrong buffer by one. Set only inside setTileData, exactly when
  // _tileData itself is (re)assigned, so the two never drift apart.
  private _currentTileIndex = 0;

  construct(shell: Shell, meshData: TileData | TileData[]) {
    this._dynamicTileIndices.clear();
    this.resetConstructData(meshData);
    this.getPointsPerWire(shell);
    const data = ShellUtils.getBuffer(shell);
    this.newShellInteriorProfiles(shell);
    this.constructShell(shell, data, meshData);
    this.finalizeCurrentIfDynamic();
    this._tileData = undefined as any;
  }

  // A buffer this pass created on its own (see createOverflowTileData) is
  // allocated at a safe UPPER BOUND (limitOf2Bytes), since its real final
  // size isn't known until its construction is complete - unlike a
  // Pass-1-provided buffer, whose exact size was already computed ahead of
  // time. Trim it down to the real counts this pass actually accumulated
  // (this._sizes, still holding THIS buffer's totals at the moment this is
  // called - right before switching to the next buffer, or right before
  // construct() returns) so downstream consumers that treat
  // indexCount/positionCount/normalCount as authoritative exact counts
  // (e.g. VirtualTilesController.setupTileSampleAttributes, which copies
  // exactly geometry.indexCount index entries into the merged render tile)
  // see the truth, not the allocation's own upper bound.
  private finalizeCurrentIfDynamic() {
    if (!this._tileData) return;
    if (!this._dynamicTileIndices.has(this._currentTileIndex)) return;
    const { indices, verticesAmount, normalsAmount } = this._sizes;
    const tile = this._tileData;
    if (tile.indexBuffer)
      tile.indexBuffer = tile.indexBuffer.subarray(0, indices);
    if (tile.positionBuffer)
      tile.positionBuffer = tile.positionBuffer.subarray(0, verticesAmount);
    if (tile.normalBuffer)
      tile.normalBuffer = tile.normalBuffer.subarray(0, normalsAmount);
    if (tile.faceIdBuffer)
      tile.faceIdBuffer = tile.faceIdBuffer.subarray(0, verticesAmount / 3);
    tile.indexCount = indices;
    tile.positionCount = verticesAmount;
    tile.normalCount = normalsAmount;
  }

  // ShellTemplateConstructor's own sizing pass predicts each buffer's
  // exact final size ahead of time by walking the same shell data with a
  // (deliberately simpler, point-count-based) formula - normally that
  // prediction is exact. If this pass's own real, per-vertex accounting
  // ever needs MORE buffers than were predicted (both formulas are meant
  // to agree, but nothing enforces that at the type level), the safe
  // fallback is to allocate one here rather than read past the end of the
  // predicted array (which silently returns undefined, crashing the very
  // next buffer-initialization call). Sized at limitOf2Bytes - the same
  // per-buffer cap the whole scheme targets, and specifically the format's
  // own hard ceiling for indexBuffer (a Uint16Array, capped at 65536
  // addressable vertex slots) - then trimmed to the real size in
  // finalizeCurrentIfDynamic once construction of this buffer completes.
  private createOverflowTileData(): TileData {
    return {
      objectClass: ObjectClass.SHELL,
      indexCount: limitOf2Bytes,
      positionCount: limitOf2Bytes * 3,
      normalCount: limitOf2Bytes * 3,
    } as TileData;
  }

  private getIntProfileNormalsAvg(shell: Shell, id: number) {
    const hole = this.getTempHole(shell);
    const indices = hole.indicesArray()!;
    this.normalsAvgInterior = ShellUtils.computeNormalsAvg(
      indices,
      id,
      this._normals,
      this._pointsPerProfile,
    );
  }

  private saveInteriorProfile(shell: Shell) {
    const hole = this.getTempHole(shell);
    const id = hole.profileId();
    if (this.interiorProfiles.has(id)) {
      this.saveExistingInteriorProfile(id);
      return id;
    }
    const data = this.getNewIntProfileData();
    this.interiorProfiles.set(id, data);
    return id;
  }

  private computeNormalsAvg(
    shell: Shell,
    indices: Uint16Array | Uint32Array,
    id: number,
  ) {
    const isShell = this.isShell(shell);
    if (!isShell) return;
    const n = this._normals;
    const ppp = this._pointsPerProfile;
    this._normalsAvg = ShellUtils.computeNormalsAvg(indices, id, n, ppp);
  }

  private isShell(shell: Shell) {
    return shell instanceof Shell;
  }

  private getPointsPerWire(shell: Shell) {
    const isShell = this.isShell(shell);
    if (!isShell) return;
    ShellUtils.getNormalsOfShellProfile(shell, this._normals);
    this._pointsPerProfile = ShellUtils.getPointsShell(shell);
  }

  private getIndices(shell: Shell, id: number) {
    const profile = this.getTempProfile(shell);
    ShellUtils.getProfile(shell, id, profile);
    return profile.indicesArray()!;
  }

  private resetConstructData(meshData: AnyTileData) {
    this._indices = 0;
    this._tileData = undefined as any;
    this.nextBuffer(meshData);
    this._normals.length = 0;
  }

  private initializeIndices() {
    const size = this._tileData.indexCount!;
    this._tileData.indexBuffer = new Uint16Array(size);
  }

  private constructFace4(
    indices: Uint16Array | Uint32Array,
    data: Float32Array,
    id: number,
  ) {
    const faceId = this._faceIdPerProfile.get(id)!;
    ShellFace4.create(
      indices,
      data,
      this._normalsAvg,
      id,
      this._tileData,
      this._sizes,
      faceId,
    );
  }

  private initializeSizes() {
    this._sizes.vertices = 0;
    this._sizes.indices = 0;
    this._sizes.verticesAmount = 0;
    this._sizes.normalsAmount = 0;
    this._sizes.normals = 0;
  }

  private getInteriorProfileBuffer(shell: Shell, intProfile: ShellHoleData) {
    const hole = this.getTempHole(shell);
    const count = hole.indicesLength();
    const isShell = this.isShell(shell);
    if (!isShell) return;
    for (let id = 0; id < count; id++) {
      this.getIntProfilePoints(id, shell, intProfile);
      this.getIntProfileNormals(intProfile, id);
    }
  }

  private constructProfile(
    id: number,
    shell: Shell,
    indices: Uint16Array | Uint32Array,
    data: Float32Array,
  ) {
    const profile = this.getTempProfile(shell);
    const indexAmount = profile.indicesLength();
    const notAHole = !this.interiorProfiles.has(id);
    const isFace3 = indexAmount === PolygonSize.three;
    if (isFace3 && notAHole) {
      this.constructFace3(indices, data, id);
      return;
    }
    const isFace4 = indexAmount === PolygonSize.four;
    if (isFace4 && notAHole) {
      this.constructFace4(indices, data, id);
      return;
    }
    this.constructFaceX(indices, data, id);
  }

  private getIntProfileNormals(hole: ShellHoleData, id: number) {
    const index = id * 3;
    const nx = this.normalsAvgInterior[index];
    const ny = this.normalsAvgInterior[index + 1];
    const nz = this.normalsAvgInterior[index + 2];
    hole.normals!.push(nx, ny, nz);
  }

  private saveExistingInteriorProfile(id: number) {
    const found = this.interiorProfiles.get(id)!;
    const pointCount = found.points.length;
    const indexCount = pointCount / 3;
    found.indices.push(indexCount);
    this.interiorProfiles.set(id, found);
  }

  private getNewIntProfileData() {
    const indices = [0];
    const points = [] as number[];
    const normals = [] as number[];
    return { indices, points, normals };
  }

  private constructFace3(
    indices: Uint16Array | Uint32Array,
    data: Float32Array,
    id: number,
  ) {
    const faceId = this._faceIdPerProfile.get(id)!;
    ShellFace3.create(
      indices,
      data,
      this._normalsAvg,
      this._tileData,
      this._sizes,
      faceId,
    );
  }

  private getIntProfilePoints(
    i: number,
    shell: Shell,
    holeData: ShellHoleData,
  ) {
    const hole = this.getTempHole(shell);
    const shellIndex = hole.indices(i) as number;
    shell.points(shellIndex, this.point);
    const px = this.point.x();
    const py = this.point.y();
    const pz = this.point.z();
    holeData.points.push(px, py, pz);
  }

  private manageMemory(shell: Shell, meshData: TileData | TileData[]) {
    const profile = this.getTempProfile(shell);
    const indexAmount = profile.indicesLength();
    const vertexAmount = this._sizes.verticesAmount / 3;
    const memoryConsumed = vertexAmount + indexAmount;
    const memoryOverflow = memoryConsumed > limitOf2Bytes;
    if (memoryOverflow) {
      this.nextBuffer(meshData);
    }
  }

  private nextBuffer = (bufferGeometries: TileData | TileData[]) => {
    // Finalize the OUTGOING buffer (if it was one this pass created on its
    // own) before switching this._tileData/this._indices away from it -
    // this._sizes still holds its real final totals at this exact point.
    this.finalizeCurrentIfDynamic();
    this.setTileData(bufferGeometries);
    this.initializeIndices();
    this.initializePositions();
    this.initializeNormals();
    this.initializeFaceIds();
    this.initializeSizes();
    this._indices++;
  };

  private initializeFaceIds() {
    const size = this._tileData.positionCount!;
    this._tileData.faceIdBuffer = new Uint32Array(size / 3);
  }

  private getNextFaceId() {
    // Random uint32 value
    const maxUint32 = 4294967295;
    return Math.random() * maxUint32;
  }

  private newShellInteriorProfiles(shell: Shell) {
    this.interiorProfiles.clear();
    const count = ShellUtils.getHolesLength(shell);
    const hole = this.getTempHole(shell);
    for (let i = 0; i < count; i++) {
      ShellUtils.getHole(shell, i, hole);
      const id = this.saveInteriorProfile(shell);
      const intProfile = this.interiorProfiles.get(id)!;
      this.getIntProfileNormalsAvg(shell, id);
      this.getInteriorProfileBuffer(shell, intProfile);
    }
    return this.interiorProfiles;
  }

  private initializePositions() {
    const size = this._tileData.positionCount!;
    this._tileData.positionBuffer = new Float32Array(size);
  }

  private initializeNormals() {
    const size = this._tileData.normalCount!;
    this._tileData.normalBuffer = new Int16Array(size);
  }

  private setTileData(bufferGeometries: AnyTileData) {
    if (Array.isArray(bufferGeometries)) {
      if (this._indices >= bufferGeometries.length) {
        // ShellTemplateConstructor's sizing pass didn't predict this many
        // buffers for this shell - see createOverflowTileData's own
        // comment for why. Grow the (caller-owned, persisted) array here
        // instead of reading past its end.
        bufferGeometries.push(this.createOverflowTileData());
        this._dynamicTileIndices.add(this._indices);
      }
      this._tileData = bufferGeometries[this._indices];
      this._currentTileIndex = this._indices;
      return;
    }
    this._tileData = bufferGeometries;
  }

  private constructShell(
    shell: Shell,
    data: Float32Array,
    meshData: AnyTileData,
  ) {
    this.getFaceIds(shell);
    // this._faceIdPerProfile.delete(4); // For debugging, draws this face black
    const count = ShellUtils.getProfilesLength(shell);
    for (let id = 0; id < count; id++) {
      const indices = this.getIndices(shell, id);
      this.computeNormalsAvg(shell, indices, id);
      this.constructProfile(id, shell, indices, data);
      this.manageMemory(shell, meshData);
    }
  }

  private constructFaceX(
    indices: Uint16Array | Uint32Array,
    data: Float32Array,
    id: number,
  ) {
    const faceId = this._faceIdPerProfile.get(id)!;
    ShellFaceX.create(
      indices,
      data,
      this._normalsAvg,
      id,
      this._tileData,
      this.interiorProfiles,
      this._sizes,
      faceId,
    );
  }

  private getTempProfile(shell: Shell) {
    if (shell.type() === ShellType.BIG) {
      return this._bigShellProfile;
    }
    return this._shellProfile;
  }

  private getTempHole(shell: Shell) {
    if (shell.type() === ShellType.BIG) {
      return this._bigShellHole;
    }
    return this._shellHole;
  }

  private getFaceIds(shell: Shell) {
    this._faceIdPerProfile.clear();

    const faceIds = shell.profilesFaceIdsArray();

    const colors = new Map<number, number>();

    if (faceIds && faceIds.length > 0) {
      for (let i = 0; i < faceIds.length; i++) {
        const rawFaceId = faceIds[i]!;
        if (!colors.has(rawFaceId)) {
          colors.set(rawFaceId, this.getNextFaceId());
        }
        const faceId = colors.get(rawFaceId)!;
        this._faceIdPerProfile.set(i, faceId);
      }
      return;
    }

    // Default case: assign a face per profile
    for (let i = 0; i < shell.profilesLength(); i++) {
      this._faceIdPerProfile.set(i, this.getNextFaceId());
    }
  }
}
