import * as THREE from "three";
import {
  TileData,
  LodClass,
  normalizationValue,
  VirtualMeshManager,
  VirtualShellManager,
  VirtualCircleExtrusionManager,
} from "../virtual-meshes";
import {
  ObjectClass,
  CurrentLod,
  DataBuffer,
  limitOf2Bytes,
  TileRequestClass,
  SnappingClass,
} from "../../model/model-types";
import { VirtualBoxController } from "../../bounding-boxes";
import {
  CRC,
  CameraUtils,
  MultiBufferData,
  TransformHelper,
  MiscHelper,
  BoxUtils,
} from "../../utils";

import { Connection } from "../../multithreading/connection";
import {
  RepresentationClass,
  Model,
  Meshes,
  Sample,
  Representation,
} from "../../../../Schema";
import { ItemConfigController } from "./item-config-controller";
import { MeshConnection } from "../../multithreading/mesh-connection";
import { RaycastController } from "./raycast-controller";
import { VirtualMemoryController } from "./virtual-memory-controller";

type VirtualMeshes = Map<RepresentationClass, VirtualMeshManager>;

export type VirtualTileData = {
  modelId: string;
  connection: Connection;
  model: Model;
  boxes: VirtualBoxController;
  items: ItemConfigController;
  materials: number[];
};

enum TileDimension {
  SMALL = 0,
  MEDIUM = 1,
  LARGE = 2,
}

export class VirtualTilesController {
  meshes: Meshes;
  tilesUpdated = false;

  private static _graphicMemoryConsumed = 0;

  private readonly _sampleAmount: number;
  private readonly _tileDimension: number;
  private readonly _tileBySample: Array<number | number[]>;
  private readonly _lodBySample: number[];
  private readonly _virtualMeshes: VirtualMeshes = new Map();
  private readonly _meshConnection: MeshConnection;
  private readonly _samples: ItemConfigController;
  private readonly _tileIdGenerator = new CRC();
  private readonly _tiles = new Map<number, TileData>();
  private readonly _tilesChanged = new Set<number>();
  private readonly _sizeByTile = new Map<number, number>();
  private readonly _samplesDimensions: DataBuffer;
  private readonly _sampleLodClass: DataBuffer;
  private readonly _sampleLodState: DataBuffer;
  private readonly _sampleLodSize: DataBuffer;
  private readonly _boxes: VirtualBoxController;
  private readonly _items: ItemConfigController;
  private readonly _materials: number[];
  private readonly _modelId: string;

  private readonly _lastView = {
    rotation: new THREE.Vector3(),
    location: new THREE.Vector3(),
  };
  private readonly _params = {
    updateTime: 16,
    updateSamples: 64,
    updateviewOrientation: (8 * Math.PI) / 180,
    updateViewPosition: 256,
    smallTileSize: 0.32,
    mediumTileSize: 4,
    smallObjectSize: 2,
    smallScreenSize: 2,
    mediumScreenSize: 4,
    largeScreenSize: 16,
    tempTileDataSize: 6,
    tileIdIncrement: 1,
    tileSizeMultiplier: 10,
    minTileDimension: 32,
    tileDimensionFactor: 8,
  };

  private readonly _temp = {
    sample: new Sample(),
    representation: new Representation(),
    vector: new THREE.Vector3(),
    matrix: new THREE.Matrix4(),
    transform: new THREE.Matrix4(),
    boundingBox: new THREE.Box3(),
    sampleGeometry: {} as any,
    box: new THREE.Box3(),
    raycastPoints: [] as any[],
    tileData: {
      positionCount: this._params.tempTileDataSize,
      objectClass: ObjectClass.LINE,
      positionBuffer: new Float32Array(this._params.tempTileDataSize),
    } as TileData,
    tileCenter: new THREE.Vector3(),
    tile: {
      objectClass: ObjectClass.LINE,
      positionCount: 6,
    } as TileData,
    viewDimension: 0,
    pastFieldOfview: 0,
  };

  private _currentSample = 0;
  private _virtualPlanes: THREE.Plane[] = [];
  private _changedSamples = 0;
  private _virtualView: any;

  constructor(data: VirtualTileData) {
    this._modelId = data.modelId;
    this._boxes = data.boxes;
    this._items = data.items;
    this._materials = data.materials;
    this._meshConnection = new MeshConnection(data.modelId, data.connection);
    this.meshes = data.model.meshes() as Meshes;
    this._sampleAmount = this.meshes.samplesLength();
    this._samples = new ItemConfigController(this._sampleAmount);
    this._samplesDimensions = new Int32Array(this._sampleAmount);
    this._sampleLodClass = new Uint8Array(this._sampleAmount);
    this._sampleLodState = new Uint8Array(this._sampleAmount);
    this._sampleLodSize = new Float32Array(this._sampleAmount);
    this._tileDimension = this.computeTileSize();
    this._tileBySample = new Array(this._sampleAmount);
    this._lodBySample = new Array(this._sampleAmount);
    this.init();
  }

