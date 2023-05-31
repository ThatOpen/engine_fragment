import { BufferGeometry } from "three";
import { BlocksMap } from "./blocks-map";
import { IFragment } from "./base-types";

/**
 * Contains the logic to get, create and delete geometric subsets of an IFC model. For example,
 * this can extract all the items in a specific IfcBuildingStorey and create a new Mesh.
 */
export class Blocks {
  readonly ids: Set<number>;
  readonly visibleIds: Set<number>;

  get count() {
    return this.ids.size;
  }

  private blocksMap: BlocksMap;
  private tempIndex: number[] = [];

  constructor(private fragment: IFragment) {
    this.blocksMap = new BlocksMap(fragment);
    this.initializeSubsetGroups(fragment);

    const rawIds = fragment.mesh.geometry.attributes.blockID.array as number[];
    this.visibleIds = new Set<number>(rawIds);
    this.ids = new Set<number>(rawIds);
    this.add(Array.from(this.ids), true);
  }

  reset() {
    this.add(Array.from(this.ids), true);
  }

  add(ids: number[], removePrevious = true) {
    this.filterIndices(removePrevious);
    const filtered = ids.filter((id) => !this.visibleIds.has(id));

    this.constructSubsetByMaterial(ids);
    filtered.forEach((id) => this.visibleIds.add(id));
    this.fragment.mesh.geometry.setIndex(this.tempIndex);
    this.tempIndex.length = 0;
  }

  remove(ids: number[]) {
    ids.forEach((id) => this.visibleIds.has(id) && this.visibleIds.delete(id));
    const remainingIDs = Array.from(this.visibleIds);
    this.add(remainingIDs, true);
  }

  // Use this only for destroying the current Fragment instance
  dispose() {
    this.blocksMap.dispose();
    this.tempIndex = [];
    this.visibleIds.clear();
    (this.visibleIds as any) = null;
    this.ids.clear();
    (this.ids as any) = null;
  }

  private initializeSubsetGroups(fragment: IFragment) {
    const geometry = fragment.mesh.geometry;
    geometry.groups = JSON.parse(JSON.stringify(geometry.groups));
    this.resetGroups(geometry);
  }

  // Remove previous indices or filter the given ones to avoid repeating items
  private filterIndices(removePrevious: boolean) {
    const geometry = this.fragment.mesh.geometry;

    if (!removePrevious) {
      this.tempIndex = Array.from(geometry.index.array);
      return;
    }

    geometry.setIndex([]);
    this.resetGroups(geometry);
  }

  private constructSubsetByMaterial(ids: number[]) {
    const length = this.fragment.mesh.geometry.groups.length;
    const newIndices = { count: 0 };
    for (let i = 0; i < length; i++) {
      this.insertNewIndices(ids, i, newIndices);
    }
  }

  // Inserts indices in correct position and update groups
  private insertNewIndices(
    ids: number[],
    materialIndex: number,
    newIndices: any
  ) {
    const indicesOfOneMaterial = this.getAllIndicesOfGroup(
      ids,
      materialIndex
    ) as number[];
    this.insertIndicesAtGroup(indicesOfOneMaterial, materialIndex, newIndices);
  }

  private insertIndicesAtGroup(
    indicesByGroup: number[],
    index: number,
    newIndices: any
  ) {
    const currentGroup = this.getCurrentGroup(index);
    currentGroup.start += newIndices.count;
    const newIndicesPosition = currentGroup.start + currentGroup.count;
    newIndices.count += indicesByGroup.length;
    if (indicesByGroup.length > 0) {
      const position = newIndicesPosition;
      const start = this.tempIndex.slice(0, position);
      const end = this.tempIndex.slice(position);
      this.tempIndex = Array.prototype.concat.apply(
        [],
        [start, indicesByGroup, end]
      );
      currentGroup.count += indicesByGroup.length;
    }
  }

  private getCurrentGroup(groupIndex: number) {
    return this.fragment.mesh.geometry.groups[groupIndex];
  }

  private resetGroups(geometry: BufferGeometry) {
    geometry.groups.forEach((group) => {
      group.start = 0;
      group.count = 0;
    });
  }

  // If flatten, all indices are in the same array; otherwise, indices are split in subarrays by material
  private getAllIndicesOfGroup(
    ids: number[],
    materialIndex: number,
    flatten = true
  ) {
    const indicesByGroup: any = [];
    for (const id of ids) {
      const entry = this.blocksMap.indices.map.get(id);
      if (!entry) continue;
      const value = entry[materialIndex];
      if (!value) continue;
      this.getIndexChunk(value, indicesByGroup, materialIndex, flatten);
    }
    return indicesByGroup;
  }

  private getIndexChunk(
    value: number[],
    indicesByGroup: any,
    materialIndex: number,
    flatten: boolean
  ) {
    const pairs = value.length / 2;
    for (let pair = 0; pair < pairs; pair++) {
      const pairIndex = pair * 2;
      const start = value[pairIndex];
      const end = value[pairIndex + 1];
      for (let j = start; j <= end; j++) {
        if (flatten) indicesByGroup.push(this.blocksMap.indices.indexCache[j]);
        else {
          if (!indicesByGroup[materialIndex])
            indicesByGroup[materialIndex] = [];
          indicesByGroup[materialIndex].push(
            this.blocksMap.indices.indexCache[j]
          );
        }
      }
    }
  }
}
