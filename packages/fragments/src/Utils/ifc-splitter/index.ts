/* eslint-disable max-classes-per-file */
/* eslint-disable no-use-before-define */
/* eslint-disable no-cond-assign */

import { Event } from "../event";
import {
  extractArgsString,
  extractLineMeta,
  extractRefs,
  parseHashRef,
  splitIfcArgs,
} from "../ifc-parsing-utils";
import { streamAsyncIterator } from "../ifc-stream";

// ---------------------------------------------------------------------------
// Exported interfaces
// ---------------------------------------------------------------------------

export interface IfcSplitterIO {
  /**
   * @param path
   * @throws if {@link path} doesn't exist
   * @returns a {@link ReadableStream} streaming ifc lines
   */
  readableStream(path: string): Promise<ReadableStream<string>>;

  /**
   * @param path
   * @returns a {@link WritableStream} able to write ifc lines
   */
  writableStream(path: string): Promise<WritableStream<string>>;
}

export type IfcSplitterStage =
  | "parse"
  | "spatial"
  | "void-fill"
  | "style-maps"
  | "classify"
  | "aggregate"
  | "cluster"
  | "distribute"
  | "relations"
  | "resolve"
  | "build-index"
  | "write";

export interface IfcSplitterProgressEvent {
  stage: IfcSplitterStage;
  timeElapsed: number;
}

export interface IfcSplitterWarningEvent {
  message: string;
  context: { id: number; type?: string };
}

/** Mapping of void/fill relationships between walls, openings, and fillers (doors/windows). */
export interface VoidFillMap {
  wallToOpenings: Map<number, Set<number>>;
  openingToWall: Map<number, number>;
  openingToFillers: Map<number, Set<number>>;
  fillerToOpening: Map<number, number>;
  relLineIds: Map<number, Set<number>>;
}

/** Parent-child aggregation relationships between building elements (e.g. roof to slabs). */
export interface AggregateMap {
  parentToChildren: Map<number, Set<number>>;
  childToParent: Map<number, number>;
  aggregateRelIds: Map<number, Set<number>>;
}

/** Reverse indices for IFCSTYLEDITEM and IFCMATERIALDEFINITIONREPRESENTATION backward pointers. */
export interface StyleMaps {
  geomToStyledItems: Map<number, number[]>;
  materialToDefReps: Map<number, number[]>;
}

/** Per-group output data: the set of IFC entity IDs to include and any rewritten relationship lines. */
export interface GroupData {
  /**
   * The `groupId` this data was resolved for — the value passed to `split`'s
   * `outputPath` callback. Carried explicitly rather than implied by position,
   * because groups that end up with no elements produce no entry at all.
   */
  groupId: number;
  fileIds: Set<number>;
  rewrittenLines: Map<number, string>;
  elementCount: number;
  totalIds: number;
  filePath: string;
}

export interface IfcSplitterGroupsEvent {
  /**
   * One entry per **non-empty** group, ascending by {@link GroupData.groupId}.
   * A `split` into more groups than there are element clusters simply yields
   * fewer entries than `numGroups` — use `groupId` to correlate, not the index.
   */
  data: GroupData[];
}

// ---------------------------------------------------------------------------
// Internal interfaces
// ---------------------------------------------------------------------------

interface ParseResult {
  header: string[];
  footer: string[];
  index: LineIndex;
}

interface RelEntry {
  id: number;
  type: string;
  args: string[];
  listIdx: number;
  listRefs: number[];
  idPrefix: string;
}

// ---------------------------------------------------------------------------
// IFC element categories we consider "splittable building elements"
// ---------------------------------------------------------------------------
const ELEMENT_TYPES: Set<string> = new Set([
  "IFCWALL",
  "IFCWALLSTANDARDCASE",
  "IFCWALLELEMENTEDCASE",
  "IFCSLAB",
  "IFCSLABSTANDARDCASE",
  "IFCSLABELEMENTEDCASE",
  "IFCBEAM",
  "IFCBEAMSTANDARDCASE",
  "IFCCOLUMN",
  "IFCCOLUMNSTANDARDCASE",
  "IFCDOOR",
  "IFCDOORSTANDARDCASE",
  "IFCWINDOW",
  "IFCWINDOWSTANDARDCASE",
  "IFCROOF",
  "IFCSTAIR",
  "IFCSTAIRFLIGHT",
  "IFCRAMP",
  "IFCRAMPFLIGHT",
  "IFCCURTAINWALL",
  "IFCCOVERING",
  "IFCRAILING",
  "IFCPLATE",
  "IFCPLATESTANDARDCASE",
  "IFCMEMBER",
  "IFCMEMBERSTANDARDCASE",
  "IFCFOOTING",
  "IFCPILE",
  "IFCFURNISHINGELEMENT",
  "IFCSANITARYTERMINAL",
  "IFCFLOWSEGMENT",
  "IFCFLOWTERMINAL",
  "IFCFLOWCONTROLLER",
  "IFCFLOWFITTING",
  "IFCFLOWMOVINGDEVICE",
  "IFCFLOWSTORAGEDEVICE",
  "IFCFLOWTREATMENTDEVICE",
  "IFCENERGYCONVERSIONDEVICE",
  "IFCDISTRIBUTIONFLOWELEMENT",
  "IFCDISTRIBUTIONCONTROLELEMENT",
  "IFCDISTRIBUTIONELEMENT",
  "IFCDISTRIBUTIONPORT",
  "IFCBUILDINGELEMENTPROXY",
  "IFCBUILDINGELEMENTPART",
  "IFCOPENINGELEMENT",
  "IFCSPACE",
  "IFCTRANSPORTELEMENT",
  "IFCVIRTUALELEMENT",
  "IFCSHADINGDEVICE",
  "IFCCHIMNEY",
  "IFCGEOGRAPHICELEMENT",
  "IFCPROXY",
  "IFCMECHANICALFASTENER",
]);

