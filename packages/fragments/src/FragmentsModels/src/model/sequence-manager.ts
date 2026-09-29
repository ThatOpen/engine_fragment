import {
  InformationResultType,
  ItemInformationType,
  ItemSelectionType,
  ResultInputType,
  SelectionInputType,
} from "./model-types";
import { FragmentsModel } from "./fragments-model";

export class SequenceManager {
  async getSequenced<
    T extends ItemInformationType,
    U extends ItemSelectionType,
  >(
    model: FragmentsModel,
    result: T,
    fromItems: U[],
    inputs?: {
      selector?: Partial<Record<U, SelectionInputType<U>>>;
      result?: ResultInputType<T>;
    },
  ) {
    const response = await model._invoke("getSequenced", [
      result,
      fromItems,
      inputs,
    ]);
    return response as Promise<InformationResultType<T>>;
  }
}
