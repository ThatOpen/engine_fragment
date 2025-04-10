import * as flatbuffers from "flatbuffers";
import * as THREE from "three";
import * as FB from "../flatbuffers/fragments/v1";
import { FragmentParser } from "./types";
import {
  AlignmentObject,
  CivilCurve,
  CurveMesh,
  Fragment,
  FragmentsGroup,
  IfcSchema,
  Item,
} from "../index";

/** {@link FragmentParser} */
export class ParserV1 implements FragmentParser {
  readonly version = 1;

  private fragmentIDSeparator = "|";

  /** {@link FragmentParser.import} */
  import(bytes: Uint8Array): FragmentsGroup {
    const buffer = new flatbuffers.ByteBuffer(bytes);

    const fbFragmentsGroup = FB.FragmentsGroup.getRootAsFragmentsGroup(buffer);
    const fragmentsGroup = this.constructFragmentGroup(fbFragmentsGroup);

    const length = fbFragmentsGroup.itemsLength();
    for (let i = 0; i < length; i++) {
      const fbFragment = fbFragmentsGroup.items(i);
      if (!fbFragment) continue;
      const geometry = this.constructGeometry(fbFragment);
      const materials = this.constructMaterials(fbFragment);

      const capacity = fbFragment.capacity();

      const fragment = new Fragment(geometry, materials, capacity);
      fragment.capacityOffset = fbFragment.capacityOffset();

      this.setInstances(fbFragment, fragment);
      this.setID(fbFragment, fragment);
      fragmentsGroup.items.push(fragment);
      fragmentsGroup.add(fragment.mesh);
    }

    return fragmentsGroup;
  }