const SPATIAL_TYPES: Set<string> = new Set([
  "IFCPROJECT",
  "IFCSITE",
  "IFCBUILDING",
  "IFCBUILDINGSTOREY",
]);

/**
 * Returns the argument index at which a given IFC type stores its list of
 * "related objects". Getting this wrong causes the rewriter to read the wrong
 * field, end up with an empty list, and skip the line entirely — dropping all
 * its transitive dependencies (property sets, materials, styles, etc.) from
 * the split output.
 */
const listIdxByType = (type: string): number => {
  switch (type) {
    case "IFCRELAGGREGATES":
      return 5;
    case "IFCRELCONNECTSWITHREALIZINGELEMENTS":
      return 7;
    case "IFCPRESENTATIONLAYERASSIGNMENT":
      return 2;
    default:
      return 4;
  }
};

/**
 * Whether the splitter should rewrite a line of this type per-group. Covers
 * all IFCREL* types (except void/fill, which are handled separately) plus a
 * few non-REL types that still reference lists of elements.
 */
const shouldRewriteType = (type: string): boolean => {
  if (type === "IFCRELVOIDSELEMENT") return false;
  if (type === "IFCRELFILLSELEMENT") return false;
  if (type.startsWith("IFCREL")) return true;
  if (type === "IFCPRESENTATIONLAYERASSIGNMENT") return true;
  return false;
};

// ---------------------------------------------------------------------------
// Compact line storage: sparse arrays indexed by IFC id
// ---------------------------------------------------------------------------
class LineIndex {
  types: (string | undefined)[] = [];
  maxId: number = 0;
  private _typeIntern: Map<string, string> = new Map();
  specialRaws: Map<number, string> = new Map();

  private _refBuf: Int32Array = new Int32Array(4 * 1024 * 1024);
  private _refBufUsed: number = 0;
  private _refStart: (number | undefined)[] = [];
  private _refLen: (number | undefined)[] = [];

  set(id: number, type: string, refs: number[], raw: string): void {
    let t = this._typeIntern.get(type);
    if (!t) {
      t = type;
      this._typeIntern.set(type, t);
    }
    this.types[id] = t;
    if (id > this.maxId) this.maxId = id;

    const start = this._refBufUsed;
    const needed = start + refs.length;
    if (needed > this._refBuf.length) {
      const newSize = Math.max(this._refBuf.length * 2, needed);
      const newBuf = new Int32Array(newSize);
      newBuf.set(this._refBuf);
      this._refBuf = newBuf;
    }
    for (let i = 0; i < refs.length; i++) {
      this._refBuf[start + i] = refs[i];
    }
    this._refBufUsed = start + refs.length;
    this._refStart[id] = start;
    this._refLen[id] = refs.length;

    if (
      t.startsWith("IFCREL") ||
      t === "IFCSTYLEDITEM" ||
      t === "IFCMATERIALDEFINITIONREPRESENTATION"
    ) {
      this.specialRaws.set(id, raw);
    }
  }

  finalize(): void {
    this._refBuf = this._refBuf.slice(0, this._refBufUsed);
  }

  has(id: number): boolean {
    return this.types[id] !== undefined;
  }

  getType(id: number): string | undefined {
    return this.types[id];
  }

  getRefs(id: number): Int32Array | null {
    const len = this._refLen[id];
    if (len === undefined) return null;
    const start = this._refStart[id];
    if (start === undefined) return null;
    return this._refBuf.subarray(start, start + len);
  }

  getRaw(id: number): string | undefined {
    return this.specialRaws.get(id);
  }

  getAll(types: Set<string>) {
    const allElementIds = new Set<number>();
    for (let id = 0; id <= this.maxId; id++) {
      const type = this.getType(id);
      if (type && types.has(type)) allElementIds.add(id);
    }
    return allElementIds;
  }

  free(): void {
    // Deliberately null-out fields to reclaim memory before the write pass
    /* eslint-disable @typescript-eslint/no-explicit-any */
    (this as any).types = null;
    (this as any)._refBuf = null;
    (this as any)._refStart = null;
    (this as any)._refLen = null;
    (this as any).specialRaws = null;
  }
}

// ---------------------------------------------------------------------------
// Collect all ids referenced by a given id, recursively.
// Stops at element boundaries to avoid pulling in other groups' elements.
// ---------------------------------------------------------------------------
function collectDeps(
  startId: number,
  index: LineIndex,
  visited: Set<number>,
  allElementIds: Set<number>,
): void {
  const stack = [startId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const refs = index.getRefs(id);
    if (!refs) continue;
    for (let i = 0; i < refs.length; i++) {
      const refId = refs[i];
      if (visited.has(refId)) continue;
      if (allElementIds.has(refId)) continue;
      stack.push(refId);
    }
  }
}

