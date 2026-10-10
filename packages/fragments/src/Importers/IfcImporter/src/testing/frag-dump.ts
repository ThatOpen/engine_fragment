// Semantic comparison of two .frag files, for checking that a pipeline change
// preserved the model: items, categories, GUIDs, attributes, relations, the
// spatial tree, and every item's geometry. Keyed by express id and sorted, so
// the order things were written in, and the internal ids the builder handed
// out, don't count as differences. Node only.

import { createHash } from "node:crypto";
import * as fb from "flatbuffers";
import pako from "pako";
import { ALIGNMENT_CATEGORY, GRID_CATEGORY } from "../../../../FragmentsModels";
import * as TFB from "../../../../Schema";

type ShellParts = {
  type: number;
  points: number[];
  profiles: number[][];
  /** Each hole's profile, then its indices. */
  holes: number[][];
  bigProfiles: number[][];
  bigHoles: number[][];
  faceIds: number[];
};

export type Dump = {
  metadata: Record<string, unknown>;
  items: Map<number, Record<string, unknown>>;
  spatial: unknown;
  /** Each shell the samples name, by the key they name it with. */
  shells: Map<string, () => ShellParts>;
};

const read = (bytes: Uint8Array) => {
  // deflated output starts with a zlib header; raw output is a flatbuffer
  const raw = bytes[0] === 0x78 ? pako.inflate(bytes) : bytes;
  return TFB.Model.getRootAsModel(new fb.ByteBuffer(raw));
};

const hash = (value: unknown) =>
  createHash("sha1").update(JSON.stringify(value)).digest("hex").slice(0, 16);

const transform = (t: TFB.Transform | null) => {
  if (!t) return null;
  const p = t.position()!;
  const x = t.xDirection()!;
  const y = t.yDirection()!;
  return [p.x(), p.y(), p.z(), x.x(), x.y(), x.z(), y.x(), y.y(), y.z()];
};

const shellParts = (shell: TFB.Shell): ShellParts => {
  const points: number[] = [];
  for (let i = 0; i < shell.pointsLength(); i++) {
    const p = shell.points(i)!;
    points.push(p.x(), p.y(), p.z());
  }
  const profiles = [];
  for (let i = 0; i < shell.profilesLength(); i++) {
    profiles.push([...shell.profiles(i)!.indicesArray()!]);
  }
  const holes = [];
  for (let i = 0; i < shell.holesLength(); i++) {
    const hole = shell.holes(i)!;
    holes.push([hole.profileId(), ...hole.indicesArray()!]);
  }
  const bigProfiles = [];
  for (let i = 0; i < shell.bigProfilesLength(); i++) {
    bigProfiles.push([...shell.bigProfiles(i)!.indicesArray()!]);
  }
  const bigHoles = [];
  for (let i = 0; i < shell.bigHolesLength(); i++) {
    const hole = shell.bigHoles(i)!;
    bigHoles.push([hole.profileId(), ...hole.indicesArray()!]);
  }
  const faceIds = [...(shell.profilesFaceIdsArray() ?? [])];
  return {
    type: shell.type(),
    points,
    profiles,
    holes,
    bigProfiles,
    bigHoles,
    faceIds,
  };
};

const shellKey = (shell: TFB.Shell) => {
  const parts = shellParts(shell);
  return hash([
    parts.type,
    parts.points,
    parts.profiles,
    parts.holes,
    parts.bigProfiles,
    parts.bigHoles,
    parts.faceIds,
  ]);
};

/** A loop by its smallest rotation: where it starts is not part of it. */
const loopKey = (ids: number[]) => {
  let smallest: string | undefined;
  for (let start = 0; start < ids.length; start++) {
    const key = [...ids.slice(start), ...ids.slice(0, start)].join(",");
    if (smallest === undefined || key < smallest) smallest = key;
  }
  return smallest ?? "";
};

/**
 * What is left of a shell when the order it is stored in is taken away: its
 * loops, with each point called what `nameOf` calls it rather than by its
 * place in the list, and which loops are holes of which, and share a face.
 */