  /**
   * Exports the FragmentsGroup to a flatbuffer binary file.
   *
   * @param group - The FragmentsGroup to be exported.
   * @returns The flatbuffer binary file as a Uint8Array.
   */
  export(group: FragmentsGroup) {
    const builder = new flatbuffers.Builder(1024);
    const items: number[] = [];

    const G = FB.FragmentsGroup;
    const F = FB.Fragment;

    let civilData: number | null = null;

    if (group.civilData) {
      const alignments: number[] = [];

      const A = FB.Alignment;
      const C = FB.CivilData;

      for (const [_id, alignment] of group.civilData.alignments) {
        const { absolute, horizontal, vertical } = alignment;
        const horCurves = this.saveCivilCurves(horizontal, builder);
        const verCurves = this.saveCivilCurves(vertical, builder);
        const absCurves = this.saveCivilCurves(absolute, builder);

        const horVector = A.createHorizontalVector(builder, horCurves);
        const verVector = A.createVerticalVector(builder, verCurves);
        const absVector = A.createAbsoluteVector(builder, absCurves);

        A.startAlignment(builder);
        A.addHorizontal(builder, horVector);
        A.addVertical(builder, verVector);
        A.addAbsolute(builder, absVector);
        A.addInitialPk(builder, alignment.initialKP);
        const exported = A.endAlignment(builder);
        alignments.push(exported);
      }

      const algVector = C.createAlignmentsVector(builder, alignments);
      const coordVector = C.createCoordinationMatrixVector(
        builder,
        group.coordinationMatrix.elements,
      );

      C.startCivilData(builder);
      C.addAlignments(builder, algVector);
      C.addCoordinationMatrix(builder, coordVector);
      civilData = C.endCivilData(builder);
    }

    for (const fragment of group.items) {
      const result = fragment.exportData();

      const itemsSize: number[] = [];
      for (const itemID of fragment.ids) {
        const instances = fragment.getInstancesIDs(itemID);
        if (!instances) {
          throw new Error("Instances not found!");
        }
        itemsSize.push(instances.size);
      }

      const posVector = F.createPositionVector(builder, result.position);
      const normalVector = F.createNormalVector(builder, result.normal);
      const indexVector = F.createIndexVector(builder, result.index);
      const groupsVector = F.createGroupsVector(builder, result.groups);
      const matsVector = F.createMaterialsVector(builder, result.materials);
      const matricesVector = F.createMatricesVector(builder, result.matrices);

      const colorsVector = F.createColorsVector(builder, result.colors);
      const idsVector = F.createIdsVector(builder, result.ids);
      const itemsSizeVector = F.createItemsSizeVector(builder, itemsSize);
      const idStr = builder.createString(result.id);

      F.startFragment(builder);
      F.addPosition(builder, posVector);
      F.addNormal(builder, normalVector);
      F.addIndex(builder, indexVector);
      F.addGroups(builder, groupsVector);
      F.addMaterials(builder, matsVector);
      F.addMatrices(builder, matricesVector);
      F.addColors(builder, colorsVector);
      F.addIds(builder, idsVector);
      F.addItemsSize(builder, itemsSizeVector);
      F.addId(builder, idStr);
      F.addCapacity(builder, fragment.capacity);
      F.addCapacityOffset(builder, fragment.capacityOffset);
      const exported = FB.Fragment.endFragment(builder);
      items.push(exported);
    }

    const itemsVector = G.createItemsVector(builder, items);

    const matrixVector = G.createCoordinationMatrixVector(
      builder,
      group.coordinationMatrix.elements,
    );

    let fragmentKeys = "";
    for (const fragmentID of group.keyFragments.values()) {
      if (fragmentKeys.length) {
        fragmentKeys += this.fragmentIDSeparator;
      }
      fragmentKeys += fragmentID;
    }

    const fragmentKeysRef = builder.createString(fragmentKeys);

    const keyIndices: number[] = [];
    const itemsKeys: number[] = [];
    const relsIndices: number[] = [];
    const itemsRels: number[] = [];
    const ids: number[] = [];

    let keysCounter = 0;
    let relsCounter = 0;
    for (const [expressID, [keys, rels]] of group.data) {
      keyIndices.push(keysCounter);
      relsIndices.push(relsCounter);

      ids.push(expressID);

      for (const key of keys) {
        itemsKeys.push(key);
      }

      for (const rel of rels) {
        itemsRels.push(rel);
      }

      keysCounter += keys.length;
      relsCounter += rels.length;
    }

    const opaqueIDs: number[] = [];
    const transpIDs: number[] = [];

    for (const [geometryID, key] of group.geometryIDs.opaque) {
      opaqueIDs.push(geometryID, key);
    }

    for (const [geometryID, key] of group.geometryIDs.transparent) {
      transpIDs.push(geometryID, key);
    }

    const groupID = builder.createString(group.uuid);
    const groupName = builder.createString(group.name);

    const ifcName = builder.createString(group.ifcMetadata.name);
    const ifcDescription = builder.createString(group.ifcMetadata.description);
    const ifcSchema = builder.createString(group.ifcMetadata.schema);

    const keysIVector = G.createItemsKeysIndicesVector(builder, keyIndices);
    const keysVector = G.createItemsKeysVector(builder, itemsKeys);
    const relsIVector = G.createItemsRelsIndicesVector(builder, relsIndices);
    const relsVector = G.createItemsRelsVector(builder, itemsRels);
    const idsVector = G.createIdsVector(builder, ids);

    const oIdsVector = G.createOpaqueGeometriesIdsVector(builder, opaqueIDs);
    const tIdsVector = G.createTransparentGeometriesIdsVector(
      builder,
      transpIDs,
    );

    const { min, max } = group.boundingBox;
    const bbox = [min.x, min.y, min.z, max.x, max.y, max.z];
    const bboxVector = G.createBoundingBoxVector(builder, bbox);

    G.startFragmentsGroup(builder);
    G.addId(builder, groupID);
    G.addName(builder, groupName);
    G.addIfcName(builder, ifcName);
    G.addIfcDescription(builder, ifcDescription);
    G.addIfcSchema(builder, ifcSchema);
    G.addMaxExpressId(builder, group.ifcMetadata.maxExpressID);
    G.addItems(builder, itemsVector);
    G.addFragmentKeys(builder, fragmentKeysRef);
    G.addIds(builder, idsVector);
    G.addItemsKeysIndices(builder, keysIVector);
    G.addItemsKeys(builder, keysVector);
    G.addItemsRelsIndices(builder, relsIVector);
    G.addItemsRels(builder, relsVector);
    G.addCoordinationMatrix(builder, matrixVector);
    G.addBoundingBox(builder, bboxVector);
    G.addOpaqueGeometriesIds(builder, oIdsVector);
    G.addTransparentGeometriesIds(builder, tIdsVector);

    if (civilData !== null) {
      G.addCivil(builder, civilData);
    }

    const result = FB.FragmentsGroup.endFragmentsGroup(builder);
    builder.finish(result);

    return builder.asUint8Array();
  }

  private setID(fbFragment: FB.Fragment, fragment: Fragment) {
    const id = fbFragment.id();
    if (id) {
      fragment.id = id;
      fragment.mesh.uuid = id;
    }
  }