function collectDepsAll(
  startId: number,
  index: LineIndex,
  visited: Set<number>,
): void {
  const stack = [startId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const refs = index.getRefs(id);
    if (!refs) continue;
    for (let i = 0; i < refs.length; i++) {
      if (!visited.has(refs[i])) stack.push(refs[i]);
    }
  }
}

// ---------------------------------------------------------------------------
// Build void/fill coupling map
// ---------------------------------------------------------------------------
function buildVoidFillMap(index: LineIndex): VoidFillMap {
  const wallToOpenings = new Map<number, Set<number>>();
  const openingToWall = new Map<number, number>();
  const openingToFillers = new Map<number, Set<number>>();
  const fillerToOpening = new Map<number, number>();
  const relLineIds = new Map<number, Set<number>>();

  for (let id = 0; id <= index.maxId; id++) {
    const type = index.getType(id);
    if (!type) continue;

    if (type === "IFCRELVOIDSELEMENT") {
      const raw = index.getRaw(id);
      const argsStr = extractArgsString(raw);
      if (argsStr) {
        const args = splitIfcArgs(argsStr);
        if (args.length >= 6) {
          const wallId = parseHashRef(args[4]);
          const openingId = parseHashRef(args[5]);
          if (wallId && openingId) {
            if (!wallToOpenings.has(wallId))
              wallToOpenings.set(wallId, new Set());
            wallToOpenings.get(wallId)!.add(openingId);
            openingToWall.set(openingId, wallId);
            addToSetMap(relLineIds, wallId, id);
            addToSetMap(relLineIds, openingId, id);
          }
        }
      }
    } else if (type === "IFCRELFILLSELEMENT") {
      const raw = index.getRaw(id);
      const argsStr = extractArgsString(raw);
      if (argsStr) {
        const args = splitIfcArgs(argsStr);
        if (args.length >= 6) {
          const openingId = parseHashRef(args[4]);
          const fillerId = parseHashRef(args[5]);
          if (openingId && fillerId) {
            if (!openingToFillers.has(openingId))
              openingToFillers.set(openingId, new Set());
            openingToFillers.get(openingId)!.add(fillerId);
            fillerToOpening.set(fillerId, openingId);
            addToSetMap(relLineIds, openingId, id);
            addToSetMap(relLineIds, fillerId, id);
          }
        }
      }
    }
  }

  return {
    wallToOpenings,
    openingToWall,
    openingToFillers,
    fillerToOpening,
    relLineIds,
  };
}

function buildAggregateMap(
  index: LineIndex,
  allElementIds: Set<number>,
): AggregateMap {
  const parentToChildren = new Map<number, Set<number>>();
  const childToParent = new Map<number, number>();
  const aggregateRelIds = new Map<number, Set<number>>();

  for (let id = 0; id <= index.maxId; id++) {
    const type = index.getType(id);
    if (type !== "IFCRELAGGREGATES") continue;

    const raw = index.getRaw(id);
    const argsStr = extractArgsString(raw);
    if (!argsStr) continue;
    const args = splitIfcArgs(argsStr);
    if (args.length < 6) continue;

    const parentId = parseHashRef(args[4]);
    if (!parentId || !allElementIds.has(parentId)) continue;

    const childRefs = extractRefs(args[5]);
    const elementChildren = childRefs.filter((r) => allElementIds.has(r));
    if (elementChildren.length === 0) continue;

    if (!parentToChildren.has(parentId))
      parentToChildren.set(parentId, new Set());
    for (const cid of elementChildren) {
      parentToChildren.get(parentId)!.add(cid);
      childToParent.set(cid, parentId);
      addToSetMap(aggregateRelIds, parentId, id);
      addToSetMap(aggregateRelIds, cid, id);
    }
  }

  return { parentToChildren, childToParent, aggregateRelIds };
}

function traverseSpatialStructure(index: LineIndex) {
  const spatialIds = new Set<number>();
  for (let id = 0; id <= index.maxId; id++) {
    const type = index.getType(id);
    if (type && SPATIAL_TYPES.has(type)) spatialIds.add(id);
  }
  const sharedIds = new Set<number>();
  for (const sid of spatialIds) {
    collectDepsAll(sid, index, sharedIds);
  }
  for (let id = 0; id <= index.maxId; id++) {
    const type = index.getType(id);
    if (type === "IFCRELAGGREGATES") {
      const raw = index.getRaw(id);
      const argsStr = extractArgsString(raw);
      if (argsStr) {
        const args = splitIfcArgs(argsStr);
        if (args.length >= 6) {
          const relatingId = parseHashRef(args[4]);
          if (relatingId && spatialIds.has(relatingId)) {
            const listRefs = extractRefs(args[5]);
            if (listRefs.every((r) => spatialIds.has(r))) {
              collectDepsAll(id, index, sharedIds);
            }
          }
        }
      }
    }
  }
  return sharedIds;
}

function addToSetMap(
  map: Map<number, Set<number>>,
  key: number,
  value: number,
): void {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key)!.add(value);
}

