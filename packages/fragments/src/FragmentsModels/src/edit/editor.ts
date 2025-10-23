import * as THREE from "three";
import { FragmentsModels, ItemData } from "../..";
import { FragmentsConnection } from "../multithreading/fragments-connection";
import {
  EditRequest,
  Event,
  NewElementData,
  RawCircleExtrusion,
  RawItemData,
} from "../../../Utils";
import { EditHelper } from "./edit-helper";
import { ElementsHelper } from "./elements-helper";
import { Element } from "./element";

/**
 * The Editor class provides functionality for editing and managing Fragments models. It handles operations like editing model elements, saving changes and managing edit history.
 */
export class Editor {
  /**
   * Event triggered when an edit is made.
   */
  onEdit = new Event<{ modelId: string }>();

  private _editHelper: EditHelper;
  private _elementsHelper: ElementsHelper;

  constructor(core: FragmentsModels, connection: FragmentsConnection) {
    this._editHelper = new EditHelper(core, connection);
    this._elementsHelper = new ElementsHelper(core);
  }

  /**
   * Edits a Fragments model.
   * @param modelId - The ID of the model to edit.
   * @param actions - The actions to perform on the model.
   * @param config - The configuration for the edit.
   * @returns The IDs of the elements that were edited.
   */
  async edit(
    modelId: string,
    actions: EditRequest[],
    config = {
      removeRedo: true,
    },
  ) {
    const ids = await this._editHelper.edit(modelId, actions, config);
    this.onEdit.trigger();
    return ids;
  }

  /**
   * Saves all the edits of the specified Fragments model. Useful for exporting the model with the edits applied. Similar to "Saving" the changes in a BIM app.
   * @param modelId - The ID of the model to save.
   * @returns The requests that were saved.
   */
  async save(modelId: string) {
    return this._editHelper.save(modelId);
  }

  /**
   * Resets the edits of the specified Fragments model.
   * @param modelId - The ID of the model to reset.
   */
  async reset(modelId: string) {
    await this._editHelper.reset(modelId);
  }

  /**
   * Gets the requests of the specified Fragments model. Useful for building a history menu.
   * @param modelId - The ID of the model to get the requests from.
   * @returns The requests of the model.
   */
  async getModelRequests(modelId: string) {
    return this._editHelper.getRequests(modelId);
  }

  /**
   * Selects an edit request of the specified Fragments model to set the model in the state it
   * was after the request was applied.
   * @param modelId - The ID of the model to select the request from.
   * @param index - The index of the request to select.
   * @returns The selected request.
   */
  async selectRequest(modelId: string, index: number) {
    return this._editHelper.selectRequest(modelId, index);
  }

  /**
   * Clears all the element edit requests of the specified Fragments model.
   * @param modelId - The ID of the model to clear the requests from.
   */

  clearElementsRequests(modelId: string) {
    return this._elementsHelper.getRequests(modelId);
  }

  /**
   * Creates a material in the specified Fragments model.
   * @param modelId - The ID of the model to create the material in.
   * @param material - The material to create.
   * @returns The created material.
   */
  createMaterial(modelId: string, material: THREE.MeshLambertMaterial) {
    return this._elementsHelper.createMaterial(modelId, material);
  }

  /**
   * Creates a local transform in the specified Fragments model.
   * @param modelId - The ID of the model to create the local transform in.
   * @param transform - The local transform to create.
   * @returns The created local transform.
   */
  createLocalTransform(modelId: string, transform: THREE.Matrix4) {
    return this._elementsHelper.createLocalTransform(modelId, transform);
  }

  /**
   * Creates a shell in the specified Fragments model.
   * @param modelId - The ID of the model to create the shell in.
   * @param geometry - The geometry of the shell to create.
   * @returns The created shell.
   */
  createShell(modelId: string, geometry: THREE.BufferGeometry) {
    return this._elementsHelper.createShell(modelId, geometry);
  }

  /**
   * Creates a circle extrusion in the specified Fragments model.
   * @param modelId - The ID of the model to create the circle extrusion in.
   * @param data - The data of the circle extrusion to create.
   * @returns The created circle extrusion.
   */
  createCircleExtrusion(modelId: string, data: RawCircleExtrusion) {
    return this._elementsHelper.createCircleExtrusion(modelId, data);
  }