const shapeKey = (shell: ShellParts, nameOf: (point: number) => number) => {
  const loop = (indices: number[]) => loopKey(indices.map(nameOf));
  // a shell has profiles or big profiles, and holes point into either
  const profiles = [...shell.profiles, ...shell.bigProfiles].map(loop);
  const holes = [...shell.holes, ...shell.bigHoles].map(
    ([profile, ...indices]) => `${profiles[profile]}/${loop(indices)}`,
  );
  const faces = new Map<number, string[]>();
  shell.faceIds.forEach((face, profile) => {
    faces.set(face, [...(faces.get(face) ?? []), profiles[profile]]);
  });
  const faceKeys = [...faces.values()].map((group) => group.sort().join(";"));
  return JSON.stringify([
    shell.type,
    [...profiles].sort(),
    holes.sort(),
    faceKeys.sort(),
  ]);
};

/**
 * A shell's surface as the flat pieces its loops are: each one's plane (unit
 * normal, then distance from the origin) and area, a hole counting against
 * the loop it is cut from.
 */
const surfaceOf = (shell: ShellParts, pointOf: (point: number) => number[]) => {
  const pieceOf = (indices: number[]) => {
    // Newell's method: the loop's area as a vector along its normal
    let [nx, ny, nz] = [0, 0, 0];
    for (let i = 0; i < indices.length; i++) {
      const [x1, y1, z1] = pointOf(indices[i]);
      const [x2, y2, z2] = pointOf(indices[(i + 1) % indices.length]);
      nx += (y1 - y2) * (z1 + z2);
      ny += (z1 - z2) * (x1 + x2);
      nz += (x1 - x2) * (y1 + y2);
    }
    const area = Math.hypot(nx, ny, nz) / 2;
    const [x, y, z] = pointOf(indices[0]);
    const plane = [nx, ny, nz, nx * x + ny * y + nz * z].map(
      (value) => value / (2 * area || 1),
    );
    return { plane, area };
  };
  const pieces = [...shell.profiles, ...shell.bigProfiles].map(pieceOf);
  const holes = [...shell.holes, ...shell.bigHoles].map(
    ([profile, ...indices]) => ({
      plane: pieces[profile].plane,
      area: -pieceOf(indices).area,
    }),
  );
  return [...pieces, ...holes].filter(({ area }) => area !== 0);
};

/**
 * Whether two shells are one shape: the same points to within `tolerance`,
 * in whatever order either stores them, joined into the same loops — or
 * into loops that cover the same area of the same planes.
 */
const shellsAlike = (a: ShellParts, b: ShellParts, tolerance: number) => {
  if (a.type !== b.type || a.points.length !== b.points.length) return false;
  const count = a.points.length / 3;
  // every point is looked for among all the others
  if (count > 20_000) return false;
  const near = (p: number[], i: number, q: number[], j: number) =>
    Math.abs(p[i * 3] - q[j * 3]) <= tolerance &&
    Math.abs(p[i * 3 + 1] - q[j * 3 + 1]) <= tolerance &&
    Math.abs(p[i * 3 + 2] - q[j * 3 + 2]) <= tolerance;

  // A point is named after the first point of `a` in the same place, so
  // points that coincide share a name, in `a` and in `b` alike.
  const namesA = new Int32Array(count);
  const namesB = new Int32Array(count);
  for (let i = 0; i < count; i++) {
    namesA[i] = i;
    for (let j = 0; j < i; j++) {
      if (!near(a.points, i, a.points, j)) continue;
      namesA[i] = namesA[j];
      break;
    }
  }
  for (let i = 0; i < count; i++) {
    namesB[i] = -1;
    for (let j = 0; j < count; j++) {
      if (!near(b.points, i, a.points, j)) continue;
      namesB[i] = namesA[j];
      break;
    }
    if (namesB[i] === -1) return false;
  }
  if ([...namesA].sort().join() !== [...namesB].sort().join()) return false;
  if (
    shapeKey(a, (point) => namesA[point]) ===
    shapeKey(b, (point) => namesB[point])
  ) {
    return true;
  }

  // A flat face can be cut into loops in more than one way, so what decides
  // is the area covered in each plane. Both shells are measured on `a`'s
  // points, which the names stand for.
  const at = (names: Int32Array) => (point: number) =>
    a.points.slice(names[point] * 3, names[point] * 3 + 3);
  const planes: { plane: number[]; a: number; b: number }[] = [];
  const cover = (shell: ShellParts, names: Int32Array, side: "a" | "b") => {
    for (const { plane, area } of surfaceOf(shell, at(names))) {
      let found = planes.find((other) =>
        other.plane.every((value, i) => Math.abs(value - plane[i]) <= 1e-4),
      );
      if (!found) planes.push((found = { plane, a: 0, b: 0 }));
      found[side] += area;
    }
  };
  cover(a, namesA, "a");
  cover(b, namesB, "b");
  return planes.every(
    (covered) =>
      Math.abs(covered.a - covered.b) <=
      1e-9 + 1e-6 * Math.max(covered.a, covered.b),
  );
};

