import { FragmentsModel, FragmentsModels } from "../..";
import * as EDIT from "../../../Utils/edit";
import { FragmentsConnection } from "../multithreading/fragments-connection";
import { EditUtils } from "../../../Utils/edit/edit-utils";

export class EditHelper {
  private _deltaModels: { [modelId: string]: FragmentsModel[] | null } = {};
  private readonly _fragments: FragmentsModels;
  private readonly _connection: FragmentsConnection;

  constructor(core: FragmentsModels, connection: FragmentsConnection) {
    this._fragments = core;
    this._connection = connection;
  }

  async edit(
    modelId: string,
    actions: EDIT.EditRequest[],
    config = {
      removeRedo: true,
    },
  ) {
    const model = this._fragments.models.list.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Get old delta models
    const oldDeltaModels = this._deltaModels[modelId] || [];
    this._deltaModels[modelId] = null;

    // Apply new edits

    // We want to do this when users makes new actions
    // to make sure that the redo actions are not stored
    // We don't want to do this when users uses undo/redo
    if (config.removeRedo) {
      model._setRequests({ undoneRequests: [] });
    }

    const { deltaModelBuffer, ids } = await model._edit(actions);

    // Add local ids to actions
    // This is fragile because it depends tightly on the id solver logic
    // TODO: Maybe we can do this in a better way?
    for (let i = 0; i < actions.length; i++) {
      if (actions[i].localId !== undefined) {
        continue;
      }
      actions[i].localId = ids[i];
    }

    // Load new delta models
    // For now we just generate one, maybe we want to generate multiple in the future?
    const deltaModel = await this.load(deltaModelBuffer as any, model);
    this._deltaModels[modelId] = [deltaModel];
    model.deltaModelId = deltaModel.modelId;

    // Dispose old delta models
    const deletePromises = [];
    for (const oldDeltaModel of oldDeltaModels) {
      deletePromises.push(oldDeltaModel.dispose());
    }
    await Promise.all(deletePromises);

    //  Return the local ids of the requests as an array

    return ids;
  }

  async save(modelId: string) {
    const model = this._fragments.models.list.get(modelId);
    if (!model) {
      console.log(`Model ${modelId} not found`);
      return null;
    }

    const parent = model.object.parent;

    const requests = await model._getRequests();

    const camera = model.camera || undefined;
    const newModelBuffer = await model._save();

    // Dispose all model
    await model.dispose();

    // Add new model
    const newModel = await this._fragments.load(newModelBuffer as any, {
      modelId,
      raw: true,
      camera,
    });

    // If there were some undone actions, pass them to the new model
    await newModel._setRequests({ undoneRequests: requests.undoneRequests });

    if (parent) {
      parent.add(newModel.object);
    }

    // Return actions (e.g. to create action history, control z, etc.)
    return requests;
  }

  async reset(modelId: string) {
    const model = this._fragments.models.list.get(modelId);
    if (!model) {
      console.log(`Model ${modelId} not found`);
      return;
    }

    await model._reset();
    await this.disposeDeltaModels(modelId);
  }

  async getRequests(modelId: string) {
    const model = this._fragments.models.list.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }
    return model._getRequests();
  }

  async selectRequest(modelId: string, index: number) {
    const model = this._fragments.models.list.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }
    return model._selectRequest(index);
  }

  async _update(modelId: string) {
    const models = this._deltaModels[modelId];
    if (models) {
      const promises = [];
      for (const deltaModel of models) {
        promises.push(deltaModel._refreshView());
      }
      await Promise.all(promises);
    }
  }

  private async disposeDeltaModels(modelId: string) {
    const models = this._deltaModels[modelId];
    if (models) {
      for (const deltaModel of models) {
        await deltaModel.dispose();
      }
      this._deltaModels[modelId] = [];
    }
  }

  private async load(buffer: ArrayBuffer, parentModel: FragmentsModel) {
    const deltaId = EditUtils.DELTA_MODEL_ID;
    const modelId = `${parentModel.modelId}${deltaId}${performance.now()}`;

    const deltaModel = new FragmentsModel(
      modelId,
      this._fragments.models,
      this._connection,
      this._fragments.editor,
    );

    deltaModel._setDeltaModel(parentModel.modelId);

    // Skip model updates until we have the data set
    deltaModel.frozen = true;

    deltaModel.graphicsQuality = this._fragments.settings.graphicsQuality;

    try {
      this._fragments.models.list.set(deltaModel.modelId, deltaModel);
      await deltaModel._setup(buffer, true);
      parentModel.object.add(deltaModel.object);
    } catch (e) {
      this._fragments.models.list.delete(deltaModel.modelId);
      throw e;
    }

    const camera = parentModel.camera;

    if (camera) {
      deltaModel.useCamera(camera);
    }

    // Model has all the data, so it can start updating
    deltaModel.frozen = false;

    return deltaModel;
  }
}
