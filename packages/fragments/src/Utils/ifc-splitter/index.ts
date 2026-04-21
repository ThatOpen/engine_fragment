/* eslint-disable max-classes-per-file */
/* eslint-disable no-use-before-define */
/* eslint-disable no-cond-assign */
/* eslint-disable no-bitwise */

// ---------------------------------------------------------------------------
// Node.js dependency injection (avoids top-level fs/path imports for bundlers)
// ---------------------------------------------------------------------------

/** Subset of Node.js `fs` used by the splitter. */
export interface IfcSplitterFs {
  openSync(path: string, flags: string): number;
  readSync(
    fd: number,
    buffer: any,
    offset: number,
    length: number,
    position: null,
  ): number;
  writeSync(fd: number, data: any, offset?: number, length?: number): number;
  closeSync(fd: number): void;
  existsSync(path: string): boolean;
  mkdirSync(path: string, options?: { recursive?: boolean }): void;
  statSync(path: string): { size: number };
}

/** Subset of Node.js `path` used by the splitter. */
export interface IfcSplitterPath {
  join(...paths: string[]): string;
  dirname(p: string): string;
  basename(p: string): string;
}

/** Dependencies that must be provided by the caller (Node.js modules). */
export interface IfcSplitterDeps {
  fs: IfcSplitterFs;
  path: IfcSplitterPath;
}

// ---------------------------------------------------------------------------
// Exported interfaces
// ---------------------------------------------------------------------------

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
  fileIds: Set<number> | null;
  rewrittenLines: Map<number, string>;
  elementCount: number;
  totalIds: number;
}

// ---------------------------------------------------------------------------
// Internal interfaces
// ---------------------------------------------------------------------------
interface ExtractIdResult {
  id: number;
  type: string;
}

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
// Parse helpers — manual charCode-based extractors for speed on 37M+ lines
// ---------------------------------------------------------------------------
function extractId(raw: string): ExtractIdResult | null {
  if (raw.charCodeAt(0) !== 35) return null; // '#'
  let id = 0;
  let i = 1;
  while (i < raw.length) {
    const c = raw.charCodeAt(i);
    if (c >= 48 && c <= 57) {
      id = id * 10 + (c - 48);
      i++;
    } else break;
  }
  if (id === 0) return null;
  while (i < raw.length && raw.charCodeAt(i) <= 32) i++;
  if (raw.charCodeAt(i) !== 61) return null; // '='
  i++;
  while (i < raw.length && raw.charCodeAt(i) <= 32) i++;
  const ts = i;
  while (i < raw.length) {
    const c = raw.charCodeAt(i);
    if ((c >= 65 && c <= 90) || (c >= 48 && c <= 57) || c === 95) i++;
    else break;
  }
  if (i === ts) return null;
  return { id, type: raw.substring(ts, i) };
}

function extractRefs(raw: string, skipId?: number): number[] {
  const refs: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw.charCodeAt(i) === 35) {
      // '#'
      let id = 0;
      i++;
      while (i < raw.length) {
        const c = raw.charCodeAt(i);
        if (c >= 48 && c <= 57) {
          id = id * 10 + (c - 48);
          i++;
        } else break;
      }
      if (id > 0 && id !== skipId) refs.push(id);
      i--; // outer loop will i++
    }
  }
  return refs;
}

