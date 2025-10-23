import * as FB from "flatbuffers";
import pako from "pako";
import * as TFB from "../../Schema";
import * as ET from "./edit-types";
import { VirtualFragmentsModel } from "../../FragmentsModels/src/virtual-model";
import { ItemAttribute, ItemData } from "../../FragmentsModels";

export const DELTA_MODEL_ID = "-DELTA-MODEL-";

export function getRootModelId(modelId: string) {
  if (modelId.includes(DELTA_MODEL_ID)) {
    return modelId.substring(0, modelId.indexOf(DELTA_MODEL_ID));
  }
  return modelId;
}

export function getModelFromBuffer(bytes: Uint8Array, raw: boolean): TFB.Model {
  const byteBuffer = new FB.ByteBuffer(raw ? bytes : pako.inflate(bytes));
  const readModel = TFB.Model.getRootAsModel(byteBuffer);
  return readModel;
}

export function getSampleData(sample: TFB.Sample): ET.RawSample {
  return {
    item: sample.item(),
    localTransform: sample.localTransform(),
    material: sample.material(),
    representation: sample.representation(),
  };
}

export function getTransformData(lt: TFB.Transform) {
  const position = lt.position()!;
  const xDir = lt.xDirection()!;
  const yDir = lt.yDirection()!;
  const transform = {
    position: [position.x(), position.y(), position.z()],
    xDirection: [xDir.x(), xDir.y(), xDir.z()],
    yDirection: [yDir.x(), yDir.y(), yDir.z()],
  };
  return transform;
}

export function getRelationData(relation: TFB.Relation) {
  const result: ET.RawRelationData = {
    data: {},
  };
  const dataLength = relation.dataLength();
  for (let j = 0; j < dataLength; j++) {
    const currentData = relation.data(j) as string;
    const [name, ...ids]: [string, ...number[]] = JSON.parse(currentData);
    result.data[name] = ids;
  }
  return result;
}

export function getMaterialData(material: TFB.Material): ET.RawMaterial {
  return {
    r: material.r(),
    g: material.g(),
    b: material.b(),
    a: material.a(),
    renderedFaces: material.renderedFaces(),
    stroke: material.stroke(),
  };
}

export function getRepresentationData(
  representation: TFB.Representation,
): ET.RawRepresentation {
  const bbox = representation.bbox()!;
  const min = bbox.min()!;
  const max = bbox.max()!;
  return {
    id: representation.id(),
    bbox: [min.x(), min.y(), min.z(), max.x(), max.y(), max.z()],
    representationClass: representation.representationClass(),
  };
}

export function getShellData(shell: TFB.Shell): ET.RawShell {
  const points: number[][] = [];
  for (let i = 0; i < shell.pointsLength(); i++) {
    const point = shell.points(i)!;
    points.push([point.x(), point.y(), point.z()]);
  }

  const profiles = new Map<number, number[]>();
  for (let i = 0; i < shell.profilesLength(); i++) {
    const profile = shell.profiles(i)!;
    const indices = Array.from(profile.indicesArray() || []);
    profiles.set(i, indices);
  }

  const holes = new Map<number, number[][]>();
  for (let i = 0; i < shell.holesLength(); i++) {
    const hole = shell.holes(i)!;
    const indices = Array.from(hole.indicesArray() || []);
    const profileId = hole.profileId();
    if (!holes.has(profileId)) {
      holes.set(profileId, []);
    }
    holes.get(profileId)!.push(indices);
  }

  const bigProfiles = new Map<number, number[]>();
  for (let i = 0; i < shell.bigProfilesLength(); i++) {
    const profile = shell.bigProfiles(i)!;
    const indices = Array.from(profile.indicesArray() || []);
    bigProfiles.set(i, indices);
  }

  const bigHoles = new Map<number, number[][]>();
  for (let i = 0; i < shell.bigHolesLength(); i++) {
    const hole = shell.bigHoles(i)!;
    const indices = Array.from(hole.indicesArray() || []);
    const profileId = hole.profileId();
    if (!bigHoles.has(profileId)) {
      bigHoles.set(profileId, []);
    }
    bigHoles.get(profileId)!.push(indices);
  }

  const profilesFaceIds = Array.from(shell.profilesFaceIdsArray() || []);

  return {
    points,
    profiles,
    holes,
    bigProfiles,
    bigHoles,
    type: shell.type(),
    profilesFaceIds,
  };
}

