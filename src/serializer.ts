import * as THREE from "three";
import * as flatbuffers from "flatbuffers";
import * as FB from "./flatbuffers/fragments";
import { Fragment } from "./fragment";
import { Items } from "./base-types";
import { FragmentsGroup } from "./fragments-group";

/**
 * Object to export and import sets of fragments efficiently using
 * [flatbuffers](https://flatbuffers.dev/).
 */
export class Serializer {
  private fragmentIDSeparator = "|";

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
      const { instances, colors } = this.constructInstances(fbFragment);
      const fragment = new Fragment(geometry, materials, instances.length);
      this.setInstances(instances, colors, fragment);
      this.setID(fbFragment, fragment);
      fragmentsGroup.items.push(fragment);
      fragmentsGroup.add(fragment.mesh);
    }

    return fragmentsGroup;
  }

  export(group: FragmentsGroup) {
    const builder = new flatbuffers.Builder(1024);
    const items: number[] = [];

    const G = FB.FragmentsGroup;
    const F = FB.Fragment;

    for (const fragment of group.items) {
      const result = fragment.exportData();
      const posVector = F.createPositionVector(builder, result.position);
      const normalVector = F.createNormalVector(builder, result.normal);
      const blockVector = F.createBlockIdVector(builder, result.blockID);
      const indexVector = F.createIndexVector(builder, result.index);
      const groupsVector = F.createGroupsVector(builder, result.groups);
      const matsVector = F.createMaterialsVector(builder, result.materials);
      const matricesVector = F.createMatricesVector(builder, result.matrices);

      const colorsVector = F.createColorsVector(builder, result.colors);
      const idsStr = builder.createString(result.ids);
      const idStr = builder.createString(result.id);

      F.startFragment(builder);
      F.addPosition(builder, posVector);
      F.addNormal(builder, normalVector);
      F.addBlockId(builder, blockVector);
      F.addIndex(builder, indexVector);
      F.addGroups(builder, groupsVector);
      F.addMaterials(builder, matsVector);
      F.addMatrices(builder, matricesVector);
      F.addColors(builder, colorsVector);
      F.addIds(builder, idsStr);
      F.addId(builder, idStr);
      const exported = FB.Fragment.endFragment(builder);
      items.push(exported);
    }

    const itemsVector = G.createItemsVector(builder, items);

    const matrixVector = G.createMatrixVector(builder, group.matrix.elements);

    let fragmentKeys = "";
    for (const key in group.keyFragments) {
      const fragmentID = group.keyFragments[key];
      if (fragmentKeys.length) fragmentKeys += this.fragmentIDSeparator;
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
    for (const expressID in group.data) {
      keyIndices.push(keysCounter);
      relsIndices.push(relsCounter);
      const [keys, rels] = group.data[expressID];

      const id = parseInt(expressID, 10);
      ids.push(id);

      for (const key of keys) {
        itemsKeys.push(key);
      }

      for (const rel of rels) {
        itemsRels.push(rel);
      }

      keysCounter += keys.length;
      relsCounter += rels.length;
    }

    const keysIVector = G.createItemsKeysIndicesVector(builder, keyIndices);
    const keysVector = G.createItemsKeysVector(builder, itemsKeys);
    const relsIVector = G.createItemsRelsIndicesVector(builder, relsIndices);
    const relsVector = G.createItemsRelsVector(builder, itemsRels);
    const idsVector = G.createIdsVector(builder, ids);

    G.startFragmentsGroup(builder);
    G.addItems(builder, itemsVector);
    G.addFragmentKeys(builder, fragmentKeysRef);
    G.addIds(builder, idsVector);
    G.addItemsKeysIndices(builder, keysIVector);
    G.addItemsKeys(builder, keysVector);
    G.addItemsRelsIndices(builder, relsIVector);
    G.addItemsRels(builder, relsVector);
    G.addMatrix(builder, matrixVector);
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

  private setInstances(
    instances: Items[],
    colors: THREE.Color[],
    fragment: Fragment
  ) {
    for (let i = 0; i < instances.length; i++) {
      fragment.setInstance(i, instances[i]);
      if (colors.length) {
        fragment.mesh.setColorAt(i, colors[i]);
      }
    }
  }

  private constructInstances(fragment: FB.Fragment) {
    const matricesData = fragment.matricesArray();
    const colorData = fragment.colorsArray();
    const colors: THREE.Color[] = [];

    const idsString = fragment.ids();
    const id = fragment.id();

    if (!matricesData || !idsString) {
      throw new Error(`Error: Can't load empty fragment: ${id}`);
    }

    const ids = idsString.split("|");

    const singleInstance = matricesData.length === 16;
    const manyItems = ids.length > 1;

    const isMergedFragment = singleInstance && manyItems;
    if (isMergedFragment) {
      const transform = new THREE.Matrix4().fromArray(matricesData);
      const instances = [{ ids, transform }];
      return { instances, colors };
    }

    // Instanced fragment
    const instances: { ids: string[]; transform: THREE.Matrix4 }[] = [];
    for (let i = 0; i < matricesData.length; i += 16) {
      const matrixArray = matricesData.subarray(i, i + 17);
      const transform = new THREE.Matrix4().fromArray(matrixArray);
      const id = ids[i / 16];
      instances.push({ ids: [id], transform });
    }

    if (colorData && colorData.length === instances.length * 3) {
      for (let i = 0; i < colorData.length; i += 3) {
        const [r, g, b] = colorData.subarray(i, i + 4);
        const color = new THREE.Color(r, g, b);
        colors.push(color);
      }
    }

    return { instances, colors };
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

    const matrixArray = group.matrixArray() || new Float32Array();
    const ids = group.idsArray() || new Int32Array();
    const keysIndices = group.itemsKeysIndicesArray() || new Int32Array();
    const keysArray = group.itemsKeysArray() || new Int32Array();
    const relsArray = group.itemsRelsArray() || new Int32Array();
    const relsIndices = group.itemsRelsIndicesArray() || new Int32Array();
    const keysIdsString = group.fragmentKeys() || "";
    const keysIdsArray = keysIdsString.split(this.fragmentIDSeparator);

    this.setGroupData(fragmentsGroup, ids, keysIndices, keysArray, 0);
    this.setGroupData(fragmentsGroup, ids, relsIndices, relsArray, 1);

    for (let i = 0; i < keysIdsArray.length; i++) {
      fragmentsGroup.keyFragments[i] = keysIdsArray[i];
    }

    if (matrixArray.length === 16) {
      fragmentsGroup.matrix.fromArray(matrixArray);
    }

    return fragmentsGroup;
  }

  private setGroupData(
    group: FragmentsGroup,
    ids: Int32Array,
    indices: Int32Array,
    array: Int32Array,
    index: number
  ) {
    for (let i = 0; i < indices.length - 1; i++) {
      const expressID = ids[i];
      const currentIndex = indices[i];
      const nextIndex = indices[i + 1];

      const keys: number[] = [];
      for (let j = currentIndex; j < nextIndex; j++) {
        keys.push(array[j]);
      }

      if (!group.data[expressID]) {
        group.data[expressID] = [[], []];
      }
      group.data[expressID][index] = keys;
    }
  }

  private constructGeometry(fragment: FB.Fragment) {
    const position = fragment.positionArray();
    const normal = fragment.normalArray();
    const blockID = fragment.blockIdArray();
    const index = fragment.indexArray();
    const groups = fragment.groupsArray();
    if (!index) throw new Error("Index not found!");

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(Array.from(index));
    this.loadAttribute(geometry, "position", position, 3);
    this.loadAttribute(geometry, "normal", normal, 3);
    this.loadAttribute(geometry, "blockID", blockID, 1);
    this.loadGeometryGroups(groups, geometry);

    return geometry;
  }

  private loadGeometryGroups(groups: Float32Array | null, geometry: any) {
    if (!groups) return;
    for (let i = 0; i < groups.length; i += 3) {
      const start = groups[i];
      const count = groups[i + 1];
      const materialIndex = groups[i + 2];
      geometry.addGroup(start, count, materialIndex);
    }
  }

  private loadAttribute(
    geometry: THREE.BufferGeometry,
    name: string,
    data: any | null,
    size: number
  ) {
    if (!data) return;
    geometry.setAttribute(name, new THREE.BufferAttribute(data, size));
  }
}