const extrusionKey = (extrusion: TFB.CircleExtrusion) => {
  const axes = [];
  for (let i = 0; i < extrusion.axesLength(); i++) {
    const axis = extrusion.axes(i)!;
    const wires = [];
    for (let w = 0; w < axis.wiresLength(); w++) {
      const wire = axis.wires(w)!;
      const [p1, p2] = [wire.p1()!, wire.p2()!];
      wires.push([p1.x(), p1.y(), p1.z(), p2.x(), p2.y(), p2.z()]);
    }
    const curves = [];
    for (let c = 0; c < axis.circleCurvesLength(); c++) {
      const curve = axis.circleCurves(c)!;
      const [pos, xd, yd] = [
        curve.position()!,
        curve.xDirection()!,
        curve.yDirection()!,
      ];
      curves.push([
        curve.aperture(),
        curve.radius(),
        pos.x(),
        pos.y(),
        pos.z(),
        xd.x(),
        xd.y(),
        xd.z(),
        yd.x(),
        yd.y(),
        yd.z(),
      ]);
    }
    axes.push([
      wires,
      curves,
      [...(axis.orderArray() ?? [])],
      [...(axis.partsArray() ?? [])],
    ]);
  }
  return hash([[...(extrusion.radiusArray() ?? [])], axes]);
};

/** A canonical view of a .frag file's contents. */
export const dump = (bytes: Uint8Array): Dump => {
  const model = read(bytes);
  const items = new Map<number, Record<string, any>>();
  const item = (id: number) => {
    let entry = items.get(id);
    if (!entry) items.set(id, (entry = {}));
    return entry;
  };

  const localIds = model.localIdsArray()!;
  for (let i = 0; i < localIds.length; i++) {
    const entry = item(localIds[i]);
    entry.category = model.categories(i);
    // a geometry split has items, and no attributes for them
    const attribute = model.attributes(i);
    if (!attribute) continue;
    const data = [];
    for (let j = 0; j < attribute.dataLength(); j++) data.push(attribute.data(j));
    entry.attributes = data.sort();
  }
  for (let i = 0; i < model.guidsLength(); i++) {
    item(model.guidsItems(i)!).guid = model.guids(i);
  }
  for (let i = 0; i < model.relationsLength(); i++) {
    const relation = model.relations(i)!;
    const data = [];
    for (let j = 0; j < relation.dataLength(); j++) data.push(relation.data(j));
    item(model.relationsItems(i)!).relations = data.sort();
  }

  const meshes = model.meshes()!;
  const shells = new Map<number, string>();
  const shellsByKey: Dump["shells"] = new Map();
  const extrusions = new Map<number, string>();
  const representation = (index: number) => {
    const r = meshes.representations(index)!;
    const id = r.id();
    if (r.representationClass() === TFB.RepresentationClass.SHELL) {
      if (!shells.has(id)) {
        const key = `shell:${shellKey(meshes.shells(id)!)}`;
        shells.set(id, key);
        shellsByKey.set(key, () => shellParts(meshes.shells(id)!));
      }
      return shells.get(id)!;
    }
    if (!extrusions.has(id)) {
      extrusions.set(id, extrusionKey(meshes.circleExtrusions(id)!));
    }
    return `extrusion:${extrusions.get(id)}`;
  };
  const material = (index: number) => {
    const m = meshes.materials(index)!;
    return [m.r(), m.g(), m.b(), m.a(), m.renderedFaces()].join(",");
  };

  const meshItems = meshes.meshesItemsArray()!;
  for (let i = 0; i < meshItems.length; i++) {
    const entry = item(localIds[meshItems[i]]);
    entry.placement = transform(meshes.globalTransforms(i));
    entry.samples = [];
  }
  for (let i = 0; i < meshes.samplesLength(); i++) {
    const sample = meshes.samples(i)!;
    const entry = item(localIds[meshItems[sample.item()]]);
    entry.samples.push(
      [
        representation(sample.representation()),
        material(sample.material()),
        transform(meshes.localTransforms(sample.localTransform()))?.join(","),
      ].join("|"),
    );
  }
  for (const entry of items.values()) entry.samples?.sort();

  const tree = (node: TFB.SpatialStructure | null): unknown => {
    if (!node) return null;
    const children = [];
    for (let i = 0; i < node.childrenLength(); i++) {
      children.push(tree(node.children(i)));
    }
    return [node.category() ?? node.localId(), children];
  };

  const metadata = JSON.parse(model.metadata() ?? "{}");
  // provenance changes with every build, and says nothing about the model
  delete metadata.generator;
  delete metadata.version;
  delete metadata.fragmentsVersion;
  delete metadata.createdAt;
  return {
    metadata,
    items,
    spatial: tree(model.spatialStructure()),
    shells: shellsByKey,
  };
};

