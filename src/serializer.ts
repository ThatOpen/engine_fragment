import * as THREE from "three";
import * as flatbuffers from "flatbuffers";
import * as FB from "./flatbuffers/fragments";
import { Fragment } from "./fragment";
import { Items } from "./base-types";

/**
 * Object to export and import sets of fragments efficiently using
 * [flatbuffers](https://flatbuffers.dev/).
 */
export class Serializer {
  import(bytes: Uint8Array): Fragment[] {
    const buffer = new flatbuffers.ByteBuffer(bytes);
    const fragments: Fragment[] = [];
    const fbFragments = FB.Fragments.getRootAsFragments(buffer);
    const length = fbFragments.itemsLength();
    for (let i = 0; i < length; i++) {
      const fbFragment = fbFragments.items(i);
      if (!fbFragment) continue;

      const geometry = this.constructGeometry(fbFragment);
      const materials = this.constructMaterials(fbFragment);
      const instances = this.constructInstances(fbFragment);
      const fragment = new Fragment(geometry, materials, instances.length);
      this.setInstances(instances, fragment);
      this.setID(fbFragment, fragment);
      fragments.push(fragment);
    }

    return fragments;
  }

  export(fragments: Fragment[]) {
    const builder = new flatbuffers.Builder(1024);
    const items: number[] = [];

    for (const fragment of fragments) {
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
      FB.Fragment.addIds(builder, idsStr);
      FB.Fragment.addId(builder, idStr);
      const exported = FB.Fragment.endFragment(builder);
      items.push(exported);
    }

    const itemsVector = FB.Fragments.createItemsVector(builder, items);

    FB.Fragments.startFragments(builder);
    FB.Fragments.addItems(builder, itemsVector);
    const result = FB.Fragments.endFragments(builder);
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

  private setInstances(instances: Items[], fragment: Fragment) {
    let counter = 0;
    for (const instance of instances) {
      fragment.setInstance(counter++, instance);
    }
  }

  private constructInstances(fragment: FB.Fragment) {
    const matrices = fragment.matricesArray();
    const idsString = fragment.ids();
    const id = fragment.id();

    if (!matrices || !idsString) {
      throw new Error(`Error: Can't load empty fragment: ${id}`);
    }

    const ids = idsString.split("|");

    const singleInstance = matrices.length === 16;
    const manyItems = ids.length > 1;

    const isMergedFragment = singleInstance && manyItems;
    if (isMergedFragment) {
      const transform = new THREE.Matrix4().fromArray(matrices);
      return [{ ids, transform }];
    }

    // Instanced fragment
    const groups: { ids: string[]; transform: THREE.Matrix4 }[] = [];
    for (let i = 0; i < matrices.length; i += 16) {
      const currentArray = matrices.subarray(i, i + 17);
      const transform = new THREE.Matrix4().fromArray(currentArray);
      const id = ids[i / 16];
      groups.push({ ids: [id], transform });
    }
    return groups;
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

      const color = new THREE.Color().setRGB(red, green, blue, "srgb");

      const material = new THREE.MeshLambertMaterial({
        color,
        opacity,
        transparent,
      });

      matArray.push(material);
    }

    return matArray;
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
    this.loadGroups(groups, geometry);

    return geometry;
  }

  private loadGroups(groups: Float32Array | null, geometry: any) {
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
