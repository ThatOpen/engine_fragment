import { FragmentsModel, FragmentsModels } from "../..";
import * as EDIT from "../../../Utils/edit";
import { isIndexRequest } from "../../../Utils/edit";
import { EditRequestType } from "../../../Utils/edit/edit-types";
import { EditUtils } from "../../../Utils/edit/edit-utils";
import { ModelUid, VirtualModelConfig } from "../model/model-types";

// Request types that change what is rendered (geometry, materials,
// transforms or whole elements). Requests outside this set (items without
// samples, relations, metadata, spatial structure, indices) don't affect
// the picture, so the delta model doesn't need to be rebuilt for them.
const RENDER_AFFECTING_REQUESTS = new Set<EditRequestType>([
  EditRequestType.CREATE_MATERIAL,
  EditRequestType.CREATE_REPRESENTATION,
  EditRequestType.CREATE_SAMPLE,
  EditRequestType.CREATE_GLOBAL_TRANSFORM,
  EditRequestType.CREATE_LOCAL_TRANSFORM,
  EditRequestType.UPDATE_MATERIAL,
  EditRequestType.UPDATE_REPRESENTATION,
  EditRequestType.UPDATE_SAMPLE,
  EditRequestType.UPDATE_GLOBAL_TRANSFORM,
  EditRequestType.UPDATE_LOCAL_TRANSFORM,
  EditRequestType.DELETE_MATERIAL,
  EditRequestType.DELETE_REPRESENTATION,
  EditRequestType.DELETE_SAMPLE,
  EditRequestType.DELETE_GLOBAL_TRANSFORM,
  EditRequestType.DELETE_LOCAL_TRANSFORM,
  EditRequestType.DELETE_ITEM,
]);

export class EditHelper {
  // The delta models of each model, by the model's uid. They are disposed
  // with it, see setDeltaModels().
  private readonly _deltaModels = new Map<ModelUid, FragmentsModel[]>();
  private readonly _fragments: FragmentsModels;
  private _lastDeltaId = 0;

  constructor(core: FragmentsModels) {
    this._fragments = core;
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

    // Data-only edits (property sets, relations, attributes, spatial
    // structure...) don't change the rendered picture. Rebuilding the delta
    // model for them causes a visible flash per edit round, so skip the
    // rebuild and keep the current delta visuals. An empty actions array is
    // the "recompute everything" call (undo/redo) and must always rebuild.
    const onlyDataEdits =
      actions.length > 0 &&
      actions.every((action) => !RENDER_AFFECTING_REQUESTS.has(action.type));

    // Apply new edits

    // We want to do this when users makes new actions
    // to make sure that the redo actions are not stored
    // We don't want to do this when users uses undo/redo
    if (config.removeRedo) {
      model._setRequests({ undoneRequests: [] });
    }

    const { deltaModelBuffer, ids } = await model._edit(actions);

    // Add local ids to actions.
    // The ids array only contains entries for requests that received new
    // local ids (those that didn't already have one). We must use a
    // separate counter so that pre-existing localIds (e.g. DELETE requests
    // prepended to a CREATE batch) don't shift the mapping.
    let idsIdx = 0;
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      // Indexes are name-keyed; the id solver doesn't allocate localIds
      // for them, so skip the back-fill here too.
      if (isIndexRequest(action)) continue;
      if (action.localId !== undefined) {
        continue;
      }
      action.localId = ids[idsIdx++];
    }

    if (onlyDataEdits) {
      // The virtual model already has the new requests applied; the current
      // delta visuals are still correct. The next render-affecting edit
      // rebuilds the delta from the full request history anyway.
      return ids;
    }

    // Load new delta models
    // For now we just generate one, maybe we want to generate multiple in the future?
    const deltaModel = await this.load(deltaModelBuffer as any, model);
    this.setDeltaModels(model, [deltaModel]);

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
    // Disposed meanwhile: there is nothing to replace.
    if (model._disposedSignal.aborted) {
      return null;
    }