/** Grids and alignments: items the importer makes up, ids included. */
const isGenerated = (entry: Record<string, unknown>) =>
  entry.category === GRID_CATEGORY || entry.category === ALIGNMENT_CATEGORY;

/**
 * A canonical view of a model written as splits, as if it were one file:
 * each item's data from the data split, or from the reference split for a
 * grid or an alignment, and its geometry from the geometry split that holds
 * it. What the splits disagree on, or hold that is not theirs to hold, shows
 * up as fields a single model never has, so {@link compare} reports it.
 */
export const dumpSplits = (
  splits: { kind: "geometry" | "reference" | "data"; bytes: Uint8Array }[],
): Dump => {
  const merged: Dump = {
    metadata: {},
    items: new Map(),
    spatial: null,
    shells: new Map(),
  };
  for (const split of splits) {
    if (split.kind === "geometry") continue;
    const { metadata, items, spatial } = dump(split.bytes);
    // what describes the model as a whole is in the data split
    if (split.kind === "data") {
      merged.metadata = metadata;
      merged.spatial = spatial;
    }
    for (const [id, entry] of items) {
      if (merged.items.has(id)) entry.dataSplits = "several";
      // neither kind has anything in its meshes table
      if (entry.samples) entry.geometryInDataSplit = true;
      // grids and alignments are in the reference split, and only they are
      if (isGenerated(entry) !== (split.kind === "reference")) {
        entry.misplacedIn = split.kind;
      }
      merged.items.set(id, entry);
    }
  }
  for (const split of splits) {
    if (split.kind !== "geometry") continue;
    const { items, shells } = dump(split.bytes);
    for (const [key, shell] of shells) merged.shells.set(key, shell);
    for (const [id, entry] of items) {
      let target = merged.items.get(id);
      if (!target)
        merged.items.set(id, (target = { category: entry.category }));
      if (target.samples) target.geometrySplits = "several";
      if (target.category !== entry.category) {
        target.geometryCategory = entry.category;
      }
      for (const field of ["attributes", "guid", "relations"]) {
        if (field in entry) target.dataInGeometrySplit = true;
      }
      target.placement = entry.placement;
      target.samples = entry.samples;
    }
  }
  return merged;
};

/**
 * Whether two items' samples are the same but for shells that are one shape
 * to within `tolerance` (see {@link shellsAlike}), with everything else
 * about them alike. `known` remembers each pair of shells already compared.
 */