  restart() {
    this.resetUpdateProcess();
    this._meshConnection.clean();
  }

  fetchSample(id: number, lod: CurrentLod) {
    this.fetchSampleAndRepresentation(id);
    const mesh = this.fetchCurrentMesh();
    const sample = this.sampleTemplate(id);
    sample.geometries = this.sampleGeoms(sample, lod, mesh);
    return sample;
  }

  dispose() {
    this._meshConnection.dispose();
    for (const [, mesh] of this._virtualMeshes) {
      mesh.dispose();
    }
  }

  generate() {
    for (const [, mesh] of this._virtualMeshes) {
      mesh.setupTemplates();
    }
    for (let i = 0; i < this._sampleAmount; i++) {
      this.generateSampleInTiles(i);
    }
    this.setupTileVisibilityAndHighlight();
  }

  setupView(view: any) {
    this._virtualView = view;
    VirtualMemoryController.setCapacity(view.meshThreshold);
    this.restart();
    this.updateOrientationIfNeeded();
    this.updatePositionIfNeeded();
    this.setupViewPlanes();
  }

  updateVirtualMeshes(itemIds: number[]) {
    if (!itemIds || !this._virtualView) {
      return;
    }
    for (const itemId of itemIds) {
      this.updateItem(itemId);
    }
    this.restart();
  }

  getSampleTransform(id: number) {
    this.fetchSampleAndRepresentation(id);
    const sample = this.sampleTemplate(id);
    return sample.transform;
  }

  async update(time: number) {
    this.updateTiles(time);
    this.notifyUpdateFinished();
    for (const tileId of this._tilesChanged) {
      const tile = this._tiles.get(tileId) as TileData;
      this._meshConnection.process({
        tileRequestClass: TileRequestClass.UPDATE,
        modelId: this._modelId,
        tileId,
        objectClass: tile.objectClass,
        material: tile.materialId as number,
        tileData: this.getTileData(tile),
        currentLod: tile.lod as number,
      });
    }
    this._tilesChanged.clear();
  }

  raycast(
    representation: Representation,
    ray: THREE.Ray,
    frustum: THREE.Frustum,
    snap?: SnappingClass,
  ) {
    this._temp.raycastPoints = [];
    const rClass = representation.representationClass();
    const mesh = this._virtualMeshes.get(rClass) as VirtualMeshManager;
    this.manageRaycast(mesh, representation, ray, frustum, snap);
    return this._temp.raycastPoints;
  }

  private init() {
    const shells = new VirtualShellManager(this._modelId, this.meshes);
    const shellsRepresentation = shells.getRepresentation();
    this._virtualMeshes.set(shellsRepresentation, shells);
    const ces = new VirtualCircleExtrusionManager(this._modelId, this.meshes);
    const cesRepresentation = ces.getRepresentation();
    this._virtualMeshes.set(cesRepresentation, ces);
    this.processSamplesDimension();
    this.fetchSampleLodSize();
  }

  private initSampleLod(id: number) {
    this.fetchSampleAndRepresentation(id);
    const mesh = this.fetchCurrentMesh();
    this._sampleLodClass[id] = mesh.getLodClass();
    this._sampleLodState[id] = CurrentLod.INVISIBLE;
  }

  private fetchSampleAndRepresentation(id: number) {
    this.meshes.samples(id, this._temp.sample);
    this.meshes.representations(
      this._temp.sample.representation(),
      this._temp.representation,
    );
  }

  private fetchCurrentMesh() {
    const rClass = this._temp.representation.representationClass();
    return this._virtualMeshes.get(rClass) as VirtualMeshManager;
  }

  private fetchCurrentMaterial() {
    const materialId = this._temp.sample.material();
    return this._materials[materialId];
  }

  private fetchSampleLodSize() {
    for (let i = 0; i < this._sampleAmount; i++) {
      this.initSampleLod(i);
      TransformHelper.getBox(this._temp.representation, this._temp.box);
      this._sampleLodSize[i] = BoxUtils.getWidth(this._temp.box);
    }
  }

  private setupTileVisibilityAndHighlight() {
    for (const [, tile] of this._tiles) {
      tile.visibilities = new MultiBufferData<boolean>(tile.size, false);
      tile.highlights = new MultiBufferData<number>(tile.size, 0);
    }
  }

  private addLodToTile(mesh: VirtualMeshManager, id: number, material: number) {
    if (mesh.getLodClass() === LodClass.AABB) {
      this.addBoxLodToTile(id, material);
      return;
    }

    if (mesh.getLodClass() === LodClass.CUSTOM) {
      this.addCustomLodToTile(mesh, id, material);
    }
  }

  private addBoxLodToTile(id: number, material: number) {
    this._lodBySample[id] = this.lodTileAppendSample(id, material);
  }

  private notifyUpdateFinished() {
    const noficationNotSentYet = !this.tilesUpdated;
    const samplesUpdated = this._changedSamples >= this._sampleAmount;
    const updateFinished = samplesUpdated && noficationNotSentYet;
    if (!updateFinished) {
      return;
    }
    this._meshConnection.process({
      tileRequestClass: TileRequestClass.FINISH,
      modelId: this._modelId,
    });
    this.tilesUpdated = true;
  }