export function getCircleExtrusionData(
  circleExtrusion: TFB.CircleExtrusion,
): ET.RawCircleExtrusion {
  const result: ET.RawCircleExtrusion = {
    radius: [],
    axes: [],
  };
  const radius = circleExtrusion.radiusArray() as Float64Array;
  result.radius = Array.from(radius);
  const axesLength = circleExtrusion.axesLength();

  for (let i = 0; i < axesLength; i++) {
    const axis = circleExtrusion.axes(i)!;
    const wiresLength = axis.wiresLength();
    const wires: number[][] = [];
    for (let j = 0; j < wiresLength; j++) {
      const wire = axis.wires(j)!;
      const p1 = wire.p1()!;
      const p2 = wire.p2()!;
      wires.push([p1.x(), p1.y(), p1.z(), p2.x(), p2.y(), p2.z()]);
    }

    const orderLength = axis.orderLength();
    const order: number[] = [];
    for (let j = 0; j < orderLength; j++) {
      order.push(axis.order(j)!);
    }

    const partsLength = axis.partsLength();
    const parts: TFB.AxisPartClass[] = [];
    for (let j = 0; j < partsLength; j++) {
      parts.push(axis.parts(j)!);
    }

    const wireSetsLength = axis.wireSetsLength();
    const wireSets: number[][] = [];
    for (let j = 0; j < wireSetsLength; j++) {
      const wireSet = axis.wireSets(j)!;
      const psLength = wireSet.psLength();
      const ps: number[] = [];
      for (let k = 0; k < psLength; k++) {
        const p = wireSet.ps(k)!;
        ps.push(p.x(), p.y(), p.z());
      }
      wireSets.push(ps);
    }

    const circleCurvesLength = axis.circleCurvesLength();
    const circleCurves: {
      aperture: number;
      position: number[];
      radius: number;
      xDirection: number[];
      yDirection: number[];
    }[] = [];
    for (let j = 0; j < circleCurvesLength; j++) {
      const circleCurve = axis.circleCurves(j)!;
      const aperture = circleCurve.aperture();
      const position = circleCurve.position()!;
      const px = position.x();
      const py = position.y();
      const pz = position.z();
      const radius = circleCurve.radius();
      const xDirection = circleCurve.xDirection()!;
      const dx = xDirection.x();
      const dy = xDirection.y();
      const dz = xDirection.z();
      const yDirection = circleCurve.yDirection()!;
      const dyx = yDirection.x();
      const dyy = yDirection.y();
      const dyz = yDirection.z();
      circleCurves.push({
        aperture,
        position: [px, py, pz],
        radius,
        xDirection: [dx, dy, dz],
        yDirection: [dyx, dyy, dyz],
      });
    }

    result.axes.push({
      wires,
      order,
      parts,
      wireSets,
      circleCurves,
    });
  }
  return result;
}

export function getMaterialsIds(model: TFB.Model) {
  const meshes = model.meshes()!;
  return meshes.materialIdsArray() || [];
}

export function getMaterials(model: TFB.Model, ids?: Iterable<number>) {
  const meshes = model.meshes()!;
  const source = ids || meshes.materialIdsArray()!;
  const idsSet = new Set(source);

  const tempMaterial = new TFB.Material();
  const materials = new Map<number, ET.RawMaterial>();
  for (let i = 0; i < meshes.materialsLength(); i++) {
    const matLocalId = meshes.materialIds(i)!;
    if (!idsSet.has(matLocalId)) {
      continue;
    }
    meshes.materials(i, tempMaterial);
    const material = getMaterialData(tempMaterial);
    materials.set(matLocalId, material);
  }
  return materials;
}

export function getRepresentationsIds(model: TFB.Model) {
  const meshes = model.meshes()!;
  return meshes.representationIdsArray() || [];
}

export function getRepresentations(model: TFB.Model, ids?: Iterable<number>) {
  const meshes = model.meshes()!;
  const source = ids || meshes.representationIdsArray()!;
  const idsSet = new Set(source);

  const representations = new Map<number, ET.RawRepresentation>();
  const tempRepresentation = new TFB.Representation();
  for (let i = 0; i < meshes.representationsLength(); i++) {
    const representationLocalId = meshes.representationIds(i)!;
    if (!idsSet.has(representationLocalId)) {
      continue;
    }
    meshes.representations(i, tempRepresentation);
    const repr = getRepresentationData(tempRepresentation);

    if (repr.representationClass === TFB.RepresentationClass.SHELL) {
      const fbshell = meshes.shells(repr.id!)!;
      const shell = getShellData(fbshell);
      repr.geometry = shell;
    } else if (
      repr.representationClass === TFB.RepresentationClass.CIRCLE_EXTRUSION
    ) {
      const fbcirclExtrusion = meshes.circleExtrusions(repr.id!)!;
      const circleExtrusion = getCircleExtrusionData(fbcirclExtrusion);
      repr.geometry = circleExtrusion;
    }

    representations.set(representationLocalId, repr);
  }

  return representations;
}