const samplesWithin = ({
  a,
  b,
  x,
  y,
  tolerance,
  known,
}: {
  a: Dump;
  b: Dump;
  x: string[];
  y: string[];
  tolerance: number;
  known: Map<string, boolean>;
}) => {
  if (x.length !== y.length) return false;
  const close = (first: string, second: string) => {
    const [shellA, ...restA] = first.split("|");
    const [shellB, ...restB] = second.split("|");
    if (restA.join("|") !== restB.join("|")) return false;
    const pair = `${shellA} ${shellB}`;
    let alike = known.get(pair);
    if (alike === undefined) {
      const [partsA, partsB] = [
        a.shells.get(shellA)?.(),
        b.shells.get(shellB)?.(),
      ];
      alike = !!partsA && !!partsB && shellsAlike(partsA, partsB, tolerance);
      known.set(pair, alike);
    }
    return alike;
  };
  const rest = [...y];
  for (const sample of x) {
    let found = rest.indexOf(sample);
    if (found === -1) found = rest.findIndex((other) => close(sample, other));
    if (found === -1) return false;
    rest.splice(found, 1);
  }
  return true;
};

/**
 * Where two dumps differ, counted by field, with a few examples of each.
 *
 * Two options are for comparing a model with its splits, which differ from
 * it in two ways that are not differences in the model:
 *
 * - `tolerance`: geometry is deduplicated by a key made of its rounded
 *   vertices and its size, not its triangles. One model stores two meshes
 *   with the same key once, as the first of them; when a split boundary
 *   falls between the two, each is stored as itself. The two are one shape,
 *   but not one list of numbers: points differ by what the rounding hides,
 *   can come in another order, and a flat face can be cut into loops another
 *   way. Samples that differ only by such shells (see {@link shellsAlike})
 *   are counted in `tolerated` instead.
 * - `generatedById: false`: grids and alignments get local ids from after
 *   the last one geometry used, and splits use a few more than one model
 *   does. They are then compared by what they hold, whatever their ids.
 */
export const compare = (
  a: Dump,
  b: Dump,
  {
    examples = 5,
    tolerance = 0,
    generatedById = true,
  }: { examples?: number; tolerance?: number; generatedById?: boolean } = {},
) => {
  let tolerated = 0;
  const known = new Map<string, boolean>();
  const report: Record<string, { count: number; examples: unknown[] }> = {};
  const note = (kind: string, detail: unknown) => {
    report[kind] ??= { count: 0, examples: [] };
    report[kind].count++;
    if (report[kind].examples.length < examples) {
      report[kind].examples.push(detail);
    }
  };
  if (JSON.stringify(a.metadata) !== JSON.stringify(b.metadata)) {
    note("metadata", { a: a.metadata, b: b.metadata });
  }
  if (hash(a.spatial) !== hash(b.spatial)) note("spatial structure", null);
  if (!generatedById) {
    const generated = ({ items }: Dump) =>
      [...items.values()]
        .filter(isGenerated)
        .map(({ category, attributes, misplacedIn }) =>
          JSON.stringify([category, attributes, misplacedIn]),
        )
        .sort();
    const [inA, inB] = [generated(a), generated(b)];
    if (JSON.stringify(inA) !== JSON.stringify(inB)) {
      note("generated items", { a: inA.length, b: inB.length });
    }
  }
  for (const id of new Set([...a.items.keys(), ...b.items.keys()])) {
    const x = a.items.get(id);
    const y = b.items.get(id);
    if (!generatedById && isGenerated((x ?? y)!)) continue;
    if (!x || !y) {
      note(x ? "only in a" : "only in b", { id, category: (x ?? y)!.category });
      continue;
    }
    for (const field of new Set([...Object.keys(x), ...Object.keys(y)])) {
      if (JSON.stringify(x[field]) === JSON.stringify(y[field])) continue;
      const [first, second] = [x[field], y[field]];
      if (
        field === "samples" &&
        tolerance > 0 &&
        Array.isArray(first) &&
        Array.isArray(second) &&
        samplesWithin({ a, b, x: first, y: second, tolerance, known })
      ) {
        tolerated++;
        continue;
      }
      note(field, { id, a: first, b: second });
    }
  }
  return {
    items: [a.items.size, b.items.size],
    differences: report,
    tolerated,
  };
};

