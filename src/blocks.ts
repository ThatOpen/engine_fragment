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

  private _originalIndex = new Map<number, number>();

  constructor(private fragment: IFragment) {
    const rawIds = fragment.mesh.geometry.attributes.blockID.array as number[];
    this.ids = new Set<number>(rawIds);
    this.visibleIds = new Set<number>(this.ids);
  }

  setVisibility(
    visible: boolean,
    itemIDs = new Set(this.fragment.items),
    isolate = true
  ) {
    const geometry = this.fragment.mesh.geometry;
    const index = geometry.index;
    if (!this._originalIndex.size) {
      for (let i = 0; i < index.count; i++) {
        this._originalIndex.set(i, index.getX(i));
      }
    }
    for (let i = 0; i < index.count; i++) {
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
      } else if (isolate) {
        index.setX(i, 0);
      }
    }
    index.needsUpdate = true;
  }

  // Use this only for destroying the current Fragment instance
  dispose() {
    this.ids.clear();
    this.visibleIds.clear();
    this._originalIndex.clear();
    (this.ids as any) = null;
    (this.visibleIds as any) = null;
    (this._originalIndex as any) = null;
  }
}