export function getGeometryIndicesFromRepresentations(
  model: TFB.Model,
  ids?: Iterable<number>,
) {
  const meshes = model.meshes()!;
  const source = ids || meshes.representationIdsArray()!;
  const idsSet = new Set(source);

  const tempRepresentation = new TFB.Representation();
  const shells = new Set<number>();
  const rebars = new Set<number>();

  for (let i = 0; i < meshes.representationsLength(); i++) {
    const representationLocalId = meshes.representationIds(i)!;
    if (!idsSet.has(representationLocalId)) {
      continue;
    }
    meshes.representations(i, tempRepresentation);
    const repr = getRepresentationData(tempRepresentation);

    if (repr.representationClass === TFB.RepresentationClass.SHELL) {
      shells.add(repr.id!);
    } else if (
      repr.representationClass === TFB.RepresentationClass.CIRCLE_EXTRUSION
    ) {
      rebars.add(repr.id!);
    } else {
      throw new Error("Rebars not supported yet");
    }
  }

  return {
    shellsIndices: shells,
    rebarsIndices: rebars,
  };
}

export function getSerializedAttributes(attributes: ItemData) {
  const datas: string[] = [];
  for (const name in attributes) {
    if (name[0] === "_") {
      continue;
    }
    const current = attributes[name];
    if (Array.isArray(current)) {
      continue;
    }
    const value = current.value;
    const type = current.type;
    const serialized = JSON.stringify([name, value, type]);
    datas.push(serialized);
  }
  return datas;
}

export function itemDataToRawItemData(item: ItemData): ET.RawItemData {
  const categoryAttr = item._category as ItemAttribute;
  if (!categoryAttr) {
    throw new Error("Category is required");
  }
  const category = categoryAttr.value;
  const guidAttr = item._guid as ItemAttribute;
  const data: Record<string, ItemAttribute> = {};
  for (const name in item) {
    if (name[0] === "_") {
      continue;
    }
    const attr = item[name];
    if (Array.isArray(attr)) {
      continue;
    }
    data[name] = attr;
  }
  const guid = guidAttr ? guidAttr.value : undefined;
  return {
    data,
    category,
    guid,
  };
}

export function getLocalTransformsIds(model: TFB.Model) {
  const meshes = model.meshes()!;
  return meshes.localTransformIdsArray() || [];
}

export function getLocalTransforms(model: TFB.Model, ids?: Iterable<number>) {
  const meshes = model.meshes()!;
  const source = ids || meshes.localTransformIdsArray()!;
  const idsSet = new Set(source);

  const localTransforms = new Map<number, ET.RawTransformData>();
  const tempTranform = new TFB.Transform();
  for (let i = 0; i < meshes.localTransformsLength(); i++) {
    const localTransformLocalId = meshes.localTransformIds(i)!;
    if (!idsSet.has(localTransformLocalId)) {
      continue;
    }
    meshes.localTransforms(i, tempTranform);
    const lt = getTransformData(tempTranform);
    localTransforms.set(localTransformLocalId, lt);
  }
  return localTransforms;
}

export function getGlobalTransformsIds(model: TFB.Model) {
  const meshes = model.meshes()!;
  return meshes.globalTransformIdsArray() || [];
}

export function getGlobalTransforms(model: TFB.Model, ids?: Iterable<number>) {
  const meshes = model.meshes()!;
  let source: Set<number> | null = null;
  if (ids) {
    source = new Set(ids);
  } else {
    source = new Set(meshes.globalTransformIdsArray()!);
  }

  const globalTransforms = new Map<number, ET.RawGlobalTransformData>();
  const tempTransform = new TFB.Transform();
  const gtLength = meshes.globalTransformsLength();
  for (let i = 0; i < gtLength; i++) {
    meshes.globalTransforms(i, tempTransform);
    const localId = meshes.globalTransformIds(i)!;
    const idIndex = meshes.meshesItems(i)!;
    const itemId = model.localIds(idIndex)!;
    if (!source.has(localId)) continue;
    const gtData = getTransformData(tempTransform);
    globalTransforms.set(localId, { ...gtData, itemId });
  }

  return globalTransforms;
}

export function getSamplesIds(model: TFB.Model) {
  const meshes = model.meshes()!;
  const samples = meshes.sampleIdsArray() || [];
  return samples;
}

export function getSamples(model: TFB.Model, ids?: Iterable<number>) {
  const meshes = model.meshes()!;
  const source = ids || meshes.sampleIdsArray()!;
  const idsSet = new Set(source);

  const samples = new Map<number, ET.RawSample>();
  const tempSample = new TFB.Sample();
  for (let i = 0; i < meshes.samplesLength(); i++) {
    const sampleLocalId = meshes.sampleIds(i)!;
    if (!idsSet.has(sampleLocalId)) {
      continue;
    }
    meshes.samples(i, tempSample);

    // We substitute indices by local ids to get the items the sample references

    const sample = getSampleData(tempSample);

    sample.item = meshes.globalTransformIds(sample.item)!;
    sample.material = meshes.materialIds(sample.material)!;
    sample.representation = meshes.representationIds(sample.representation)!;
    sample.localTransform = meshes.localTransformIds(sample.localTransform)!;

    samples.set(sampleLocalId, sample);
  }
  return samples;
}

