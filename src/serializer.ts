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

    for (const fragment of group.items) {
      const result = fragment.exportData();
      const posVector = FB.Fragment.createPositionVector(
        builder,
        result.position
      );
      const normalVector = FB.Fragment.createNormalVector(
        builder,
        result.normal
      );
      const blockVector = FB.Fragment.createBlockIdVector(
        builder,
        result.blockID
      );
      const indexVector = FB.Fragment.createIndexVector(builder, result.index);
      const groupsVector = FB.Fragment.createGroupsVector(
        builder,
        result.groups
      );
      const matsVector = FB.Fragment.createMaterialsVector(
        builder,
        result.materials
      );
      const matricesVector = FB.Fragment.createMatricesVector(
        builder,
        result.matrices
      );

      const colorsVector = FB.Fragment.createColorsVector(
        builder,
        result.colors
      );

      const idsStr = builder.createString(result.ids);
      const idStr = builder.createString(result.id);

      FB.Fragment.startFragment(builder);
      FB.Fragment.addPosition(builder, posVector);
      FB.Fragment.addNormal(builder, normalVector);
      FB.Fragment.addBlockId(builder, blockVector);
      FB.Fragment.addIndex(builder, indexVector);
      FB.Fragment.addGroups(builder, groupsVector);
      FB.Fragment.addMaterials(builder, matsVector);
      FB.Fragment.addMatrices(builder, matricesVector);
      FB.Fragment.addColors(builder, colorsVector);
      FB.Fragment.addIds(builder, idsStr);
      FB.Fragment.addId(builder, idStr);
      const exported = FB.Fragment.endFragment(builder);
      items.push(exported);
    }

    const itemsVector = FB.FragmentsGroup.createItemsVector(builder, items);

    const matrixVector = FB.FragmentsGroup.createMatrixVector(
      builder,
      group.matrix.elements
    );

    let fragmentKeys = "";
    for (const key in group.keys) {
      const fragmentID = group.keys[key];
      if (fragmentKeys.length) fragmentKeys += this.fragmentIDSeparator;
      fragmentKeys += fragmentID;
    }

    const fragmentKeysRef = builder.createString(fragmentKeys);

    const indices: number[] = [];
    const itemsData: number[] = [];
    let counter = 0;
    for (const expressID in group.data) {
      indices.push(counter);
      const itemData = group.data[expressID];
      const id = parseInt(expressID, 10);
      itemsData.push(id);
      for (const data of itemData) {
        itemsData.push(data);
      }
      counter += itemData.length + 1;
    }

    const indicesVector = FB.FragmentsGroup.createItemsIndicesVector(
      builder,
      indices
    );

    const dataVector = FB.FragmentsGroup.createItemsDataVector(
      builder,
      itemsData
    );

    FB.FragmentsGroup.startFragmentsGroup(builder);
    FB.FragmentsGroup.addItems(builder, itemsVector);
    FB.FragmentsGroup.addFragmentKeys(builder, fragmentKeysRef);
    FB.FragmentsGroup.addItemsIndices(builder, indicesVector);
    FB.FragmentsGroup.addItemsData(builder, dataVector);
    FB.FragmentsGroup.addMatrix(builder, matrixVector);
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
    const keysIndicesArray = group.itemsIndicesArray() || new Int32Array();
    const keysArray = group.itemsDataArray() || new Int32Array();
    const keysIdsString = group.fragmentKeys() || "";
    const keysIdsArray = keysIdsString.split(this.fragmentIDSeparator);

    for (let i = 0; i < keysIndicesArray.length - 1; i++) {
      const currentIndex = keysIndicesArray[i];
      const nextIndex = keysIndicesArray[i + 1];
      const expressID = keysArray[currentIndex];
      const itemData: number[] = [];
      for (let j = currentIndex + 1; j < nextIndex; j++) {
        itemData.push(keysArray[j]);
      }
      fragmentsGroup.data[expressID] = itemData;
    }

    for (let i = 0; i < keysIdsArray.length; i++) {
      fragmentsGroup.keys[i] = keysIdsArray[i];
    }

    if (matrixArray.length === 16) {
      fragmentsGroup.matrix.fromArray(matrixArray);
    }

    return fragmentsGroup;
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