  private updatePositionIfNeeded() {
    const positionThreshold = this._params.updateViewPosition;
    const pos = this._virtualView.cameraPosition;
    const positionChange = pos.distanceToSquared(this._lastView.location);
    const positionNeedsUpdate = positionChange > positionThreshold;
    if (positionNeedsUpdate) {
      this._currentSample = 0;
      this._lastView.location.copy(pos);
    }
  }

  private updateCurrentSample() {
    this._currentSample++;
    if (this._currentSample >= this._sampleAmount) {
      this._currentSample = 0;
    }
    this._changedSamples++;
  }

  private processSamplesDimension() {
    for (let i = 0; i < this._sampleAmount; i++) {
      this._samplesDimensions[i] = i;
    }
    this._samplesDimensions.sort((a, b) => {
      const bDimension = this._boxes.dimensionOf(b);
      const aDimension = this._boxes.dimensionOf(a);
      return bDimension - aDimension;
    });
  }

  private setupViewPlanes() {
    this._virtualPlanes = [];
    for (const plane of this._virtualView.cameraFrustum.planes) {
      this._virtualPlanes.push(plane);
    }
    if (this._virtualView.clippingPlanes) {
      for (const plane of this._virtualView.clippingPlanes) {
        this._virtualPlanes.push(plane);
      }
    }
  }

  private updateOrientationIfNeeded() {
    const orientation = this.getCurrentViewOrientation();
    const orientationThreshold = this._params.updateviewOrientation;
    const orientationChange = orientation.angleTo(this._lastView.rotation);
    const orientationNeedsUpdate = orientationChange > orientationThreshold;
    if (orientationNeedsUpdate) {
      this._currentSample = 0;
      this._lastView.rotation.copy(orientation);
    }
  }

  private getCurrentViewOrientation() {
    return this._virtualView.cameraFrustum.planes[4].normal;
  }

  private resetUpdateProcess() {
    this._changedSamples = 0;
    this.tilesUpdated = false;
  }

  private manageRaycast(
    mesh: VirtualMeshManager,
    repr: Representation,
    ray: THREE.Ray,
    frustum: THREE.Frustum,
    snap?: SnappingClass,
  ) {
    const found = RaycastController.cast(mesh, repr, ray, frustum, snap);
    if (found) {
      for (const point of found) {
        point.representationClass = mesh.getObjectClass();
        this._temp.raycastPoints.push(point);
      }
    }
  }

  private setTileShellBuffer(tile: TileData) {
    if (
      tile.usedMemory === undefined ||
      tile.objectClass !== ObjectClass.SHELL
    ) {
      return;
    }
    tile.ids = new Float32Array(tile.positionCount! / 3);
    tile.usedMemory += tile.ids.byteLength;
  }

  private getTileWhenSamplePut(
    tileId: number,
    tileData: TileData,
    material: number,
  ) {
    let tile = this._tiles.get(tileId);
    if (tile === undefined) {
      const lod = tileData.lod || CurrentLod.GEOMETRY;
      tile = this.newTile(tileData.objectClass, material, lod);
      this._tiles.set(tileId, tile);
    }
    return tile;
  }

  private getPerspTrueDim(fov: number, distance: number) {
    const radFactor = Math.PI / 180;
    const tan = Math.tan(fov * 0.5 * radFactor);
    return distance * tan;
  }

  private getTileHighlight(tile: TileData, locations: number[]) {
    let highlightData: any = undefined as any;
    let highlightIds: any = undefined as any;
    const highlights = tile.highlights;
    if (!highlights) {
      return { highlightData: undefined, highlightIds: undefined };
    }

    const highlightSize = highlights.size((id) => id !== 0);
    if (highlightSize > 0) {
      highlightIds = new Uint16Array(highlightSize);
      const f = (id: number) => id !== 0;
      const c = (id: number, data: number) => (highlightIds[id] = data);
      highlightData = MultiBufferData.get(highlights, locations, f, c);
    }

    return { highlightData, highlightIds };
  }

  private setupTileSampleAttributes(
    tile: TileData,
    location: number,
    geometry: any,
    sample: any,
  ) {
    const resultPosition = tile.vertexLocation[location] * 3;
    for (let i = 0; i < geometry.positionBuffer!.length; i += 3) {
      this._temp.vector.fromArray(geometry.positionBuffer!, i);
      this._temp.vector.applyMatrix4(this._temp.matrix);
      this._temp.vector.toArray(tile.positionBuffer!, resultPosition + i);
    }

    if (tile.normalBuffer) {
      const resultPosition = tile.vertexLocation[location] * 3;
      for (let i = 0; i < geometry.normalBuffer!.length; i += 3) {
        this._temp.vector.fromArray(geometry.normalBuffer!, i);
        this._temp.vector.transformDirection(this._temp.matrix);
        this._temp.vector.multiplyScalar(normalizationValue);
        this._temp.vector.toArray(tile.normalBuffer!, resultPosition + i);
      }
    }

    if (tile.indexBuffer) {
      const indicesPosition = tile.indexLocation[location];
      const position = tile.vertexLocation[location];
      for (let i = 0; i < geometry.indexCount!; i++) {
        const result = geometry.indexBuffer![i] + position;
        tile.indexBuffer[i + indicesPosition] = result;
      }
    }

    if (geometry.objectClass === ObjectClass.SHELL) {
      const start = tile.vertexLocation[location];
      const end = start + geometry.positionCount! / 3;
      tile.ids!.fill(this.itemId(sample.sample), start, end);
    }
  }