// ---------------------------------------------------------------------------
// Cluster elements that must stay together (void/fill + aggregation)
// ---------------------------------------------------------------------------
function getCluster(
  elementId: number,
  vfMap: VoidFillMap,
  aggMap: AggregateMap,
): Set<number> {
  const cluster = new Set([elementId]);
  const queue = [elementId];

  while (queue.length > 0) {
    const eid = queue.shift()!;
    expandVoidFill(eid, vfMap, cluster, queue);
    expandAggregate(eid, aggMap, cluster, queue);
  }

  return cluster;
}

function expandVoidFill(
  eid: number,
  vfMap: VoidFillMap,
  cluster: Set<number>,
  queue: number[],
): void {
  function addIfNew(id: number): void {
    if (!cluster.has(id)) {
      cluster.add(id);
      queue.push(id);
    }
  }

  const openings = vfMap.wallToOpenings.get(eid);
  if (openings) {
    for (const oid of openings) {
      addIfNew(oid);
      const fillers = vfMap.openingToFillers.get(oid);
      if (fillers) for (const fid of fillers) addIfNew(fid);
    }
  }

  const oid2 = vfMap.fillerToOpening.get(eid);
  if (oid2) {
    addIfNew(oid2);
    const wallId = vfMap.openingToWall.get(oid2);
    if (wallId) addIfNew(wallId);
  }

  const wallId2 = vfMap.openingToWall.get(eid);
  if (wallId2) addIfNew(wallId2);
}

function expandAggregate(
  eid: number,
  aggMap: AggregateMap,
  cluster: Set<number>,
  queue: number[],
): void {
  function addIfNew(id: number): void {
    if (!cluster.has(id)) {
      cluster.add(id);
      queue.push(id);
    }
  }

  const children = aggMap.parentToChildren.get(eid);
  if (children) {
    for (const cid of children) addIfNew(cid);
  }

  const parentId = aggMap.childToParent.get(eid);
  if (parentId) {
    addIfNew(parentId);
    const siblings = aggMap.parentToChildren.get(parentId);
    if (siblings) {
      for (const sid of siblings) addIfNew(sid);
    }
  }
}

// ---------------------------------------------------------------------------
// Build reverse style maps
// ---------------------------------------------------------------------------
function buildStyleMaps(index: LineIndex): StyleMaps {
  const geomToStyledItems = new Map<number, number[]>();
  const materialToDefReps = new Map<number, number[]>();

  for (let id = 0; id <= index.maxId; id++) {
    const type = index.getType(id);
    if (!type) continue;

    if (type === "IFCSTYLEDITEM") {
      const raw = index.getRaw(id);
      const argsStr = extractArgsString(raw);
      if (!argsStr) continue;
      const args = splitIfcArgs(argsStr);
      if (args.length >= 1) {
        const geomRef = parseHashRef(args[0]);
        if (geomRef) {
          if (!geomToStyledItems.has(geomRef))
            geomToStyledItems.set(geomRef, []);
          geomToStyledItems.get(geomRef)!.push(id);
        }
      }
    } else if (type === "IFCMATERIALDEFINITIONREPRESENTATION") {
      const raw = index.getRaw(id);
      const argsStr = extractArgsString(raw);
      if (!argsStr) continue;
      const args = splitIfcArgs(argsStr);
      if (args.length >= 4) {
        const matRef = parseHashRef(args[3]);
        if (matRef) {
          if (!materialToDefReps.has(matRef)) materialToDefReps.set(matRef, []);
          materialToDefReps.get(matRef)!.push(id);
        }
      }
    }
  }

  return { geomToStyledItems, materialToDefReps };
}