    // Free up the modelId, but keep the model's THREE object, tiles and
    // materials in scene so the user does not see a blank frame while the
    // new model loads. The worker deletes the old model on its own. Its
    // delta models stay in the scene with it.
    const deltaModels = this._deltaModels.get(model._uid) ?? [];
    this._deltaModels.delete(model._uid);
    model.dispose({ keepInScene: true });

    try {
      // Load new model with the same id (it is free now).
      const newModel = await this._fragments.load(newModelBuffer as any, {
        modelId,
        raw: true,
        camera,
      });

      if (parent) {
        parent.add(newModel.object);
      }

      // If there were some undone actions, pass them to the new model
      await newModel._setRequests({ undoneRequests: requests.undoneRequests });
    } finally {
      // New model is in scene now, or it failed to load. Either way, tear
      // down the old visuals: nothing else can once the model is disposed.
      model.finalizeDispose();
      for (const deltaModel of deltaModels) {
        deltaModel.dispose();
      }
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
    this.setDeltaModels(model, []);
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

  async _update(model: FragmentsModel) {
    const models = this._deltaModels.get(model._uid);
    if (models) {
      const promises = [];
      for (const deltaModel of models) {
        promises.push(deltaModel._refreshView());
      }
      await Promise.all(promises);
    }
  }

  /**
   * Replaces the model's delta models and disposes the outgoing ones, which
   * takes them out of the scene right away. A model disposed meanwhile (its
   * deltas went with it) takes none: the given ones are disposed instead.
   */
  private setDeltaModels(model: FragmentsModel, deltaModels: FragmentsModel[]) {
    const uid = model._uid;
    if (model._disposedSignal.aborted) {
      for (const deltaModel of deltaModels) {
        deltaModel.dispose();
      }
      return;
    }
    if (!this._deltaModels.has(uid)) {
      model._disposedSignal.addEventListener(
        "abort",
        () => {
          for (const deltaModel of this._deltaModels.get(uid) ?? []) {
            deltaModel.dispose();
          }
          this._deltaModels.delete(uid);
        },
        { once: true },
      );
    }
    const outgoing = this._deltaModels.get(uid) ?? [];
    this._deltaModels.set(uid, deltaModels);
    model.deltaModelId = deltaModels[0]?.modelId ?? null;
    for (const deltaModel of outgoing) {
      if (!deltaModels.includes(deltaModel)) {
        deltaModel.dispose();
      }
    }
  }

  private async load(buffer: ArrayBuffer, parentModel: FragmentsModel) {
    const deltaId = EditUtils.DELTA_MODEL_ID;
    // Unique among this instance's models, so it can't replace another
    // delta model in the models list.
    const modelId = `${parentModel.modelId}${deltaId}${++this._lastDeltaId}`;

    const deltaModel = this._fragments._createModel(modelId);

    deltaModel._setDeltaModel(parentModel.modelId);

    // Skip model updates until we have the data set
    deltaModel.frozen = true;

    deltaModel.graphicsQuality = this._fragments.settings.graphicsQuality;

    const virtualModelConfig: VirtualModelConfig = {
      multithreading: {
        meshConnectionRate: this._fragments.settings.meshConnectionRate,
        meshConnectionThreshold: this._fragments.settings.meshConnectionThreshold,
        threadUpdaterDelay: this._fragments.settings.threadUpdaterDelay,
      },
    };

    try {
      this._fragments.models._add(deltaModel);
      await deltaModel._setup(buffer, true, virtualModelConfig);
      parentModel.object.add(deltaModel.object);
    } catch (e) {
      deltaModel.dispose();
      throw e;
    }

    const camera = parentModel.camera;

    if (camera) {
      deltaModel.useCamera(camera);
    }

    // Model has all the data, so it can start updating.
    // Don't use the frozen setter (which fires _refreshView without await).
    // Instead, unfreeze and explicitly await the view refresh + tile processing
    // so that new tiles are in the scene BEFORE we return (and the caller
    // disposes the old delta model).
    (deltaModel as any)._frozen = false;
    await deltaModel._refreshView();
    await this._fragments.models.forceUpdateFinish();

    return deltaModel;
  }
}