  private getTileVisibility(tile: TileData, locations: number[]) {
    if (!tile.visibilities) {
      throw new Error("Fragments: Malformed tile!");
    }
    if (tile.visibilities.fullOf(false)) {
      return undefined;
    }
    const filter = (data: boolean) => data;
    return MultiBufferData.get(tile.visibilities!, locations, filter);
  }

  private memoryOverflow() {
    const current = VirtualTilesController._graphicMemoryConsumed;
    const available = this._virtualView.graphicThreshold;
    return current > available;
  }

  private updateMesh(sample: number) {
    let current = this.fetchLodLevel(sample);
    const past = this._sampleLodState[sample];
    // TODO: Highlights don't work with LOD yet; just hide them
    current = this.hideHighlightedLods(current, sample);
    if (current === past) {
      this.updateSampleIfSeen(current, sample);
      return;
    }
    this.updateVisible(past, current, sample);
  }

  private tileLoadSample(tile: TileData, sample: any, geomIndex: number) {
    const location = tile.sampleLocation.get(sample.sample) as number;
    const geometry = this.getSampleGeometries(sample, geomIndex);
    this.setupTileLocation(tile, geometry, sample);
    this.fetchSampleTransform(tile, sample);
    this.setupTileSampleAttributes(tile, location, geometry, sample);
  }

  private updateSampleIfSeen(current: CurrentLod, sample: number) {
    if (current !== CurrentLod.INVISIBLE) {
      this.updateSample(sample, current);
    }
  }

  private hideHighlightedLods(current: CurrentLod, sample: number) {
    if (current === CurrentLod.WIRES && this._samples.getHighlight(sample)) {
      current = CurrentLod.INVISIBLE;
    }
    return current;
  }

  private updateVisible(past: CurrentLod, current: CurrentLod, sample: number) {
    if (past !== CurrentLod.INVISIBLE) {
      this.makeSampleInvisible(sample, past);
    }
    const isSeen = current !== CurrentLod.INVISIBLE;
    if (isSeen) {
      this.updateSample(sample, current);
    }
    this._samples.setVisible(sample, isSeen);
    this._sampleLodState[sample] = current;
  }

  private makeInvisibleFromTile(tileId: number, sample: number) {
    const tile = this._tiles.get(tileId) as TileData;
    this.updateTileData(tile, sample, false, 0);
    this.deleteTileIfNeeded(tile, tileId);
  }

  private updateSample(id: number, lod: CurrentLod) {
    const itemId = this.itemId(id);
    const visible = this._items.visible(itemId);
    const highlight = this._items.getHighlight(itemId);
    const changed = this.hasChanged(id, lod, visible, highlight);
    if (changed) {
      this.setSample(id, visible, highlight, lod);
    }
  }

  private hasHighlightChanged(id: number, highlight: number) {
    const currentHighlight = this._samples.getHighlight(id);
    return highlight !== currentHighlight;
  }

  private hasVisibleChanged(id: number, visible: boolean) {
    const currentVisible = this._samples.visible(id);
    return visible !== currentVisible;
  }

  private newTile(objectClass: ObjectClass, material: number, lod: CurrentLod) {
    const tile = {} as Partial<TileData>;
    tile.notVirtual = false;
    tile.materialId = material;
    tile.indexLocation = [];
    tile.box = new THREE.Box3();
    tile.objectClass = objectClass;
    tile.lod = lod;
    tile.normalCount = 0;
    tile.indexCount = 0;
    tile.vertexLocation = [];
    tile.size = 0;
    tile.geometriesLocation = [];
    tile.positionCount = 0;
    tile.sampleLocation = new Map();
    return tile as TileData;
  }

  private createLod(box: THREE.Box3) {
    const line = TransformHelper.boxSize(box);
    const position = this._temp.tileData.positionBuffer;
    if (!position) {
      throw new Error("Fragments: Malformed tiles!");
    }
    position[0] = line.start.x;
    position[1] = line.start.y;
    position[2] = line.start.z;
    position[3] = line.end.x;
    position[4] = line.end.y;
    position[5] = line.end.z;
    return this._temp.tileData;
  }

