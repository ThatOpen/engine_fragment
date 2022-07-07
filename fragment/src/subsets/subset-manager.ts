import { BufferGeometry } from 'three';
import { ItemsMap } from './items-map';
import { IFragment, SubsetConfig } from '../base-types';
import { SubsetUtils } from './subset-utils';

/**
 * Contains the logic to get, create and delete geometric subsets of an IFC model. For example,
 * this can extract all the items in a specific IfcBuildingStorey and create a new Mesh.
 */
export class SubsetManager {
  private items: ItemsMap;
  private tempIndex: number[] = [];
  private ids = new Set<number>();

  constructor(private fragment: IFragment) {
    this.items = new ItemsMap(fragment);
    this.initializeSubsetGroups(fragment);
    this.createDefaultSubset(fragment);
  }

  createSubset(config: SubsetConfig) {
    this.filterIndices(config);
    this.constructSubsetByMaterial(config);
    config.ids.forEach((id) => this.ids.add(id));
    this.fragment.mesh.geometry.setIndex(this.tempIndex);
    this.tempIndex.length = 0;
  }

  removeFromSubset(fragment: IFragment, ids: number[]) {
    ids.forEach((id) => {
      if (this.ids.has(id)) this.ids.delete(id);
    });

    this.createSubset({
      fragment,
      removePrevious: true,
      applyBVH: true,
      ids: Array.from(this.ids)
    });
  }

  // Use this only for destroying the current Fragment instance
  dispose() {
    this.items.dispose();
    this.tempIndex = [];
    (this.ids as any) = null;
  }

  private createDefaultSubset(fragment: IFragment) {
    const rawIds = fragment.mesh.geometry.attributes.blockID.array as number[];
    const ids = Array.from(new Set<number>(rawIds));
    this.createSubset({ fragment, ids, removePrevious: false });
  }

  private initializeSubsetGroups(fragment: IFragment) {
    const geometry = fragment.mesh.geometry;
    geometry.groups = JSON.parse(JSON.stringify(geometry.groups));
    this.resetGroups(geometry);
  }

  // Remove previous indices or filter the given ones to avoid repeating items
  private filterIndices(config: SubsetConfig) {
    const geometry = this.fragment.mesh.geometry;
    if (config.removePrevious) {
      geometry.setIndex([]);
      this.resetGroups(geometry);
      return;
    }
    const previousIndices = geometry.index.array;
    const previousIDs = this.ids;
    config.ids = config.ids.filter((id) => !previousIDs.has(id));
    this.tempIndex = Array.from(previousIndices);
  }

  private constructSubsetByMaterial(config: SubsetConfig) {
    const model = config.fragment.mesh;
    const newIndices = { count: 0 };
    for (let i = 0; i < model.geometry.groups.length; i++) {
      this.insertNewIndices(config, i, newIndices);
    }
  }

  // Inserts indices in correct position and update groups
  private insertNewIndices(config: SubsetConfig, materialIndex: number, newIndices: any) {
    const items = this.items.blocks;
    const indicesOfOneMaterial = SubsetUtils.getAllIndicesOfGroup(
      config.ids,
      materialIndex,
      items
    ) as number[];

    this.insertIndicesAtGroup(indicesOfOneMaterial, materialIndex, newIndices);
  }

  private insertIndicesAtGroup(indicesByGroup: number[], index: number, newIndices: any) {
    const currentGroup = this.getCurrentGroup(index);
    currentGroup.start += newIndices.count;
    const newIndicesPosition = currentGroup.start + currentGroup.count;
    newIndices.count += indicesByGroup.length;
    if (indicesByGroup.length > 0) {
      const position = newIndicesPosition;
      const start = this.tempIndex.slice(0, position);
      const end = this.tempIndex.slice(position);
      this.tempIndex = Array.prototype.concat.apply([], [start, indicesByGroup, end]);
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
}
