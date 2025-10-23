import { edit } from "./edit-function";
import { newModel } from "./new-model-function";
import * as FF from "./fetch-functions";
import { solveIds } from "./id-solver";
import {
  applyChangesToRawData,
  applyChangesToIds,
  applyChangesToSpecialData,
} from "./request-filterer";

export class EditUtils {
  static edit = edit;
  static solveIds = solveIds;
  static newModel = newModel;
  static applyChangesToRawData = applyChangesToRawData;
  static applyChangesToSpecialData = applyChangesToSpecialData;
  static applyChangesToIds = applyChangesToIds;
  static getModelFromBuffer = FF.getModelFromBuffer;
  static getSampleData = FF.getSampleData;
  static getTransformData = FF.getTransformData;
  static getRelationData = FF.getRelationData;
  static getMaterialData = FF.getMaterialData;
  static getRepresentationData = FF.getRepresentationData;
  static getShellData = FF.getShellData;
  static getMaterialsIds = FF.getMaterialsIds;
  static getMaterials = FF.getMaterials;
  static getRepresentationsIds = FF.getRepresentationsIds;
  static getRepresentations = FF.getRepresentations;
  static getLocalTransformsIds = FF.getLocalTransformsIds;
  static getLocalTransforms = FF.getLocalTransforms;
  static getGlobalTransformsIds = FF.getGlobalTransformsIds;
  static getGlobalTransforms = FF.getGlobalTransforms;
  static getSamplesIds = FF.getSamplesIds;
  static getSamples = FF.getSamples;
  static getItemsIds = FF.getItemsIds;
  static getItems = FF.getItems;
  static getGlobalTranformsIdsOfItems = FF.getGlobalTranformsIdsOfItems;
  static getElementsData = FF.getElementsData;
  static getGeometryIndicesFromRepresentations =
    FF.getGeometryIndicesFromRepresentations;
  static getRootModelId = FF.getRootModelId;
  static getSerializedAttributes = FF.getSerializedAttributes;
  static itemDataToRawItemData = FF.itemDataToRawItemData;
  static DELTA_MODEL_ID = FF.DELTA_MODEL_ID;
}
