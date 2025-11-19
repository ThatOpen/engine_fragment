import { VirtualFragmentsModel } from "..";
import {
  CustomDataItem,
  GRID_CATEGORY,
  GridData,
} from "../../model/model-types";

export class GridsController {
  private _fragments: VirtualFragmentsModel;

  constructor(virtualFragmentsModel: VirtualFragmentsModel) {
    this._fragments = virtualFragmentsModel;
  }

  async getGrids() {
    const allGrids: GridData[] = [];

    const gridCat = new RegExp(GRID_CATEGORY);
    const allItemsIds = this._fragments.getItemsOfCategories([gridCat]);
    const itemsIds = allItemsIds[GRID_CATEGORY];

    if (!itemsIds) {
      return [];
    }

    const gridsItems = this._fragments.getItemsData(
      itemsIds,
      {},
    ) as CustomDataItem[];

    for (const item of gridsItems) {
      const data = JSON.parse(item.data.value) as GridData;
      allGrids.push(data);
    }

    return allGrids;
  }
}