function resolveStyles(
  fileIds: Set<number>,
  index: LineIndex,
  styleMaps: StyleMaps,
  allElementIds: Set<number>,
): void {
  for (const [geomId, styledItemIds] of styleMaps.geomToStyledItems) {
    if (fileIds.has(geomId)) {
      for (const sid of styledItemIds) {
        collectDeps(sid, index, fileIds, allElementIds);
      }
    }
  }
  for (const [matId, defRepIds] of styleMaps.materialToDefReps) {
    if (fileIds.has(matId)) {
      for (const mid of defRepIds) {
        collectDeps(mid, index, fileIds, allElementIds);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main split logic
// ---------------------------------------------------------------------------

/**
 * Maps every parsed IFC id to the groups whose output file must contain it.
 *
 * Laid out CSR-style — `starts` slices into a flat `members` array — rather
 * than as one bit per group in a `Uint32Array`, so the number of groups is not
 * capped at 32. Lookup is a `subarray` view: O(1) and allocation-free, which
 * matters because the write pass calls it once per data line.
 */
class IdGroupIndex {
  private readonly starts: Uint32Array;
  private readonly members: Uint32Array;
  private readonly maxId: number;

  constructor(groupsData: GroupData[], maxId: number) {
    // Pass 1 — count each id's memberships into starts[id + 1], so the prefix
    // sum below leaves starts[id] holding the id's own start offset.
    const starts = new Uint32Array(maxId + 2);
    let total = 0;
    for (const groupData of groupsData) {
      for (const id of groupData.fileIds) {
        if (id < 0 || id > maxId) continue; // dangling ref, no line to emit
        starts[id + 1] += 1;
        total += 1;
      }
    }
    for (let i = 1; i < starts.length; i++) starts[i] += starts[i - 1];

    // Pass 2 — place positions. `members` holds indices into `groupsData`, not
    // `GroupData.groupId`, so it stays aligned with the writers array, which is
    // built from `groupsData` the same way.
    const members = new Uint32Array(total);
    const cursor = starts.slice();
    for (let g = 0; g < groupsData.length; g++) {
      for (const id of groupsData[g].fileIds) {
        if (id < 0 || id > maxId) continue;
        members[cursor[id]] = g;
        cursor[id] += 1;
      }
    }

    this.starts = starts;
    this.members = members;
    this.maxId = maxId;
  }

  /**
   * Positions in `groupsData` of the groups that include `id`, ascending.
   * Empty if none.
   */
  groupsOf(id: number): Uint32Array {
    if (id < 0 || id > this.maxId) return new Uint32Array(0);
    return this.members.subarray(this.starts[id], this.starts[id + 1]);
  }
}

async function emitSplitLine(
  writers: WritableStreamDefaultWriter[],
  raw: string,
  groupsData: GroupData[],
  idGroups: IdGroupIndex,
): Promise<void> {
  if (raw.charCodeAt(0) !== 35) return; // '#'
  let id = 0;
  for (let i = 1; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    if (c >= 48 && c <= 57) {
      id = id * 10 + (c - 48);
    } else {
      break;
    }
  }
  if (id === 0) return;

  const groups = idGroups.groupsOf(id);
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const line = groupsData[g].rewrittenLines.get(id) ?? raw;
    await writers[g].write(`${line}\n`);
  }
}

async function emitExtractLine(
  writer: WritableStreamDefaultWriter,
  raw: string,
  includeSet: Set<number>,
  rewrittenLines: Map<number, string>,
): Promise<void> {
  if (raw.charCodeAt(0) !== 35) return; // '#'
  let id = 0;
  for (let i = 1; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    if (c >= 48 && c <= 57) {
      id = id * 10 + (c - 48);
    } else {
      break;
    }
  }
  if (id === 0 || !includeSet.has(id)) return;
  const line = rewrittenLines.get(id) ?? raw;
  await writer.write(`${line}\n`);
}

/**
 * Abort every writer, swallowing secondary failures so the original error is
 * the one that propagates. Aborting an already closed writer rejects — that is
 * expected and ignored.
 */
async function abortWriters(
  writers: WritableStreamDefaultWriter[],
  reason?: unknown,
): Promise<void> {
  await Promise.allSettled(writers.map(async (writer) => writer.abort(reason)));
}

export class IfcSplitter {
  protected readonly io: IfcSplitterIO;
  protected readonly eventTarget: EventTarget;

  constructor(ifcSplitterIO: IfcSplitterIO) {
    this.io = ifcSplitterIO;
    this.eventTarget = new EventTarget();
  }

  readonly onProgress = new Event<IfcSplitterProgressEvent>();

  readonly onSplitsResolved = new Event<IfcSplitterGroupsEvent>();

  /**
   * Fires from `extract` when an id is missing or has a wrong type
   */
  readonly onExtractWarning = new Event<IfcSplitterWarningEvent>();

  /**
   * Split an IFC file into N roughly equal groups of building elements.
   * @param inputPath - Absolute or relative path to the source IFC file.
   * @param numGroups - Number of output files to produce. Not capped by the
   * splitter, but note that the write pass holds one open writer per non-empty
   * group, so the practical ceiling is the process' file descriptor limit.
   * @param outputPath - Given `groupId` returns output file path.
   * @returns a map keyed by {@link GroupData.groupId}.
   * @throws {RangeError} if `numGroups` is not a positive integer.
   */
  async split(
    inputPath: string,
    numGroups: number,
    outputPath: (groupId: number) => string,
  ): Promise<Map<number, { path: string; ids: Set<number> }>> {
    if (!Number.isInteger(numGroups) || numGroups < 1) {
      throw new RangeError(
        `numGroups must be a positive integer, received ${numGroups}`,
      );
    }

    // 1. Parse
    const parseStart = performance.now();
    const { header, footer, index } = await this.parseIfc(inputPath);
    this.emitProgressEvent("parse", parseStart);

    // 2. Identify spatial structure (shared in all files)
    const spatialStart = performance.now();
    const sharedIds = traverseSpatialStructure(index);
    this.emitProgressEvent("spatial", spatialStart);

    // 3. Build void/fill coupling map
    const voidFillStart = performance.now();
    const vfMap = buildVoidFillMap(index);
    this.emitProgressEvent("void-fill", voidFillStart);

    // 3b. Build reverse style maps
    const styleMapsStart = performance.now();
    const styleMaps = buildStyleMaps(index);
    this.emitProgressEvent("style-maps", styleMapsStart);

    // 4. Identify all building elements
    const classifyStart = performance.now();
    const allElementIds = index.getAll(ELEMENT_TYPES);
    this.emitProgressEvent("classify", classifyStart);

    // 4b. Build aggregation map
    const aggregateStart = performance.now();
    const aggMap = buildAggregateMap(index, allElementIds);
    this.emitProgressEvent("aggregate", aggregateStart);

    // 5. Build clusters
    const clusterStart = performance.now();
    const clusters: Set<number>[] = [];
    const assigned = new Set<number>();
    for (const eid of allElementIds) {
      if (assigned.has(eid)) continue;
      const cluster = getCluster(eid, vfMap, aggMap);
      const elementCluster = new Set<number>();
      for (const cid of cluster) {
        if (allElementIds.has(cid)) elementCluster.add(cid);
      }
      clusters.push(elementCluster);
      for (const cid of elementCluster) assigned.add(cid);
    }
    this.emitProgressEvent("cluster", clusterStart);

    // 6. Distribute clusters into N groups (greedy bin packing)
    const distributeStart = performance.now();
    const groups: Set<number>[] = Array.from(
      { length: numGroups },
      () => new Set(),
    );
    const clusterOrder = clusters
      .map((_, i) => i)
      .sort((a, b) => clusters[b].size - clusters[a].size);
    const groupSizes = new Array<number>(numGroups).fill(0);

    for (const ci of clusterOrder) {
      let minIdx = 0;
      for (let g = 1; g < numGroups; g++) {
        if (groupSizes[g] < groupSizes[minIdx]) minIdx = g;
      }
      for (const id of clusters[ci]) groups[minIdx].add(id);
      groupSizes[minIdx] += clusters[ci].size;
    }
    this.emitProgressEvent("distribute", distributeStart);

    // 7. Pre-parse all relationship lines that need per-group rewriting.
    const relationsStart = performance.now();
    const relEntries: RelEntry[] = [];
    for (let id = 0; id <= index.maxId; id++) {
      const type = index.getType(id);
      if (type && shouldRewriteType(type)) {
        const raw = index.getRaw(id);
        const argsStr = extractArgsString(raw);
        if (!argsStr) continue;
        const args = splitIfcArgs(argsStr);
        const listIdx = listIdxByType(type);
        if (args.length <= listIdx) continue;
        const listRefs = extractRefs(args[listIdx]);
        if (listRefs.length === 0) continue;
        const idMatch = raw!.match(/^(#\d+\s*=\s*)/);
        if (!idMatch) continue;
        relEntries.push({
          id,
          type,
          args,
          listIdx,
          listRefs,
          idPrefix: idMatch[1],
        });
      }
    }
    this.emitProgressEvent("relations", relationsStart);

    // 8. Resolve deps for all groups
    const resolveStart = performance.now();
    const groupsData: GroupData[] = [];

    for (let g = 0; g < numGroups; g++) {
      const groupElementIds = groups[g];
      // A group gets nothing when there are fewer clusters than `numGroups`.
      // Such a group produces no entry and no output file, so `groupsData` is
      // dense and every consumer correlates via `groupId` rather than position.
      if (groupElementIds.size === 0) continue;

      const fileIds = new Set<number>(sharedIds);

      for (const eid of groupElementIds) {
        collectDeps(eid, index, fileIds, allElementIds);
      }

      for (const eid of groupElementIds) {
        const rels = vfMap.relLineIds.get(eid);
        if (rels) {
          for (const rid of rels) {
            collectDeps(rid, index, fileIds, allElementIds);
          }
        }
        const aggRels = aggMap.aggregateRelIds.get(eid);
        if (aggRels) {
          for (const rid of aggRels) {
            collectDeps(rid, index, fileIds, allElementIds);
          }
        }
      }

      resolveStyles(fileIds, index, styleMaps, allElementIds);

      const rewrittenLines = new Map<number, string>();
      for (const rel of relEntries) {
        const filtered = rel.listRefs.filter((r) => groupElementIds.has(r));
        if (filtered.length === 0) continue;
        const newList = `(${filtered.map((r) => `#${r}`).join(",")})`;
        const newArgs = [...rel.args];
        newArgs[rel.listIdx] = newList;
        const rewritten = `${rel.idPrefix}${rel.type}(${newArgs.join(",")});`;
        rewrittenLines.set(rel.id, rewritten);
        fileIds.add(rel.id);
        const refs = index.getRefs(rel.id);
        if (refs) {
          for (const rid of refs) {
            if (!allElementIds.has(rid)) {
              collectDeps(rid, index, fileIds, allElementIds);
            }
          }
        }
      }

      const totalIds = fileIds.size;
      groupsData.push({
        groupId: g,
        fileIds,
        rewrittenLines,
        elementCount: groupElementIds.size,
        totalIds,
        filePath: outputPath(g),
      });
    }

    this.emitProgressEvent("resolve", resolveStart);
    this.onSplitsResolved.trigger({ data: groupsData });

    // Free the index to reclaim memory before the output pass
    const maxParsedId = index.maxId;
    index.free();

    // 9. Invert fileIds into an id -> groups index for O(1) write-phase lookups
    const buildIndexStart = performance.now();
    const idGroups = new IdGroupIndex(groupsData, maxParsedId);
    this.emitProgressEvent("build-index", buildIndexStart);

    // 10. Second pass: write output files
    const writeStart = performance.now();
    await this.writeSplitOutput(
      inputPath,
      header,
      footer,
      groupsData,
      idGroups,
    );
    this.emitProgressEvent("write", writeStart);

    return new Map(
      groupsData.map(({ groupId, filePath, fileIds }) => [
        groupId,
        { path: filePath, ids: fileIds },
      ]),
    );
  }

  /**
   * Extract specific building elements from an IFC file into a new IFC file.
   * @param inputPath  - Absolute or relative path to the source IFC file.
   * @param elementIds - Array of IFC entity IDs (`#id`) for the building elements to extract. Non-element or missing IDs are skipped, each reported through {@link onExtractWarning}.
   * @param outputPath - Path for the output IFC file.
   * @throws {Error} if none of `elementIds` resolves to a building element. No
   * output file is produced in that case.
   */
  async extract(
    inputPath: string,
    elementIds: number[],
    outputPath: string,
  ): Promise<Set<number>> {
    // 1. Parse
    const parseStart = performance.now();
    const { header, footer, index } = await this.parseIfc(inputPath);
    this.emitProgressEvent("parse", parseStart);

    // 2. Identify spatial structure (shared)
    const spatialStart = performance.now();
    const sharedIds = traverseSpatialStructure(index);
    this.emitProgressEvent("spatial", spatialStart);

    // 3. Build maps
    const voidFillStart = performance.now();
    const vfMap = buildVoidFillMap(index);
    this.emitProgressEvent("void-fill", voidFillStart);

    const styleMapsStart = performance.now();
    const styleMaps = buildStyleMaps(index);
    this.emitProgressEvent("style-maps", styleMapsStart);

    const classifyStart = performance.now();
    const allElementIds = index.getAll(ELEMENT_TYPES);
    this.emitProgressEvent("classify", classifyStart);

    // 4. Cluster: expand void/fill + aggregation for requested elements
    const aggregateStart = performance.now();
    const aggMap = buildAggregateMap(index, allElementIds);
    this.emitProgressEvent("aggregate", aggregateStart);

    const clusterStart = performance.now();

    // Validate requested IDs
    const requestedIds = new Set<number>();
    for (const eid of elementIds) {
      if (allElementIds.has(eid)) {
        requestedIds.add(eid);
      } else if (index.has(eid)) {
        const type = index.getType(eid);
        this.onExtractWarning.trigger({
          message: `Skipping #${eid}: type '${type}' is not a building element`,
          context: { id: eid, type },
        });
      } else {
        this.onExtractWarning.trigger({
          message: `Skipping #${eid}: not found`,
          context: { id: eid },
        });
      }
    }
    if (requestedIds.size === 0) {
      throw new Error("No valid element IDs found.");
    }

    const groupElementIds = new Set<number>(requestedIds);
    for (const eid of requestedIds) {
      const cluster = getCluster(eid, vfMap, aggMap);
      for (const cid of cluster) {
        if (allElementIds.has(cid)) groupElementIds.add(cid);
      }
    }
    this.emitProgressEvent("cluster", clusterStart);

    // 5. Rewrite relationship lines
    const relationsStart = performance.now();
    const fileIds = new Set<number>(sharedIds);
    const rewrittenLines = new Map<number, string>();
    for (let id = 0; id <= index.maxId; id++) {
      const type = index.getType(id);
      if (type && shouldRewriteType(type)) {
        const raw = index.getRaw(id);
        const argsStr = extractArgsString(raw);
        if (!argsStr) continue;
        const args = splitIfcArgs(argsStr);
        const listIdx = listIdxByType(type);
        if (args.length <= listIdx) continue;
        const listRefs = extractRefs(args[listIdx]);
        if (listRefs.length === 0) continue;

        const filtered = listRefs.filter((r) => groupElementIds.has(r));
        if (filtered.length === 0) continue;

        const idMatch = raw!.match(/^(#\d+\s*=\s*)/);
        if (!idMatch) continue;
        const newList = `(${filtered.map((r) => `#${r}`).join(",")})`;
        const newArgs = [...args];
        newArgs[listIdx] = newList;
        rewrittenLines.set(id, `${idMatch[1]}${type}(${newArgs.join(",")});`);
        fileIds.add(id);
        const refs = index.getRefs(id);
        if (refs) {
          for (const rid of refs) {
            if (!allElementIds.has(rid))
              collectDeps(rid, index, fileIds, allElementIds);
          }
        }
      }
    }
    this.emitProgressEvent("relations", relationsStart);

    // 6. Collect all dependencies
    const resolveStart = performance.now();
    for (const eid of groupElementIds) {
      collectDeps(eid, index, fileIds, allElementIds);
    }
    for (const eid of groupElementIds) {
      const rels = vfMap.relLineIds.get(eid);
      if (rels) {
        for (const rid of rels) collectDeps(rid, index, fileIds, allElementIds);
      }
      const aggRels = aggMap.aggregateRelIds.get(eid);
      if (aggRels) {
        for (const rid of aggRels)
          collectDeps(rid, index, fileIds, allElementIds);
      }
    }
    resolveStyles(fileIds, index, styleMaps, allElementIds);

    this.emitProgressEvent("resolve", resolveStart);

    // 7. Free index, write output
    index.free();

    const writeStart = performance.now();
    const writer = (await this.io.writableStream(outputPath)).getWriter();
    let closed = false;
    try {
      await writer.write(`${header.join("\n")}\n`);

      let section: "header" | "data" | "footer" = "header";
      let accumulator = "";

      await this.forEachLine(inputPath, async (line: string) => {
        if (section === "header") {
          if (line.trim() === "DATA;") section = "data";
          return;
        }
        if (section === "data") {
          const trimmed = line.trim();
          if (trimmed === "ENDSEC;") {
            if (accumulator) {
              await emitExtractLine(
                writer,
                accumulator,
                fileIds,
                rewrittenLines,
              );
              accumulator = "";
            }
            section = "footer";
            return;
          }

          if (!accumulator && trimmed.charCodeAt(trimmed.length - 1) === 59) {
            await emitExtractLine(writer, trimmed, fileIds, rewrittenLines);
            return;
          }

          accumulator += (accumulator ? " " : "") + trimmed;
          if (accumulator.charCodeAt(accumulator.length - 1) === 59) {
            await emitExtractLine(writer, accumulator, fileIds, rewrittenLines);
            accumulator = "";
          }
        }
      });

      await writer.write(`${footer.join("\n")}\n`);
      await writer.close();
      closed = true;
    } finally {
      // Reading or writing may reject mid-stream; release the sink either way.
      if (!closed) await abortWriters([writer]);
    }
    this.emitProgressEvent("write", writeStart);

    return fileIds;
  }

  async parseIfc(filePath: string): Promise<ParseResult> {
    const header: string[] = [];
    const footer: string[] = [];
    const index = new LineIndex();

    let section: "header" | "data" | "footer" = "header";
    let accumulator = "";
    let lineCount = 0;

    await this.forEachLine(filePath, (line: string) => {
      if (section === "header") {
        header.push(line);
        if (line.trim() === "DATA;") section = "data";
        return;
      }
      if (section === "data") {
        const trimmed = line.trim();
        if (trimmed === "ENDSEC;") {
          if (accumulator) {
            const info = extractLineMeta(accumulator);
            if (info) {
              const refs = extractRefs(accumulator, info.id);
              index.set(info.id, info.type, refs, accumulator);
              lineCount++;
            }
            accumulator = "";
          }
          section = "footer";
          footer.push(line);
          return;
        }
        accumulator += (accumulator ? " " : "") + trimmed;
        if (accumulator.charCodeAt(accumulator.length - 1) === 59) {
          // ';'
          const info = extractLineMeta(accumulator);
          if (info) {
            const refs = extractRefs(accumulator, info.id);
            index.set(info.id, info.type, refs, accumulator);
            lineCount++;
          }
          accumulator = "";
        }
        return;
      }
      footer.push(line);
    });

    index.finalize();

    return { header, footer, index };
  }

  /**
   * Chunked file reader — replaces readline (3-5x faster)
   */
  async forEachLine(
    filePath: string,
    callback: (line: string) => void | Promise<void>,
  ): Promise<void> {
    const readableStream = await this.io.readableStream(filePath);

    for await (const line of streamAsyncIterator(readableStream)) {
      await callback(line);
    }
  }

  protected async writeSplitOutput(
    inputPath: string,
    header: string[],
    footer: string[],
    groupsData: GroupData[],
    idGroups: IdGroupIndex,
  ): Promise<void> {
    const headerStr = `${header.join("\n")}\n`;
    const writers = await this.openGroupWriters(groupsData, headerStr);

    let section: "header" | "data" | "footer" = "header";
    let accumulator = "";
    let closed = false;

    try {
      await this.forEachLine(inputPath, async (line: string) => {
        if (section === "header") {
          if (line.trim() === "DATA;") section = "data";
          return;
        }
        if (section === "data") {
          const trimmed = line.trim();
          if (trimmed === "ENDSEC;") {
            if (accumulator) {
              await emitSplitLine(writers, accumulator, groupsData, idGroups);
              accumulator = "";
            }
            section = "footer";
            return;
          }

          if (!accumulator && trimmed.charCodeAt(trimmed.length - 1) === 59) {
            await emitSplitLine(writers, trimmed, groupsData, idGroups);
            return;
          }

          accumulator += (accumulator ? " " : "") + trimmed;
          if (accumulator.charCodeAt(accumulator.length - 1) === 59) {
            await emitSplitLine(writers, accumulator, groupsData, idGroups);
            accumulator = "";
          }
        }
      });

      const footerStr = `${footer.join("\n")}\n`;
      await Promise.all(
        writers.map(async (writer) => {
          await writer.write(footerStr);
          await writer.close();
        }),
      );
      closed = true;
    } finally {
      // Any read/write rejection leaves every sink open — abort them all rather
      // than leaking one file handle per group.
      if (!closed) await abortWriters(writers);
    }
  }

  /**
   * Open one writer per non-empty group and prime it with the header. If any
   * writer fails to open, the ones already opened are aborted before rethrowing.
   */
  private async openGroupWriters(
    groupsData: GroupData[],
    headerStr: string,
  ): Promise<WritableStreamDefaultWriter[]> {
    const settled = await Promise.allSettled(
      groupsData.map(async (groupData) => {
        const writer = (
          await this.io.writableStream(groupData.filePath)
        ).getWriter();
        await writer.write(headerStr);
        return writer;
      }),
    );

    const opened = settled.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    const failure = settled.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (failure) {
      await abortWriters(opened, failure.reason);
      throw failure.reason;
    }
    return opened;
  }

  protected emitProgressEvent(stage: IfcSplitterStage, start: number) {
    this.onProgress.trigger({
      stage,
      timeElapsed: performance.now() - start,
    });
  }
}