  private sampleTemplate(id: number) {
    const sample = this._temp.sample;
    const representation = this._temp.representation;
    TransformHelper.get(sample, this.meshes, this._temp.transform);
    TransformHelper.getBox(representation, this._temp.boundingBox);
    this._temp.sampleGeometry.sample = id;
    const materialId = sample.material();
    this._temp.sampleGeometry.material = this._materials[materialId];
    this._temp.sampleGeometry.transform = this._temp.transform;
    this._temp.sampleGeometry.aabb = this._temp.boundingBox;
    delete this._temp.sampleGeometry.geometries;
    return this._temp.sampleGeometry;
  }

  private makeSampleInvisible(id: number, lod: CurrentLod) {
    const tileIds = this.getTileIds(id, lod);
    if (!tileIds) {
      return;
    }
    const callback = (tileId: number) => this.makeInvisibleFromTile(tileId, id);
    MiscHelper.forEach(tileIds, callback);
  }

  private setSample(id: number, vis: boolean, high: number, lod: CurrentLod) {
    this._samples.setVisible(id, vis);
    this._samples.setHighlight(id, high);
    const tileIds = this.getTileIds(id, lod);
    if (tileIds === undefined) return;
    MiscHelper.forEach(tileIds, (tileId) => {
      this.updateTile(tileId, id, high, high === 0);
    });
  }

  private getTileIds(sample: number, lod: number) {
    if (lod === CurrentLod.GEOMETRY) {
      return this._tileBySample[sample];
    }
    return this._lodBySample[sample];
  }

  private addBasicTileData(a: TileData, sample: number, id: number) {
    a.sampleLocation.set(sample, a.size);
    a.size++;
    a.geometriesLocation.push(id);
    a.indexLocation.push(a.indexCount || 0);
    a.vertexLocation.push((a.positionCount || 0) / 3);
  }

  private buildNewVirtualTile(tile: TileData, tileId: number) {
    this.constructTile(tile);
    this.loadTile(tileId, tile);
    tile.notVirtual = true;
    delete tile.indexBuffer;
    delete tile.positionBuffer;
    delete tile.normalBuffer;
    delete tile.ids;
  }

  private deleteTileIfNeeded(tile: TileData, tileId: number) {
    const shouldDelete = this.getShouldDeleteTile(tile);
    if (shouldDelete) {
      this.deleteGeometry(tileId);
      tile.notVirtual = false;
      VirtualTilesController._graphicMemoryConsumed -= tile.usedMemory!;
      return;
    }
    this._tilesChanged.add(tileId);
  }

  private getShouldDeleteTile(tile: TileData) {
    if (!tile.visibilities || !tile.highlights) {
      throw new Error("Fragments: Malformed tile!");
    }
    const invisible = tile.visibilities.fullOf(false);
    const noHighlight = tile.highlights.fullOf(0);
    const memoryOverflow = this.memoryOverflow();
    return invisible && noHighlight && memoryOverflow;
  }

  private checkTileMemoryOverflow(tileId: number, tileData: TileData) {
    const tile = this._tiles.get(tileId);
    const bufferSize = tile ? tile.positionCount! : 0;
    const totalSize = bufferSize + tileData.positionCount!;
    const memoryOverflow = totalSize > limitOf2Bytes;
    return memoryOverflow;
  }

  private updateTileData(
    tile: TileData,
    sample: number,
    visible: boolean,
    highlight: number,
  ) {
    if (!tile.visibilities || !tile.highlights) {
      throw new Error("Fragments: Malformed tile!");
    }
    const id = tile.sampleLocation.get(sample) as number;
    tile.visibilities.update(id, visible);
    tile.highlights.update(id, highlight);
  }

  private getKeepUpdating(sampleId: number, time: number) {
    const maxTime = this._params.updateTime;
    const minSamples = this._params.updateSamples;
    const samplesLeft = sampleId < this._sampleAmount;
    const passedTime = performance.now() - time;
    const isFirstSamples = sampleId < minSamples;
    const timeLeft = passedTime < maxTime || isFirstSamples;
    const shouldKeepUpdating = samplesLeft && timeLeft;
    return shouldKeepUpdating;
  }

  private computeTileSize() {
    const dimension = this._boxes.fullBox.getSize(this._temp.vector);
    const maxDimension = Math.max(dimension.x, dimension.y, dimension.z);
    const fraction = maxDimension / this._params.tileDimensionFactor;
    const maxIntFraction = Math.ceil(fraction);
    return Math.max(this._params.minTileDimension, maxIntFraction);
  }

  private newTileId(sample: number, material: number, tileData: TileData) {
    this.logBufferOverflowIfNeeded(tileData);
    const lod = tileData.lod || CurrentLod.GEOMETRY;
    const code = this.generateTileCode(sample, material, tileData, lod);
    const tileSize = this._sizeByTile.get(code) || 1;
    let tileId = code + tileSize - 1;
    const memoryOverflow = this.checkTileMemoryOverflow(tileId, tileData);
    if (memoryOverflow) {
      tileId += this._params.tileIdIncrement;
      this._sizeByTile.set(code, tileSize + 1);
    }
    return tileId;
  }

