import * as THREE from "three";
import { IFragment, IFragmentGeometry } from "./base-types";

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

  private _visibilityInitialized = false;
  private _originalIndex = new Map<number, number>();
  private _idIndexIndexMap: { [id: string]: number[] } = {};

  constructor(private fragment: IFragment) {
    const attrs = fragment.mesh.geometry.attributes;
    const rawIds = attrs.blockID.array as THREE.TypedArray;
    this.ids = new Set<number>(rawIds);
    this.visibleIds = new Set<number>(this.ids);
  }

  setVisibility(
    visible: boolean,
    itemIDs = new Set(this.fragment.items),
    isolate = false
  ) {
    const geometry = this.fragment.mesh.geometry;
    const index = geometry.index;

    if (!this._visibilityInitialized) {
      this.initializeVisibility(index, geometry);
    }

    if (isolate) {
      (index.array as Uint32Array).fill(0);
    }

    for (const id of itemIDs) {
      const indices = this._idIndexIndexMap[id];
      if (!indices) continue;
      for (const i of indices) {
        const originalIndex = this._originalIndex.get(i);
        if (originalIndex === undefined) continue;
        const blockID = geometry.attributes.blockID.getX(originalIndex);
        const itemID = this.fragment.items[blockID];
        if (itemIDs.has(itemID)) {
          if (visible) {
            this.visibleIds.add(blockID);
          } else {
            this.visibleIds.delete(blockID);
          }
          const newIndex = visible ? originalIndex : 0;
          index.setX(i, newIndex);
        }
      }
    }

    index.needsUpdate = true;
  }

  private initializeVisibility(
    index: THREE.BufferAttribute,
    geometry: IFragmentGeometry
  ) {
    for (let i = 0; i < index.count; i++) {
      const foundIndex = index.getX(i);
      this._originalIndex.set(i, foundIndex);
      const blockID = geometry.attributes.blockID.getX(foundIndex);
      const itemID = this.fragment.getItemID(0, blockID);
      if (!this._idIndexIndexMap[itemID]) {
        this._idIndexIndexMap[itemID] = [];
      }
      this._idIndexIndexMap[itemID].push(i);
    }
    this._visibilityInitialized = true;
  }

  // Use this only for destroying the current Fragment instance
  dispose() {
    this._idIndexIndexMap = {};
    this.ids.clear();
    this.visibleIds.clear();
    this._originalIndex.clear();
    (this.ids as any) = null;
    (this.visibleIds as any) = null;
    (this._originalIndex as any) = null;
  }
}