  private setInstances(fbFragment: FB.Fragment, fragment: Fragment) {
    const matricesData = fbFragment.matricesArray();
    const colorData = fbFragment.colorsArray();

    const ids = fbFragment.idsArray();
    const itemsSize = fbFragment.itemsSizeArray();

    if (!matricesData || !ids || !itemsSize) {
      throw new Error(`Error: Can't load empty fragment!`);
    }

    const items: Item[] = [];

    let offset = 0;
    for (let i = 0; i < itemsSize.length; i++) {
      const id = ids[i];
      const size = itemsSize[i];
      const transforms: THREE.Matrix4[] = [];
      const colorsArray: THREE.Color[] = [];

      for (let j = 0; j < size; j++) {
        const mStart = offset * 16;
        const matrixArray = matricesData.subarray(mStart, mStart + 17);
        const transform = new THREE.Matrix4().fromArray(matrixArray);
        transforms.push(transform);

        if (colorData) {
          const cStart = offset * 3;
          const [r, g, b] = colorData.subarray(cStart, cStart + 4);
          const color = new THREE.Color(r, g, b);
          colorsArray.push(color);
        }

        offset++;
      }

      const colors = colorsArray.length ? colorsArray : undefined;
      items.push({ id, transforms, colors });
    }

    fragment.add(items);
  }

  private constructMaterials(fragment: FB.Fragment) {
    const materials = fragment.materialsArray();
    const matArray: THREE.MeshLambertMaterial[] = [];
    if (!materials) return matArray;

    for (let i = 0; i < materials.length; i += 5) {
      const opacity = materials[i];
      const transparent = Boolean(materials[i + 1]);
      const red = materials[i + 2];
      const green = materials[i + 3];
      const blue = materials[i + 4];

      const color = new THREE.Color(red, green, blue);

      const material = new THREE.MeshLambertMaterial({
        color,
        opacity,
        transparent,
      });

      matArray.push(material);
    }

    return matArray;
  }

