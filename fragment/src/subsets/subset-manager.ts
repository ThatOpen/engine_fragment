import { Material, Object3D } from 'three';
import { ItemsMap } from './items-map';
import { SubsetCreator } from './subset-creator';
import { IFragment, SubsetConfig, Subsets } from '../base-types';

/**
 * Contains the logic to get, create and delete geometric subsets of an IFC model. For example,
 * this can extract all the items in a specific IfcBuildingStorey and create a new Mesh.
 */
export class SubsetManager {
  readonly items: ItemsMap;
  private subsets: Subsets = {};
  private subsetCreator: SubsetCreator;

  constructor() {
    this.items = new ItemsMap();
    this.subsetCreator = new SubsetCreator(this.items, this.subsets);
  }

  removeSubset(fragmentID: string, material?: Material, customID?: string) {
    const subsetID = this.getSubsetID(fragmentID, material, customID);
    delete this.subsets[subsetID];
  }

  createSubset(config: SubsetConfig) {
    const subsetID = this.getSubsetID(config.fragment.id, config.material, config.customID);
    return this.subsetCreator.createSubset(config, subsetID);
  }

  removeFromSubset(fragment: IFragment, ids: number[], customID?: string, material?: Material) {
    const subsetID = this.getSubsetID(fragment.id, material, customID);
    if (!this.subsets[subsetID]) return;

    const previousIDs = this.subsets[subsetID].ids;
    ids.forEach((id) => {
      if (previousIDs.has(id)) previousIDs.delete(id);
    });

    this.createSubset({
      fragment,
      removePrevious: true,
      material,
      customID,
      applyBVH: this.subsets[subsetID].bvh,
      ids: Array.from(previousIDs),
      scene: this.subsets[subsetID].mesh.parent as Object3D
    });
  }

  clearSubset(fragment: IFragment, customID?: string, material?: Material) {
    const subsetID = this.getSubsetID(fragment.id, material, customID);
    if (!this.subsets[subsetID]) return;
    this.subsets[subsetID].ids.clear();
    this.subsets[subsetID].mesh.geometry.setIndex([]);
  }

  // Use this only for destroying the current Fragment instance
  dispose() {
    this.items.dispose();
    this.subsetCreator.dispose();
    (this.subsets as any) = null;
  }

  private getSubsetID(fragmentID: string, material?: Material, customID = 'DEFAULT') {
    const baseID = fragmentID;
    const materialID = material ? material.uuid : 'DEFAULT';
    return `${baseID} - ${materialID} - ${customID}`;
  }
}
