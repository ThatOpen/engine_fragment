import * as TFB from "../../../../Schema";
import type { ShellData } from "../../../../Utils/shells";

// ---------------------------------------------------------------------------
// What the geometry pass hands from extraction to assembly
// ---------------------------------------------------------------------------
// Extraction is everything that depends on one element alone: asking web-ifc
// for its meshes, hashing them, and turning new ones into shells. Assembly is
// everything that depends on the elements before it: deduplicating geometry
// and local transforms, and numbering them. Splitting the two lets extraction
// run in any number of workers, over any part of the file, while assembly
// replays the same decisions in the same order as a single pass would.
// ---------------------------------------------------------------------------

export type Bbox = {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
};

/**
 * A {@link ShellData} flattened into typed arrays, so a worker can transfer it
 * instead of structured-cloning nested arrays and maps.
 */
export interface EncodedShell {
  type: TFB.RepresentationClass.SHELL;
  /** xyz per point. */
  points: Float64Array;
  /** Every profile's indices, one after the other, in map order. */
  profiles: Uint32Array;
  profileSizes: Uint32Array;
  /** One entry per `holes` map key: its id and how many index sets it has. */
  holeIds: Uint32Array;
  holeCounts: Uint32Array;
  /** Every hole index set, one after the other. */
  holes: Uint32Array;
  holeSizes: Uint32Array;
  faceIds: Float64Array;
  bbox: Bbox;
}

export type CircleExtrusionData = {
  type: TFB.RepresentationClass.CIRCLE_EXTRUSION;
  indicesArray: number[];
  typesArray: number[];
  circleCurveData: number[][];
  segments: number[][];
  radius: number;
  bbox: Bbox;
};

export type GeometryData = EncodedShell | CircleExtrusionData;

export const SHELL = 0;
export const EXTRUSION = 1;

/** One placed geometry of an element, as extraction saw it. */
export interface ExtractedGeometry {
  /** web-ifc's geometryExpressID. */
  gid: number;
  kind: typeof SHELL | typeof EXTRUSION;
  color: number[];
  /** The scale web-ifc applied, as a key. */
  scale: string;
  /** Rounded local transform against the element, or null at the origin. */
  local: number[] | null;
  /** Shells: the dedup key, or undefined when web-ifc produced no mesh. */
  hash?: string;
  /**
   * Index into the batch's shell or extrusion table, or -1 when building it
   * failed (shells) or web-ifc produced no mesh (extrusions).
   */
  data?: number;
}

export interface ExtractedElement {
  id: number;
  type: number;
  guid: string;
  position: number[];
  xDirection: number[];
  yDirection: number[];
  geometries: ExtractedGeometry[];
}

/** What a batch of extraction produced; the tables its records point into. */
export interface ExtractedBatch {
  elements: ExtractedElement[];
  shells: (EncodedShell | undefined)[];
  extrusions: (CircleExtrusionData | undefined)[];
}

export function encodeShell(shell: ShellData): EncodedShell {
  const points = new Float64Array(shell.points.length * 3);
  for (let i = 0; i < shell.points.length; i++) {
    const [x, y, z] = shell.points[i];
    points[i * 3] = x;
    points[i * 3 + 1] = y;
    points[i * 3 + 2] = z;
  }

  const profileSizes = new Uint32Array(shell.profiles.size);
  let profileTotal = 0;
  let p = 0;
  for (const indices of shell.profiles.values()) {
    profileSizes[p++] = indices.length;
    profileTotal += indices.length;
  }
  const profiles = new Uint32Array(profileTotal);
  let offset = 0;
  for (const indices of shell.profiles.values()) {
    profiles.set(indices, offset);
    offset += indices.length;
  }

  const holeIds = new Uint32Array(shell.holes.size);
  const holeCounts = new Uint32Array(shell.holes.size);
  let setCount = 0;
  let holeTotal = 0;
  let h = 0;
  for (const [id, sets] of shell.holes) {
    holeIds[h] = id;
    holeCounts[h++] = sets.length;
    setCount += sets.length;
    for (const set of sets) holeTotal += set.length;
  }
  const holeSizes = new Uint32Array(setCount);
  const holes = new Uint32Array(holeTotal);
  let s = 0;
  offset = 0;
  for (const sets of shell.holes.values()) {
    for (const set of sets) {
      holeSizes[s++] = set.length;
      holes.set(set, offset);
      offset += set.length;
    }
  }

  return {
    type: TFB.RepresentationClass.SHELL,
    points,
    profiles,
    profileSizes,
    holeIds,
    holeCounts,
    holes,
    holeSizes,
    faceIds: Float64Array.from(shell.profilesFaceIds),
    bbox: shell.bbox,
  };
}

/** The buffers a worker can hand over instead of copying. */
export function batchTransferables(batch: ExtractedBatch): ArrayBuffer[] {
  const out: ArrayBuffer[] = [];
  for (const shell of batch.shells) {
    if (!shell) continue;
    out.push(
      shell.points.buffer as ArrayBuffer,
      shell.profiles.buffer as ArrayBuffer,
      shell.profileSizes.buffer as ArrayBuffer,
      shell.holeIds.buffer as ArrayBuffer,
      shell.holeCounts.buffer as ArrayBuffer,
      shell.holes.buffer as ArrayBuffer,
      shell.holeSizes.buffer as ArrayBuffer,
      shell.faceIds.buffer as ArrayBuffer,
    );
  }
  return out;
}