export function getItemsIds(model: TFB.Model) {
  return model.localIdsArray()!;
}

export function getItems(model: TFB.Model, itemIds?: Iterable<number>) {
  let source = new Set<number>();
  if (itemIds) {
    source = new Set(itemIds);
  } else {
    for (let i = 0; i < model.localIdsLength(); i++) {
      source.add(i);
    }
  }

  const items = new Map<number, ET.RawItemData>();

  for (const i of source) {
    const localId = model.localIds(i)!;
    const category = model.categories(i)!;
    const guid = model.guids(i)!;
    const attrsData = model.attributes(i)!;
    const data: Record<string, ItemAttribute> = {};
    for (let j = 0; j < attrsData.dataLength(); j++) {
      const attrString = attrsData.data(j)!;
      const [name, value, type] = JSON.parse(attrString);
      data[name] = { value, type };
    }
    items.set(localId, { data, category, guid });
  }

  return items;
}

export function getGlobalTranformsIdsOfItems(model: TFB.Model, ids: number[]) {
  const meshes = model.meshes()!;
  const source = new Set(ids);
  const globalIds = new Set<number>();
  for (let i = 0; i < meshes.meshesItemsLength(); i++) {
    const localIdIndex = meshes.meshesItems(i)!;
    const localId = model.localIds(localIdIndex)!;
    if (source.has(localId)) {
      globalIds.add(meshes.globalTransformIds(i)!);
    }
  }
  return Array.from(globalIds);
}

export function getElementsData(
  vModel: VirtualFragmentsModel,
  ids: Iterable<number>,
) {
  const model = vModel.data;
  const meshes = model.meshes()!;

  const result: { [id: number]: ET.ElementData } = {};

  const idSet = new Set(ids);

  const tempTransform = new TFB.Transform();
  const tempMaterial = new TFB.Material();
  const tempRepresentation = new TFB.Representation();
  const tempShell = new TFB.Shell();

  for (let i = 0; i < meshes.samplesLength(); i++) {
    const sample = meshes.samples(i)!;
    const gtIndex = sample.item()!;

    const idIndex = meshes.meshesItems(gtIndex)!;
    const localId = model.localIds(idIndex)!;
    if (!idSet.has(localId)) {
      continue;
    }

    if (!result[localId]) {
      result[localId] = {
        samples: {},
        localTransforms: {},
        globalTransforms: {},
        representations: {},
        materials: {},
      };
    }
    const current = result[localId];

    const ltIndex = sample.localTransform()!;
    const materialIndex = sample.material()!;
    const representationIndex = sample.representation()!;

    const sampleLocalId = meshes.sampleIds(i)!;
    const gtId = meshes.globalTransformIds(gtIndex)!;
    const ltId = meshes.localTransformIds(ltIndex)!;
    const materialId = meshes.materialIds(materialIndex)!;
    const reprId = meshes.representationIds(representationIndex)!;

    current.samples[sampleLocalId] = {
      item: gtId,
      localTransform: ltId,
      material: materialId,
      representation: reprId,
    };

    meshes.localTransforms(ltIndex, tempTransform);
    current.localTransforms[ltId] = getTransformData(tempTransform);

    meshes.globalTransforms(gtIndex, tempTransform);
    const gTransform = getTransformData(tempTransform);
    current.globalTransforms[gtId] = { ...gTransform, itemId: localId };

    meshes.materials(materialIndex, tempMaterial);
    current.materials[materialId] = getMaterialData(tempMaterial);

    meshes.representations(representationIndex, tempRepresentation);

    const repr = getRepresentationData(tempRepresentation);
    if (repr.representationClass === TFB.RepresentationClass.SHELL) {
      meshes.shells(repr.id!, tempShell);
      const shell = getShellData(tempShell);
      repr.geometry = shell;
    }

    current.representations[reprId] = repr;
  }

  const relIndicesById = new Map<number, number>();
  for (let i = 0; i < model.relationsItemsLength(); i++) {
    const relLocalId = model.relationsItems(i)!;
    relIndicesById.set(relLocalId, i);
  }

  const localIdsToIndex = new Map<number, number>();
  for (let i = 0; i < model.localIdsLength(); i++) {
    const localId = model.localIds(i)!;
    localIdsToIndex.set(localId, i);
  }

  return result;
}