  private logBufferOverflowIfNeeded(tileData: TileData) {
    const geometrySize = tileData.positionCount! / 3;
    if (geometrySize > limitOf2Bytes) {
      console.log("Fragments: Buffer overflow");
    }
  }

  private fetchLodLevel(sample: number) {
    const item = this._boxes.get(sample);
    const notClipped = CameraUtils.collides(item, this._virtualPlanes);
    if (!notClipped) {
      return CurrentLod.INVISIBLE;
    }

    this.meshes.samples(sample, this._temp.sample);
    const itemId = this._temp.sample.item();
    const isSeen = this._items.visible(itemId);
    if (!isSeen) {
      return CurrentLod.INVISIBLE;
    }

    const quality = this._virtualView.graphicQuality;
    const dimension = this._boxes.dimensionOf(sample);
    const offset = item.distanceToPoint(this._virtualView.cameraPosition);
    const screenDimension = this.screenSize(dimension, offset);

    const isSmall = dimension < this._params.smallObjectSize;
    const isLarge = !isSmall;

    const smallScreen = this._params.smallScreenSize * quality;
    const mediumScreen = this._params.mediumScreenSize * quality;
    const largeScreen = this._params.largeScreenSize * quality;

    const isSmallInScreen = screenDimension < smallScreen;
    const isMediumInScreen = screenDimension < mediumScreen;
    const isLargeInScreen = screenDimension < largeScreen;

    const smallAndFar = isSmall && isMediumInScreen;
    const largeAndVeryFar = isLarge && isSmallInScreen;
    const smallAndClose = isSmall && isLargeInScreen;
    const largeAndFar = isLarge && isMediumInScreen;

    if (smallAndFar || largeAndVeryFar) {
      return CurrentLod.INVISIBLE;
    }

    if (smallAndClose || largeAndFar) {
      return CurrentLod.WIRES;
    }

    const lodSize = this._sampleLodSize[sample];
    const screenSize = this.screenSize(lodSize, offset);
    const wireLimit = Math.max(mediumScreen, this._params.mediumScreenSize);
    const isWireLike = screenSize < wireLimit;
    if (isWireLike) {
      return CurrentLod.WIRES;
    }

    return CurrentLod.GEOMETRY;
  }

  private generateTileCode(
    sample: number,
    material: number,
    tile: TileData,
    lod: CurrentLod,
  ) {
    this._tileIdGenerator.reset();
    this.processTileDataId(tile, material, lod);
    const box = this.processTileSpatialId(sample, lod);
    this.processTileDimensionId(box);
    return this._tileIdGenerator.value;
  }

  private processTileDataId(tile: TileData, material: number, lod: CurrentLod) {
    this._tileIdGenerator.compute(
      tile.objectClass !== undefined ? tile.objectClass : 0,
    );
    this._tileIdGenerator.compute(material);
    this._tileIdGenerator.compute(lod);
  }

  private deleteGeometry(tileId: number) {
    this._meshConnection.process({
      tileRequestClass: TileRequestClass.DELETE,
      modelId: this._modelId,
      tileId,
    });
  }

  private processTileSpatialId(sample: number, lod: CurrentLod) {
    const x = this._temp.tileCenter.x;
    const y = this._temp.tileCenter.y;
    const z = this._temp.tileCenter.z;
    const box = this._boxes.get(sample);
    box.getCenter(this._temp.tileCenter);
    const tileDimension = this.getTileDimension(lod);
    const tx = x - (x % tileDimension);
    const ty = y - (y % tileDimension);
    const tz = z - (z % tileDimension);
    this._tileIdGenerator.compute(tx);
    this._tileIdGenerator.compute(ty);
    this._tileIdGenerator.compute(tz);
    return box;
  }

  private addCustomLodToTile(
    mesh: VirtualMeshManager,
    id: number,
    material: number,
  ) {
    const lods = this.meshData(mesh, false, CurrentLod.WIRES) as TileData;
    this._sampleLodSize[id] = lods.lodThickness || 0;
    this._lodBySample[id] = this.putSampleInTiles(id, material, lods) as number;
  }

  private getTileLocations(tile: TileData) {
    if (tile.indexCount) {
      return tile.indexLocation;
    }
    return tile.vertexLocation;
  }

  private getTileDimension(lod: CurrentLod) {
    let tileDimension = this._tileDimension;
    if (lod === CurrentLod.GEOMETRY) {
      tileDimension *= this._params.tileSizeMultiplier;
    }
    return tileDimension;
  }

  private processTileDimensionId(box: THREE.Box3) {
    const sizeCategory = this.getTileDimensionClass(box);
    this._tileIdGenerator.compute(sizeCategory);
  }

  private tileAppend(a: TileData, b: TileData, sample: number, id: number) {
    this.addBasicTileData(a, sample, id);
    this.tileAppendAttribute(a, b, "indexCount", false);
    this.tileAppendAttribute(a, b, "positionCount", false);
    this.tileAppendAttribute(a, b, "normalCount", false);
    this.tileAppendAttribute(a, b, "materialId", true);
  }