function splitIfcArgs(s: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let inStr = false;
  let current = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "'" && !inStr) {
      inStr = true;
      current += ch;
    } else if (ch === "'" && inStr) {
      inStr = false;
      current += ch;
    } else if (inStr) {
      current += ch;
    } else if (ch === "(") {
      depth++;
      current += ch;
    } else if (ch === ")") {
      depth--;
      current += ch;
    } else if (ch === "," && depth === 0) {
      args.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

function parseHashRef(s: string): number | null {
  const m = s.trim().match(/^#(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

function extractArgsString(raw: string | undefined): string | null {
  if (!raw) return null;
  const idx = raw.indexOf("(");
  if (idx < 0) return null;
  const lastParen = raw.lastIndexOf(")");
  if (lastParen < 0) return null;
  return raw.substring(idx + 1, lastParen);
}

// ---------------------------------------------------------------------------
// Synchronous chunked file reader — replaces readline (3-5x faster)
// ---------------------------------------------------------------------------
function forEachLine(
  fsLike: IfcSplitterFs,
  filePath: string,
  callback: (line: string) => void,
): void {
  const CHUNK = 8 * 1024 * 1024;
  const fd = fsLike.openSync(filePath, "r");
  const readBuf = Buffer.allocUnsafe(CHUNK);
  let tail = "";
  let bytesRead: number;
  while (
    (bytesRead = fsLike.readSync(fd, readBuf as any, 0, CHUNK, null)) > 0
  ) {
    const chunk = readBuf.toString("utf-8", 0, bytesRead);
    let start = 0;
    let idx = chunk.indexOf("\n");
    // First line: prepend leftover from previous chunk
    if (idx !== -1) {
      let end = idx;
      if (end > 0 && chunk.charCodeAt(end - 1) === 13) end--;
      callback(
        tail ? tail + chunk.substring(start, end) : chunk.substring(start, end),
      );
      tail = "";
      start = idx + 1;
    } else {
      tail += chunk;
      continue;
    }
    // Remaining lines — hot loop, no tail concat needed
    while ((idx = chunk.indexOf("\n", start)) !== -1) {
      let end = idx;
      if (end > start && chunk.charCodeAt(end - 1) === 13) end--;
      callback(chunk.substring(start, end));
      start = idx + 1;
    }
    if (start < chunk.length) tail = chunk.substring(start);
  }
  if (tail) callback(tail);
  fsLike.closeSync(fd);
}

// ---------------------------------------------------------------------------
// Buffered synchronous file writer — avoids per-line write() syscalls
// ---------------------------------------------------------------------------
class BufferedWriter {
  private fsLike: IfcSplitterFs;
  private fd: number;
  private buf: Buffer;
  private pos: number;
  private bufSize: number;

  constructor(fsLike: IfcSplitterFs, filePath: string, bufSize: number) {
    this.fsLike = fsLike;
    this.fd = fsLike.openSync(filePath, "w");
    this.buf = Buffer.allocUnsafe(bufSize);
    this.pos = 0;
    this.bufSize = bufSize;
  }

  write(str: string): void {
    const bytes = Buffer.byteLength(str, "utf-8");
    if (this.pos + bytes > this.bufSize) {
      this.flush();
      if (bytes > this.bufSize) {
        this.fsLike.writeSync(this.fd, str);
        return;
      }
    }
    this.pos += this.buf.write(str, this.pos, "utf-8");
  }

  flush(): void {
    if (this.pos > 0) {
      this.fsLike.writeSync(this.fd, this.buf as any, 0, this.pos);
      this.pos = 0;
    }
  }

  close(): void {
    this.flush();
    this.fsLike.closeSync(this.fd);
  }
}

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
// Streaming IFC parser
// ---------------------------------------------------------------------------
function parseIfc(fsLike: IfcSplitterFs, filePath: string): ParseResult {
  const header: string[] = [];
  const footer: string[] = [];
  const index = new LineIndex();

  let section: "header" | "data" | "footer" = "header";
  let accumulator = "";
  let lineCount = 0;

  console.time("parse");

  forEachLine(fsLike, filePath, (line: string) => {
    if (section === "header") {
      header.push(line);
      if (line.trim() === "DATA;") section = "data";
      return;
    }
    if (section === "data") {
      const trimmed = line.trim();
      if (trimmed === "ENDSEC;") {
        if (accumulator) {
          const info = extractId(accumulator);
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
        const info = extractId(accumulator);
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
  console.timeEnd("parse");
  console.log(`  Parsed ${lineCount} data lines (max id: ${index.maxId})`);
  return { header, footer, index };
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
 * Split an IFC file into N roughly equal groups of building elements.
 * @param inputPath - Absolute or relative path to the source IFC file.
 * @param numGroups - Number of output files to produce (max 32).
 * @param outputDir - Directory for output files. Defaults to `output/` next to the input file.
 */
export function split(
  deps: IfcSplitterDeps,
  inputPath: string,
  numGroups: number,
  outputDir?: string,
): Set<number>[] {
  const { fs, path } = deps;
  if (!fs.existsSync(inputPath)) {
    console.error(`File not found: ${inputPath}`);
    process.exit(1);
  }

  const resolvedOutputDir =
    outputDir || path.join(path.dirname(inputPath), "output");
  fs.mkdirSync(resolvedOutputDir, { recursive: true });

  // 1. Parse
  const { header, footer, index } = parseIfc(fs, inputPath);

  // 2. Identify spatial structure (shared in all files)
  console.time("spatial");
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
  console.timeEnd("spatial");
  console.log(`  Shared infrastructure: ${sharedIds.size} lines`);

  // 3. Build void/fill coupling map
  console.time("voidfill");
  const vfMap = buildVoidFillMap(index);
  console.timeEnd("voidfill");
  console.log(
    `  Void rels: ${vfMap.wallToOpenings.size} walls with openings, ${vfMap.fillerToOpening.size} fillers`,
  );

  // 3b. Build reverse style maps
  console.time("stylemaps");
  const styleMaps = buildStyleMaps(index);
  console.timeEnd("stylemaps");
  console.log(
    `  Style maps: ${styleMaps.geomToStyledItems.size} styled geometries, ${styleMaps.materialToDefReps.size} material representations`,
  );

  // 4. Identify all building elements
  console.time("classify");
  const allElementIds = new Set<number>();
  for (let id = 0; id <= index.maxId; id++) {
    const type = index.getType(id);
    if (type && ELEMENT_TYPES.has(type)) allElementIds.add(id);
  }
  console.timeEnd("classify");
  console.log(`  Found ${allElementIds.size} building elements`);

  // 4b. Build aggregation map
  console.time("aggregate");
  const aggMap = buildAggregateMap(index, allElementIds);
  console.timeEnd("aggregate");
  console.log(
    `  Aggregate rels: ${aggMap.parentToChildren.size} parents, ${aggMap.childToParent.size} children`,
  );

  // 5. Build clusters
  console.time("cluster");
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
  console.timeEnd("cluster");
  console.log(`  Built ${clusters.length} clusters`);

  // 6. Distribute clusters into N groups (greedy bin packing)
  console.time("distribute");
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
  console.timeEnd("distribute");

  // 7. Pre-parse all relationship lines that need per-group rewriting.
  console.time("index-rels");
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
  console.timeEnd("index-rels");
  console.log(`  Found ${relEntries.length} relationship lines to process`);

  // 8. Resolve deps for all groups
  console.time("resolve");
  const groupsData: (GroupData | null)[] = [];

  for (let g = 0; g < numGroups; g++) {
    const groupElementIds = groups[g];
    if (groupElementIds.size === 0) {
      groupsData.push(null);
      console.log(`  Group ${g + 1}: SKIPPED (empty)`);
      continue;
    }

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
      fileIds,
      rewrittenLines,
      elementCount: groupElementIds.size,
      totalIds,
    });
    console.log(
      `  Group ${g + 1}: ${groupElementIds.size} elements, ${totalIds} total IDs`,
    );
  }

  console.timeEnd("resolve");

  // Free the index to reclaim memory before the output pass
  const maxParsedId = index.maxId;
  index.free();

  // 9. Build Uint32Array bitmask for O(1) write-phase lookups
  console.time("build-mask");
  const idGroupMask = new Uint32Array(maxParsedId + 1);
  for (let g = 0; g < numGroups; g++) {
    if (!groupsData[g]) continue;
    const bit = 1 << g;
    for (const id of groupsData[g]!.fileIds!) {
      idGroupMask[id] |= bit;
    }
  }
  for (let g = 0; g < numGroups; g++) {
    if (groupsData[g]) groupsData[g]!.fileIds = null;
  }
  console.timeEnd("build-mask");

  // 10. Second pass: write output files
  console.time("write");
  writeOutputFiles(
    deps,
    inputPath,
    resolvedOutputDir,
    header,
    footer,
    groupsData,
    idGroupMask,
  );
  console.timeEnd("write");

  console.log("\nDone!");

  return groupsData.map((g) => g?.fileIds ?? new Set());
}

/**
 * Extract specific building elements from an IFC file into a new IFC file.
 * @param inputPath  - Absolute or relative path to the source IFC file.
 * @param elementIds - Array of IFC entity IDs (`#id`) for the building elements to extract. Non-element or missing IDs are skipped with a warning.
 * @param outputPath - Path for the output IFC file.
 */
export function extract(
  deps: IfcSplitterDeps,
  inputPath: string,
  elementIds: number[],
  outputPath: string,
): void {
  const { fs, path } = deps;
  if (!fs.existsSync(inputPath)) {
    console.error(`File not found: ${inputPath}`);
    process.exit(1);
  }

  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  // 1. Parse
  const { header, footer, index } = parseIfc(fs, inputPath);

  // 2. Identify spatial structure (shared)
  console.time("spatial");
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
  console.timeEnd("spatial");

  // 3. Build maps
  const vfMap = buildVoidFillMap(index);
  const styleMaps = buildStyleMaps(index);
  const allElementIds = new Set<number>();
  for (let id = 0; id <= index.maxId; id++) {
    const type = index.getType(id);
    if (type && ELEMENT_TYPES.has(type)) allElementIds.add(id);
  }

  // Validate requested IDs
  const requestedIds = new Set<number>();
  for (const eid of elementIds) {
    if (allElementIds.has(eid)) {
      requestedIds.add(eid);
    } else if (index.has(eid)) {
      console.warn(
        `  Warning: #${eid} exists but is not a building element (type: ${index.getType(eid)}), skipping`,
      );
    } else {
      console.warn(`  Warning: #${eid} not found in file, skipping`);
    }
  }
  if (requestedIds.size === 0) {
    console.error("No valid element IDs to extract.");
    return;
  }
  console.log(`  Extracting ${requestedIds.size} elements`);

  // 4. Cluster: expand void/fill + aggregation for requested elements
  const aggMap = buildAggregateMap(index, allElementIds);
  const groupElementIds = new Set<number>(requestedIds);
  for (const eid of requestedIds) {
    const cluster = getCluster(eid, vfMap, aggMap);
    for (const cid of cluster) {
      if (allElementIds.has(cid)) groupElementIds.add(cid);
    }
  }
  if (groupElementIds.size > requestedIds.size) {
    console.log(
      `  Expanded to ${groupElementIds.size} elements (void/fill + aggregation coupling)`,
    );
  }

  // 5. Collect all dependencies
  const fileIds = new Set<number>(sharedIds);
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

  // 6. Rewrite relationship lines
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

  console.log(`  Total lines in output: ${fileIds.size}`);

  // 7. Free index, write output
  // const maxParsedId = index.maxId;
  index.free();

  // Build simple inclusion set
  const includeSet = new Set<number>(fileIds);

  console.time("write");
  const bw = new BufferedWriter(fs, outputPath, 4 * 1024 * 1024);
  bw.write(`${header.join("\n")}\n`);

  let section: "header" | "data" | "footer" = "header";
  let accumulator = "";

  forEachLine(fs, inputPath, (line: string) => {
    if (section === "header") {
      if (line.trim() === "DATA;") section = "data";
      return;
    }
    if (section === "data") {
      const trimmed = line.trim();
      if (trimmed === "ENDSEC;") {
        if (accumulator) {
          emitSingleLine(accumulator, bw, includeSet, rewrittenLines);
          accumulator = "";
        }
        section = "footer";
        return;
      }

      if (!accumulator && trimmed.charCodeAt(trimmed.length - 1) === 59) {
        emitSingleLine(trimmed, bw, includeSet, rewrittenLines);
        return;
      }

      accumulator += (accumulator ? " " : "") + trimmed;
      if (accumulator.charCodeAt(accumulator.length - 1) === 59) {
        emitSingleLine(accumulator, bw, includeSet, rewrittenLines);
        accumulator = "";
      }
    }
  });

  bw.write(`${footer.join("\n")}\n`);
  bw.close();
  console.timeEnd("write");

  const stat = fs.statSync(outputPath);
  console.log(
    `  Output: ${groupElementIds.size} elements, ${fileIds.size} total lines, ${(stat.size / 1024 / 1024).toFixed(1)} MB -> ${path.basename(outputPath)}`,
  );
  console.log("\nDone!");
}

function emitSingleLine(
  raw: string,
  writer: BufferedWriter,
  includeSet: Set<number>,
  rewrittenLines: Map<number, string>,
): void {
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
  const line = rewrittenLines.has(id) ? rewrittenLines.get(id)! : raw;
  writer.write(line);
  writer.write("\n");
}

// ---------------------------------------------------------------------------
// Second-pass output writer
// ---------------------------------------------------------------------------
function writeOutputFiles(
  deps: IfcSplitterDeps,
  inputPath: string,
  outputDir: string,
  header: string[],
  footer: string[],
  groupsData: (GroupData | null)[],
  idGroupMask: Uint32Array,
): void {
  const { fs, path } = deps;
  const numGroups = groupsData.length;

  const writers: (BufferedWriter | null)[] = [];
  const headerStr = `${header.join("\n")}\n`;
  for (let g = 0; g < numGroups; g++) {
    if (!groupsData[g]) {
      writers.push(null);
      continue;
    }
    const outName = path.join(
      outputDir,
      `split_${String(g + 1).padStart(3, "0")}.ifc`,
    );
    const bw = new BufferedWriter(fs, outName, 4 * 1024 * 1024);
    bw.write(headerStr);
    writers.push(bw);
  }

  let section: "header" | "data" | "footer" = "header";
  let accumulator = "";

  forEachLine(fs, inputPath, (line: string) => {
    if (section === "header") {
      if (line.trim() === "DATA;") section = "data";
      return;
    }
    if (section === "data") {
      const trimmed = line.trim();
      if (trimmed === "ENDSEC;") {
        if (accumulator) {
          emitLine(accumulator, writers, groupsData, idGroupMask);
          accumulator = "";
        }
        section = "footer";
        return;
      }

      if (!accumulator && trimmed.charCodeAt(trimmed.length - 1) === 59) {
        emitLine(trimmed, writers, groupsData, idGroupMask);
        return;
      }

      accumulator += (accumulator ? " " : "") + trimmed;
      if (accumulator.charCodeAt(accumulator.length - 1) === 59) {
        emitLine(accumulator, writers, groupsData, idGroupMask);
        accumulator = "";
      }
    }
  });

  const footerStr = `${footer.join("\n")}\n`;
  for (let g = 0; g < numGroups; g++) {
    const bw = writers[g];
    if (!bw) continue;
    bw.write(footerStr);
    bw.close();
    const outName = path.join(
      outputDir,
      `split_${String(g + 1).padStart(3, "0")}.ifc`,
    );
    const stat = fs.statSync(outName);
    const gd = groupsData[g]!;
    console.log(
      `  Group ${g + 1}: ${gd.elementCount} elements, ${gd.totalIds} total lines, ${(stat.size / 1024 / 1024).toFixed(1)} MB -> ${path.basename(outName)}`,
    );
  }
}

function emitLine(
  raw: string,
  writers: (BufferedWriter | null)[],
  groupsData: (GroupData | null)[],
  idGroupMask: Uint32Array,
): void {
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
  if (id === 0 || id >= idGroupMask.length) return;

  const mask = idGroupMask[id];
  if (mask === 0) return;

  for (let g = 0; g < groupsData.length; g++) {
    if (!(mask & (1 << g))) continue;
    const gd = groupsData[g]!;
    const line = gd.rewrittenLines.has(id) ? gd.rewrittenLines.get(id)! : raw;
    writers[g]!.write(line);
    writers[g]!.write("\n");
  }
}
