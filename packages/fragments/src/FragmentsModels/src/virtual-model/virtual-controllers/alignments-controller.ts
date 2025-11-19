import { VirtualFragmentsModel } from "..";
import {
  ALIGNMENT_CATEGORY,
  AlignmentData,
  CustomDataItem,
} from "../../model/model-types";

export class AlignmentsController {
  private _fragments: VirtualFragmentsModel;

  constructor(virtualFragmentsModel: VirtualFragmentsModel) {
    this._fragments = virtualFragmentsModel;
  }

  async getAlignments() {
    const allAlignments: AlignmentData[] = [];

    // TODO: Extend AlignmentDataItem to optionally have implicit geometry
    // Once we do it, it shouldn't be a breaking change because if it doesn't
    // have implicit, we just use explicit

    const alignCat = new RegExp(ALIGNMENT_CATEGORY);
    const allItemsIds = this._fragments.getItemsOfCategories([alignCat]);
    const itemsIds = allItemsIds[ALIGNMENT_CATEGORY];

    if (!itemsIds) {
      return [];
    }

    const alignmentsItems = this._fragments.getItemsData(
      itemsIds,
      {},
    ) as CustomDataItem[];

    for (const item of alignmentsItems) {
      const data = JSON.parse(item.data.value) as AlignmentData;
      allAlignments.push(data);
    }

    return allAlignments;
  }
}