  private putSampleInTiles(
    sample: number,
    material: number,
    tiles: TileData | TileData[],
  ) {
    let tileIds: number | number[] = undefined as any;
    const onSamplePut = (tileData: TileData, id: number) => {
      const tileId = this.newTileId(sample, material, tileData);
      tileIds = this.getTileIdsWhenSamplePut(tileIds, tileId);
      const tile = this.getTileWhenSamplePut(tileId, tileData, material);
      this.tileAppend(tile, tileData, sample, id);
    };
    MiscHelper.forEach(tiles, onSamplePut);
    return tileIds;
  }

  private hasLodChanged(id: number, lod: CurrentLod) {
    const currentLod = this._sampleLodState[id];
    return lod !== currentLod;
  }

  private getTileIdsWhenSamplePut(tileIds: number | number[], tileId: number) {
    if (tileIds === undefined) {
      tileIds = tileId;
    } else if (typeof tileIds === "number") {
      if (tileIds !== tileId) tileIds = [tileIds, tileId];
    } else if (!tileIds.includes(tileId)) {
      tileIds.push(tileId);
    }
    return tileIds;
  }

  private updateTile(
    tileId: number,
    sample: number,
    highlight: number,
    visible: boolean,
  ) {
    const tile = this._tiles.get(tileId) as TileData;
    this.updateTileData(tile, sample, visible, highlight);
    if (tile.notVirtual) {
      this._tilesChanged.add(tileId);
      return;
    }
    this.buildNewVirtualTile(tile, tileId);
  }

  private getLodTileWhenPutSample(tileId: number, material: number) {
    let tile = this._tiles.get(tileId);
    if (!tile) {
      const objectClass = this._temp.tile.objectClass;
      tile = this.newTile(objectClass, material, CurrentLod.WIRES);
      this._tiles.set(tileId, tile);
    }
    return tile;
  }

  private lodTileAppendSample(sample: number, material: number) {
    const wires = CurrentLod.WIRES;
    const tempTile = this._temp.tile;
    const tileId = this.generateTileCode(sample, material, tempTile, wires);
    const tile = this.getLodTileWhenPutSample(tileId, material);
    this.tileAppend(tile, tempTile, sample, 0);
    return tileId;
  }

  private addSampleToTile(
    mesh: VirtualMeshManager,
    id: number,
    material: number,
  ) {
    const meshes = this.meshData(mesh, false, CurrentLod.GEOMETRY);
    this._tileBySample[id] = this.putSampleInTiles(id, material, meshes);
  }

  private setTileBuffer(
    tile: TileData,
    key: "index" | "normal",
    unsigned: boolean,
  ) {
    if (tile.usedMemory === undefined) {
      return;
    }
    const count = tile[`${key}Count`] as number;
    if (count > 0) {
      const buffer = unsigned ? new Uint16Array(count) : new Int16Array(count);
      tile[`${key}Buffer`] = buffer;
      tile.usedMemory += buffer.byteLength;
    }
  }

  private updateTiles(time: number) {
    const needsUpdate = this._changedSamples < this._sampleAmount;
    const viewAvailable = this._virtualView !== undefined;
    if (!viewAvailable || !needsUpdate) {
      return;
    }
    let keepUpdating = true;
    let updatingSampleId = 0;
    while (keepUpdating) {
      const meshId = this._samplesDimensions[this._currentSample];
      this.updateMesh(meshId);
      this.updateCurrentSample();
      updatingSampleId++;
      keepUpdating = this.getKeepUpdating(updatingSampleId, time);
    }
  }

  private sampleGeoms(sample: any, lod: CurrentLod, mesh: VirtualMeshManager) {
    if (mesh.getLodClass() === LodClass.AABB && lod === CurrentLod.WIRES) {
      return this.createLod(sample.aabb);
    }
    return this.meshData(mesh, true, lod);
  }

  private generateSampleInTiles(id: number) {
    this.fetchSampleAndRepresentation(id);
    const material = this.fetchCurrentMaterial();
    const mesh = this.fetchCurrentMesh();
    this.addSampleToTile(mesh, id, material);
    this.addLodToTile(mesh, id, material);
  }

  private buildSampleInTile(
    tile: TileData,
    position: number,
    sample: any,
    isStart: boolean,
    id: number,
  ) {
    const found = tile.geometriesLocation[position];
    this.tileLoadSample(tile, sample, found);
    if (isStart) {
      const box = this._boxes.get(id);
      this._temp.vector.copy(tile.location!);
      this._temp.vector.negate();
      box.translate(this._temp.vector);
      tile.box.union(box);
    }
  }

  private getSampleGeometries(sample: any, geomIndex: number) {
    if (Array.isArray(sample.geometries)) {
      return sample.geometries[geomIndex];
    }
    return sample.geometries;
  }