  /**
   * Creates a global transform in the specified Fragments model.
   * @param modelId - The ID of the model to create the global transform in.
   * @param transform - The global transform to create.
   * @param itemId - The ID of the item to create the global transform for.
   * @returns The created global transform.
   */
  createGlobalTransform(
    modelId: string,
    transform: THREE.Matrix4,
    itemId: number | string,
  ) {
    return this._elementsHelper.createGlobalTransform(
      modelId,
      transform,
      itemId,
    );
  }

  /**
   * Creates a sample in the specified Fragments model.
   * @param modelId - The ID of the model to create the sample in.
   * @param data - The data of the sample to create.
   * @returns The created sample.
   */
  createSample(
    modelId: string,
    data: {
      localTransform: number | string;
      representation: number | string;
      material: number | string;
      globalTransform: number | string;
    },
  ) {
    return this._elementsHelper.createSample(modelId, data);
  }

  /**
   * Creates an item in the specified Fragments model.
   * @param modelId - The ID of the model to create the item in.
   * @param item - The item to create.
   * @returns The created item.
   */
  createItem(modelId: string, item: RawItemData) {
    return this._elementsHelper.createItem(modelId, item);
  }

  /**
   * Sets an item in the specified Fragments model.
   * @param modelId - The ID of the model to set the item in.
   * @param item - The item to set.
   * @returns The set item.
   */
  setItem(modelId: string, item: ItemData) {
    return this._elementsHelper.setItem(modelId, item);
  }

  /**
   * Relates an item to other items in the specified Fragments model.
   * @param modelId - The ID of the model to relate the item in.
   * @param itemId - The ID of the item to relate.
   * @param relationName - The name of the relation to relate.
   * @param itemIds - The IDs of the items to relate.
   * @returns The related items.
   */
  async relate(
    modelId: string,
    itemId: number,
    relationName: string,
    itemIds: number[],
  ) {
    return this._elementsHelper.relate(modelId, itemId, relationName, itemIds);
  }

  /**
   * Removes a relation between an item and other items in the specified Fragments model.
   * @param modelId - The ID of the model to unrelate the item in.
   * @param itemId - The ID of the item to unrelate.
   * @param relationName - The name of the relation to unrelate.
   * @param itemIds - The IDs of the items to unrelate.
   * @returns The unrelated items.
   */
  async unrelate(
    modelId: string,
    itemId: number,
    relationName: string,
    itemIds: number[],
  ) {
    return this._elementsHelper.unrelate(
      modelId,
      itemId,
      relationName,
      itemIds,
    );
  }

  /**
   * Gets the elements of the specified Fragments model.
   * @param modelId - The ID of the model to get the elements from.
   * @param localIds - The local IDs of the elements to get.
   * @returns The elements of the model.
   */
  async getElements(modelId: string, localIds: Iterable<number>) {
    return this._elementsHelper.get(modelId, localIds);
  }

  /**
   * Creates elements in the specified Fragments model.
   * @param modelId - The ID of the model to create the elements in.
   * @param elements - The elements to create.
   * @returns The created elements.
   */
  async createElements(modelId: string, elements: NewElementData[]) {
    return this._elementsHelper.create(modelId, elements);
  }

  /**
   * Deletes elements in the specified Fragments model.
   * @param modelId - The ID of the model to delete the elements in.
   * @param elements - The elements to delete.
   * @returns The deleted elements.
   */
  deleteElements(modelId: string, elements: Element[]) {
    return this._elementsHelper.delete(modelId, elements);
  }

  /**
   * Applies changes to the specified Fragments model.
   * @param modelId - The ID of the model to apply the changes to.
   * @param elements - The elements to apply the changes to.
   * @returns The applied changes.
   */
  async applyChanges(modelId: string, elements: Element[] = []) {
    return this._elementsHelper.applyChanges(modelId, elements);
  }

  /**
   * Deletes any type of data from the specified Fragments model.
   * @param modelId - The ID of the model to delete the data from.
   * @param data - The data to delete.
   * @returns The deleted data.
   */
  async deleteData(
    modelId: string,
    data: {
      itemIds?: Iterable<number>;
      materialIds?: Iterable<number>;
      localTransformIds?: Iterable<number>;
      representationIds?: Iterable<number>;
      sampleIds?: Iterable<number>;
      filterInUse?: boolean;
    },
  ) {
    return this._elementsHelper.deleteData(modelId, data);
  }

  /**
   * Internal method to update the specified Fragments model. Do not use this method directly.
   * @param modelId - The ID of the model to update.
   */
  async _update(modelId: string) {
    await this._editHelper._update(modelId);
  }
}
