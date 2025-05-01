import {
  ItemInformationType,
  ItemSelectionType,
} from "../../model/model-types";
import { VirtualFragmentsModel } from "../virtual-fragments-model";

export class SequenceHelper {
  private _model: VirtualFragmentsModel;

  constructor(model: VirtualFragmentsModel) {
    this._model = model;
  }

  getSequenced(
    result: ItemInformationType,
    fromItems: ItemSelectionType[],
    inputs?: {
      selector?: Partial<Record<ItemSelectionType, any>>;
      result?: any;
    },
  ) {
    const resultFunction = this.sequenceResultFunction[result];
    if (!resultFunction) return null;
    let partial: number[] = [];
    let iterations = 0;
    for (const action of fromItems) {
      const selectorFunction = this.sequenceSelectorFunction[action];
      if (!selectorFunction) continue;
      const input = inputs?.selector?.[action];
      const data = iterations === 0 ? input : partial;
      partial = selectorFunction(data);
      iterations++;
    }
    const input = inputs?.result;
    const out = resultFunction(partial, input);
    return out;
  }

  private sequenceSelectorFunction: Record<
    ItemSelectionType,
    (...args: any) => number[]
  > = {
    withVisiblity: (_) => this._model.getItemsByVisibility(_),
    highlighted: () => this._model.getHighlightItemIds(),
    children: (_) => this._model.getItemsChildren(_),
    ofCategory: (_) => this._model.getItemsOfCategory(_),
    withCondition: () => [],
    withGeometry: () => this._model.getItemsWithGeometry(),
  };

  private sequenceResultFunction: Record<
    ItemInformationType,
    (ids: number[], ...args: any) => any
  > = {
    attributes: (ids: number[]) =>
      ids.map((id) => this._model.getItemAttributes(id)),
    mergedBoxes: (_) => this._model.getBBoxes(_),
    category: (ids: number[]) =>
      ids.map((id) => this._model.getItemCategory(id)),
    children: (_) => this._model.getItemsChildren(_),
    data: (ids: number[], ...args) => this._model.getItemsData(ids, args[0]),
    geometry: (ids: number[]) => this._model.getItemsGeometry(ids),
    guid: (_) => this._model.getGuidsByLocalIds(_),
    highlight: (_) => this._model.getHighlight(_),
    relations: (ids: number[]) =>
      ids.map((id) => this._model.getItemRelations(id)),
    visibility: (_) => this._model.getVisible(_),
  };
}
