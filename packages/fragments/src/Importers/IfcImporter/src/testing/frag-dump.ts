// Semantic comparison of two .frag files, for checking that a pipeline change
// preserved the model: items, categories, GUIDs, attributes, relations, the
// spatial tree, and every item's geometry. Keyed by express id and sorted, so
// the order things were written in, and the internal ids the builder handed
// out, don't count as differences. Node only.

import { createHash } from "node:crypto";
import * as fb from "flatbuffers";
import pako from "pako";
import * as TFB from "../../../../Schema";

export type Dump = {
  metadata: Record<string, unknown>;
  items: Map<number, Record<string, unknown>>;
  spatial: unknown;
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

const shellKey = (shell: TFB.Shell) => {
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
  return hash([
    shell.type(),
    points,
    profiles,
    holes,
    bigProfiles,
    bigHoles,
    [...(shell.profilesFaceIdsArray() ?? [])],
  ]);
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
    const attribute = model.attributes(i)!;
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
  const extrusions = new Map<number, string>();
  const representation = (index: number) => {
    const r = meshes.representations(index)!;
    const id = r.id();
    if (r.representationClass() === TFB.RepresentationClass.SHELL) {
      if (!shells.has(id)) shells.set(id, shellKey(meshes.shells(id)!));
      return `shell:${shells.get(id)}`;
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
  return { metadata, items, spatial: tree(model.spatialStructure()) };
};

/** Where two dumps differ, counted by field, with a few examples of each. */
export const compare = (a: Dump, b: Dump, examples = 5) => {
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
  for (const id of new Set([...a.items.keys(), ...b.items.keys()])) {
    const x = a.items.get(id);
    const y = b.items.get(id);
    if (!x || !y) {
      note(x ? "only in a" : "only in b", { id, category: (x ?? y)!.category });
      continue;
    }
    for (const field of new Set([...Object.keys(x), ...Object.keys(y)])) {
      if (JSON.stringify(x[field]) !== JSON.stringify(y[field])) {
        note(field, { id, a: x[field], b: y[field] });
      }
    }
  }
  return { items: [a.items.size, b.items.size], differences: report };
};