  private constructTile(tile: TileData) {
    if (tile.positionBuffer === undefined) {
      tile.positionBuffer = new Float32Array(tile.positionCount!);
      tile.usedMemory = tile.positionBuffer.byteLength;
      this.setTileBuffer(tile, "index", true);
      this.setTileBuffer(tile, "normal", false);
      this.setTileShellBuffer(tile);
    }
    const isStart = !tile.location;
    for (const [id, position] of tile.sampleLocation) {
      const sample = this.fetchSample(id, tile.lod!);
      if (sample && sample.geometries) {
        this.buildSampleInTile(tile, position, sample, isStart, id);
      }
    }
  }

  private fetchSampleTransform(tile: TileData, sample: any) {
    this._temp.vector.copy(tile.location!);
    this._temp.vector.negate();
    this._temp.matrix.identity();
    this._temp.matrix.setPosition(this._temp.vector);
    this._temp.matrix.multiply(sample.transform);
  }

  private hasChanged(id: number, lod: CurrentLod, vis: boolean, high: number) {
    const lodNeedsChanged = this.hasLodChanged(id, lod);
    const visibleChangd = this.hasVisibleChanged(id, vis);
    const highlightChanged = this.hasHighlightChanged(id, high);
    return lodNeedsChanged || visibleChangd || highlightChanged;
  }

  private setupTileLocation(tile: TileData, geometry: any, sample: any) {
    if (tile.location) {
      return;
    }
    const result = new THREE.Vector3();
    result.fromArray(geometry.positionBuffer!);
    result.applyMatrix4(sample.transform);
    tile.location = result;
  }

  private getTileData(tile: TileData) {
    const locations = this.getTileLocations(tile);
    const visibilityData = this.getTileVisibility(tile, locations);
    const highlight = this.getTileHighlight(tile, locations);
    const { highlightData, highlightIds } = highlight;
    return { visibilityData, highlightData, highlightIds };
  }

  private updateMemoryOnTileLoad(tile: TileData) {
    VirtualTilesController._graphicMemoryConsumed += tile.usedMemory!;
  }

  private fetchTileMatrixOnLoad(tile: TileData) {
    if (tile.location) {
      this._temp.matrix.identity();
      this._temp.matrix.setPosition(tile.location);
    }
  }

  private updateItem(itemId: number) {
    const sampleIds = this._boxes.sampleOf(itemId);
    if (sampleIds) {
      for (const sampleId of sampleIds) {
        this.updateMesh(sampleId);
      }
    }
  }

  private screenSize(dimension: number, distance: number) {
    const viewDimension = this.getViewDimension(distance);
    const screenDimension = dimension / viewDimension;
    return screenDimension * this._virtualView.viewSize;
  }

  private getTileDimensionClass(box: THREE.Box3) {
    const size = box.min.distanceToSquared(box.max);
    const small = this._params.smallTileSize;
    const medium = this._params.mediumTileSize;

    if (size > medium) {
      return TileDimension.LARGE;
    }

    if (size > small) {
      return TileDimension.MEDIUM;
    }

    return TileDimension.SMALL;
  }

  private getViewDimension(distance: number) {
    if (this._virtualView.orthogonalDimension) {
      return this._virtualView.orthogonalDimension;
    }
    const currentFov = this._virtualView.fov;
    const fovChanged = currentFov !== this._temp.pastFieldOfview;
    if (fovChanged) {
      this._temp.viewDimension = this.getPerspTrueDim(currentFov, 1);
      this._temp.pastFieldOfview = currentFov;
    }
    return distance * this._temp.viewDimension;
  }

  private loadTile(tileId: number, tile: TileData) {
    const tileData = this.getTileData(tile);
    this.fetchTileMatrixOnLoad(tile);
    this._meshConnection.process({
      tileRequestClass: TileRequestClass.CREATE,
      modelId: this._modelId,
      objectClass: tile.objectClass,
      tileId,
      itemId: undefined,
      tileData,
      indices: tile.indexBuffer,
      positions: tile.positionBuffer,
      normals: tile.normalBuffer,
      itemIds: tile.ids,
      material: tile.materialId,
      matrix: this._temp.matrix.clone(),
      aabb: tile.box.clone(),
      currentLod: tile.lod,
    });
    this.updateMemoryOnTileLoad(tile);
  }

  private meshData(mesh: VirtualMeshManager, allowVoid: boolean, lod: number) {
    const id = this._temp.representation.id();
    const customLod = mesh.getLodClass() === LodClass.CUSTOM;
    const wiresLod = lod === CurrentLod.WIRES;
    if (customLod && wiresLod) {
      const meshWithLod = mesh as any;
      const result = meshWithLod.fetchLod(id, allowVoid);
      return result;
    }
    const result = mesh.fetchMeshes(id, allowVoid);
    return result;
  }

  private tileAppendAttribute(
    a: TileData,
    b: TileData,
    name: keyof TileData,
    equal: boolean,
  ) {
    if (b[name] === undefined) {
      return;
    }

    if (equal) {
      (a[name] as any) = b[name] as any;
      return;
    }

    (a[name] as any) += b[name] as any;
  }

  private itemId(sample: number) {
    this.meshes.samples(sample, this._temp.sample);
    return this._temp.sample.item();
  }
}