  private constructFragmentGroup(group: FB.FragmentsGroup) {
    const fragmentsGroup = new FragmentsGroup();

    const civil = group.civil();

    if (civil) {
      const matArray = civil.coordinationMatrixArray();
      const coordinationMatrix = new THREE.Matrix4();
      if (matArray) {
        coordinationMatrix.fromArray(matArray);
      }

      fragmentsGroup.civilData = { alignments: new Map(), coordinationMatrix };

      const aligLength = civil.alignmentsLength();
      for (let i = 0; i < aligLength; i++) {
        const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });

        const alignment = new AlignmentObject();

        const aligData = civil.alignments(i);
        if (!aligData) {
          throw new Error("Alignment not found!");
        }
        const horLength = aligData.horizontalLength();
        alignment.horizontal = this.constructCivilCurves(
          aligData,
          alignment,
          "horizontal",
          horLength,
          lineMat,
        );

        const verLength = aligData.verticalLength();
        alignment.vertical = this.constructCivilCurves(
          aligData,
          alignment,
          "vertical",
          verLength,
          lineMat,
        );

        const absLength = aligData.horizontalLength();
        alignment.absolute = this.constructCivilCurves(
          aligData,
          alignment,
          "absolute",
          absLength,
          lineMat,
        );

        alignment.initialKP = aligData.initialPk();

        fragmentsGroup.civilData.alignments.set(i, alignment);
      }
    }

    // fragmentsGroup.ifcCivil?.horizontalAlignments
    fragmentsGroup.uuid = group.id() || fragmentsGroup.uuid;
    fragmentsGroup.name = group.name() || "";

    fragmentsGroup.ifcMetadata = {
      name: group.ifcName() || "",
      description: group.ifcDescription() || "",
      schema: (group.ifcSchema() as IfcSchema) || "IFC2X3",
      maxExpressID: group.maxExpressId() || 0,
    };

    const defaultMatrix = new THREE.Matrix4().elements;
    const matrixArray = group.coordinationMatrixArray() || defaultMatrix;
    const ids = group.idsArray() || new Uint32Array();
    const keysIndices = group.itemsKeysIndicesArray() || new Uint32Array();
    const keysArray = group.itemsKeysArray() || new Uint32Array();
    const relsArray = group.itemsRelsArray() || new Uint32Array();
    const relsIndices = group.itemsRelsIndicesArray() || new Uint32Array();
    const keysIdsString = group.fragmentKeys() || "";
    const keysIdsArray = keysIdsString.split(this.fragmentIDSeparator);

    this.setGroupData(fragmentsGroup, ids, keysIndices, keysArray, 0);
    this.setGroupData(fragmentsGroup, ids, relsIndices, relsArray, 1);

    const opaqueIDs = group.opaqueGeometriesIdsArray() || new Uint32Array();
    const transpIDs =
      group.transparentGeometriesIdsArray() || new Uint32Array();

    const opaque = new Map<number, number>();
    for (let i = 0; i < opaqueIDs.length - 1; i += 2) {
      const geometryID = opaqueIDs[i];
      const key = opaqueIDs[i + 1];
      opaque.set(geometryID, key);
    }

    const transparent = new Map<number, number>();
    for (let i = 0; i < transpIDs.length - 1; i += 2) {
      const geometryID = transpIDs[i];
      const key = transpIDs[i + 1];
      transparent.set(geometryID, key);
    }

    fragmentsGroup.geometryIDs = { opaque, transparent };

    const bbox = group.boundingBoxArray() || [0, 0, 0, 0, 0, 0];
    const [minX, minY, minZ, maxX, maxY, maxZ] = bbox;
    fragmentsGroup.boundingBox.min.set(minX, minY, minZ);
    fragmentsGroup.boundingBox.max.set(maxX, maxY, maxZ);

    for (let i = 0; i < keysIdsArray.length; i++) {
      fragmentsGroup.keyFragments.set(i, keysIdsArray[i]);
    }

    if (matrixArray.length === 16) {
      fragmentsGroup.coordinationMatrix.fromArray(matrixArray);
    }

    return fragmentsGroup;
  }

  private setGroupData(
    group: FragmentsGroup,
    ids: Uint32Array,
    indices: Uint32Array,
    array: Uint32Array,
    index: number,
  ) {
    for (let i = 0; i < indices.length; i++) {
      const expressID = ids[i];
      const currentIndex = indices[i];
      const nextIndex = indices[i + 1] || array.length;

      const keys: number[] = [];
      for (let j = currentIndex; j < nextIndex; j++) {
        keys.push(array[j]);
      }

      if (!group.data.has(expressID)) {
        group.data.set(expressID, [[], []]);
      }
      const data = group.data.get(expressID);
      if (!data) continue;
      data[index] = keys;
    }
  }

  private constructGeometry(fragment: FB.Fragment) {
    const position = fragment.positionArray() || new Float32Array();
    const normal = fragment.normalArray() || new Float32Array();
    const index = fragment.indexArray();
    const groups = fragment.groupsArray();
    if (!index) throw new Error("Index not found!");

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(Array.from(index));
    geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(normal, 3));

    if (groups) {
      for (let i = 0; i < groups.length; i += 3) {
        const start = groups[i];
        const count = groups[i + 1];
        const materialIndex = groups[i + 2];
        geometry.addGroup(start, count, materialIndex);
      }
    }

    return geometry;
  }

  private constructCivilCurves(
    alignData: FB.Alignment,
    alignment: AlignmentObject,
    option: "horizontal" | "vertical" | "absolute",
    length: number,
    lineMat: THREE.LineBasicMaterial,
  ) {
    const curves: CivilCurve[] = [];
    for (let i = 0; i < length; i++) {
      const found = alignData[option](i);
      if (!found) {
        throw new Error("Curve not found!");
      }
      const points = found.pointsArray();
      if (points === null) {
        throw new Error("Curve points not found!");
      }

      let data = {} as any;
      const curveData = found.data();
      if (curveData) {
        data = JSON.parse(curveData);
      }

      const geometry = new THREE.EdgesGeometry();
      const posAttr = new THREE.BufferAttribute(points, 3);
      geometry.setAttribute("position", posAttr);

      const index = [];
      for (let i = 0; i < points.length / 3 - 1; i++) {
        index.push(i, i + 1);
      }
      geometry.setIndex(index);

      const curveMesh = new CurveMesh(i, data, alignment, geometry, lineMat);
      curves.push(curveMesh.curve);
    }

    return curves;
  }

  private saveCivilCurves(curves: CivilCurve[], builder: flatbuffers.Builder) {
    const CC = FB.CivilCurve;
    const curvesRef: number[] = [];
    for (const curve of curves) {
      const attrs = curve.mesh.geometry.attributes;
      const position = attrs.position.array as Float32Array;
      const posVector = CC.createPointsVector(builder, position);
      const dataStr = builder.createString(JSON.stringify(curve.data));
      CC.startCivilCurve(builder);
      CC.addPoints(builder, posVector);
      CC.addData(builder, dataStr);
      const exported = CC.endCivilCurve(builder);
      curvesRef.push(exported);
    }
    return curvesRef;
  }
}
