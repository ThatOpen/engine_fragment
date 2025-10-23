import * as FB from "flatbuffers";
import pako from "pako";
import * as TFB from "../../Schema";
import * as ET from "./edit-types";
import { copyTransform, createTransform } from "./transfom-functions";
import { copyShell, createShell } from "./shell-functions";
import {
  copyCircleExtrusion,
  createCircleExtrusion,
} from "./circle-extrusion-functions";
import {
  copySpatialStructure,
  createSpatialStructure,
} from "./spatial-structure-functions";
import { buildSample } from "./sample-functions";
import { getIdsDelta } from "./id-delta-getter";
import { newModel } from "./new-model-function";
import { EditUtils } from "./edit-utils";
import { SpatialTreeItem } from "../../FragmentsModels";
// import { getObject } from "../flatbuffers-json-converter";

function getAffectedItems(
  requests: ET.EditRequest[],
  editedSamples: Set<number>,
  meshes: TFB.Meshes,
  model: TFB.Model,
  affectedItems: Set<number>,
) {
  for (const request of requests) {
    if (
      request.type === ET.EditRequestType.UPDATE_SAMPLE ||
      request.type === ET.EditRequestType.DELETE_SAMPLE
    ) {
      editedSamples.add(request.localId as number);
    }
  }

  for (let i = 0; i < meshes.sampleIdsLength(); i++) {
    const sampleId = meshes.sampleIds(i) as number;
    if (editedSamples.has(sampleId)) {
      const sample = meshes.samples(i) as TFB.Sample;
      const itemIndex = sample.item();
      const ltIndex = meshes.meshesItems(itemIndex) as number;
      const localId = model.localIds(ltIndex) as number;
      affectedItems.add(localId);
    }
  }
}

export function edit(
  model: TFB.Model,
  requests: ET.EditRequest[],
  config?: { raw?: boolean; delta?: boolean },
) {
  // Strategy: we will copy all the data from the given model to create a new one
  // while applying all the edits defined in the requests

  // Note that structs arrays need to be created in reverse order

  const meshes = model.meshes() as TFB.Meshes;

  const raw = config?.raw ?? false;

  // Now, if it's delta mode, we gather the items that will be affected by the edits to just return them
  const delta = config?.delta ?? false;

  let deltaItemIds = new Set<number>();
  let deltaGts = new Set<number>();
  let deltaLts = new Set<number>();
  let deltaSamples = new Set<number>();
  let deltaMaterials = new Set<number>();
  let deltaReps = new Set<number>();
  let deltaShells = new Set<number>();
  let deltaCircleExtrusions = new Set<number>();
  let deltaDeletedGts = 0;
  let deltaDeletedLts = 0;
  let deltaDeletedSamples = 0;
  let deltaDeletedMaterials = 0;
  let deltaDeletedRepresentations = 0;
  let deltaDeletedShells = 0;
  let deltaDeletedCircleExtrusions = 0;

  if (delta) {
    const itemsToInclude = getIdsDelta(model, requests);
    deltaItemIds = itemsToInclude.itemIds;
    deltaGts = itemsToInclude.globalTranforms;
    deltaLts = itemsToInclude.localTransforms;
    deltaSamples = itemsToInclude.samples;
    deltaMaterials = itemsToInclude.materials;
    deltaReps = itemsToInclude.representations;
    deltaShells = itemsToInclude.shells;
    deltaCircleExtrusions = itemsToInclude.circleExtrusions;
    deltaDeletedGts = itemsToInclude.detaDeletedGts;
    deltaDeletedLts = itemsToInclude.detaDeletedLts;
    deltaDeletedSamples = itemsToInclude.detaDeletedSamples;
    deltaDeletedMaterials = itemsToInclude.detaDeletedMaterials;
    deltaDeletedRepresentations = itemsToInclude.detaDeletedRepresentations;
    deltaDeletedShells = itemsToInclude.detaDeletedShells;
    deltaDeletedCircleExtrusions = itemsToInclude.detaDeletedCircleExtrusions;
    const createNewSample = itemsToInclude.createNewSample;
    if (
      !createNewSample &&
      deltaItemIds.size === 0 &&
      deltaGts.size === 0 &&
      deltaLts.size === 0 &&
      deltaSamples.size === 0 &&
      deltaMaterials.size === 0 &&
      deltaReps.size === 0 &&
      deltaShells.size === 0 &&
      deltaCircleExtrusions.size === 0
    ) {
      // Emtpy delta model, but we need to return affected items
      // e.g. if the user deleted some items

      const affectedItems = new Set<number>();
      const editedSamples = new Set<number>();
      getAffectedItems(requests, editedSamples, meshes, model, affectedItems);

      return { model: newModel({ raw }), items: Array.from(affectedItems) };
    }
  }

  // Now, let's gather the data of all the edits we have to make

  const matsToUpdate = new Map<number, ET.RawMaterial>();
  const reprsToUpdate = new Map<number, ET.RawRepresentation>();
  const samplesToUpdate = new Map<number, ET.RawSample>();
  const gtsToUpdate = new Map<number, ET.RawGlobalTransformData>();
  const ltsToUpdate = new Map<number, ET.RawTransformData>();
  const shellsToUpdate = new Map<number, number>(); // Contains shells indices - representation id
  const circleExtrusionsToUpdate = new Map<number, number>(); // Contains circle extrusions indices - representation id
  const itemsToUpdate = new Map<number, ET.RawItemData>();
  const relationsToUpdate = new Map<number, ET.RawRelationData>();

  let metadataToUpdate: null | ET.RawMetadataData = null;
  let spatialStructureToUpdate: null | SpatialTreeItem = null;

  const matsToCreate = new Map<number, ET.RawMaterial>();
  const reprsToCreate = new Map<number, ET.RawRepresentation>();
  const shellsToCreate = new Map<number, ET.RawShell>();
  const circleExtrusionsToCreate = new Map<number, ET.RawCircleExtrusion>();
  const samplesToCreate = new Map<number, ET.RawSample>();
  const gtsToCreate = new Map<number, ET.RawGlobalTransformData>();
  const ltsToCreate = new Map<number, ET.RawTransformData>();
  const itemsToCreate = new Map<number, ET.RawItemData>();
  const relationsToCreate = new Map<number, ET.RawRelationData>();

  const matsToDelete = new Set<number>();
  const samplesToDelete = new Set<number>();
  const reprsToDelete = new Set<number>();
  const shellsToDelete = new Set<number>(); // Contains shells indices
  const circleExtrusionsToDelete = new Set<number>(); // Contains circle extrusions indices
  const gtsToDelete = new Set<number>();
  const ltsToDelete = new Set<number>();
  const itemsToDelete = new Set<number>();
  const relationsToDelete = new Set<number>();

  const prevMatIds = new Set<number>(meshes.materialIdsArray());
  const prevReprIds = new Set<number>(meshes.representationIdsArray());
  const prevSampleIds = new Set<number>(meshes.sampleIdsArray());
  const prevGtIds = new Set<number>(meshes.globalTransformIdsArray());
  const prevLtIds = new Set<number>(meshes.localTransformIdsArray());
  const prevItemIds = new Set<number>(model.localIdsArray());

  let newMaxLocalId = model.maxLocalId();

  for (const request of requests) {
    // UPDATE
    if (request.type === ET.EditRequestType.UPDATE_MATERIAL) {
      matsToUpdate.set(request.localId as number, request.data);
      continue;
    }
    if (request.type === ET.EditRequestType.UPDATE_REPRESENTATION) {
      reprsToUpdate.set(request.localId as number, request.data);
      continue;
    }
    if (request.type === ET.EditRequestType.UPDATE_SAMPLE) {
      // We solved the temp ids before, so we can cast the data to the correct type
      samplesToUpdate.set(
        request.localId as number,
        request.data as ET.RawSample,
      );
      continue;
    }
    if (request.type === ET.EditRequestType.UPDATE_GLOBAL_TRANSFORM) {
      gtsToUpdate.set(request.localId as number, request.data);
      continue;
    }
    if (request.type === ET.EditRequestType.UPDATE_LOCAL_TRANSFORM) {
      ltsToUpdate.set(request.localId as number, request.data);
      continue;
    }
    if (request.type === ET.EditRequestType.UPDATE_ITEM) {
      itemsToUpdate.set(request.localId as number, request.data);
      continue;
    }
    if (request.type === ET.EditRequestType.UPDATE_RELATION) {
      relationsToUpdate.set(request.localId as number, request.data);
      continue;
    }
    if (request.type === ET.EditRequestType.UPDATE_METADATA) {
      metadataToUpdate = request.data;
      continue;
    }
    if (request.type === ET.EditRequestType.UPDATE_SPATIAL_STRUCTURE) {
      spatialStructureToUpdate = request.data;
      continue;
    }
    // CREATE
    if (request.type === ET.EditRequestType.CREATE_MATERIAL) {
      const localId = request.localId!;
      if (prevMatIds.has(localId as number)) {
        continue;
      }
      matsToCreate.set(localId as number, request.data);
      continue;
    }
    if (request.type === ET.EditRequestType.CREATE_REPRESENTATION) {
      const localId = request.localId!;
      if (prevReprIds.has(localId as number)) {
        continue;
      }
      reprsToCreate.set(localId as number, request.data);
      if (request.data.representationClass === TFB.RepresentationClass.SHELL) {
        shellsToCreate.set(
          localId as number,
          request.data.geometry as ET.RawShell,
        );
      } else if (
        request.data.representationClass ===
        TFB.RepresentationClass.CIRCLE_EXTRUSION
      ) {
        circleExtrusionsToCreate.set(
          localId as number,
          request.data.geometry as ET.RawCircleExtrusion,
        );
      }
      continue;
    }
    if (request.type === ET.EditRequestType.CREATE_SAMPLE) {
      const localId = request.localId!;
      if (prevSampleIds.has(localId as number)) {
        continue;
      }
      samplesToCreate.set(localId as number, request.data as ET.RawSample);
      continue;
    }
    if (request.type === ET.EditRequestType.CREATE_GLOBAL_TRANSFORM) {
      const localId = request.localId!;
      if (prevGtIds.has(localId as number)) {
        continue;
      }
      gtsToCreate.set(localId as number, request.data);
      continue;
    }
    if (request.type === ET.EditRequestType.CREATE_LOCAL_TRANSFORM) {
      const localId = request.localId!;
      if (prevLtIds.has(localId as number)) {
        continue;
      }
      ltsToCreate.set(localId as number, request.data);
      continue;
    }
    if (request.type === ET.EditRequestType.CREATE_ITEM) {
      const localId = request.localId!;
      if (prevItemIds.has(localId as number)) {
        continue;
      }
      itemsToCreate.set(localId as number, request.data);
    }
    if (request.type === ET.EditRequestType.CREATE_RELATION) {
      const localId = request.localId!;
      relationsToCreate.set(localId as number, request.data);
    }
    // DELETE
    if (request.type === ET.EditRequestType.DELETE_MATERIAL) {
      matsToDelete.add(request.localId as number);
      continue;
    }
    if (request.type === ET.EditRequestType.DELETE_REPRESENTATION) {
      reprsToDelete.add(request.localId as number);
      continue;
    }
    if (request.type === ET.EditRequestType.DELETE_SAMPLE) {
      samplesToDelete.add(request.localId as number);
      continue;
    }
    if (request.type === ET.EditRequestType.DELETE_GLOBAL_TRANSFORM) {
      gtsToDelete.add(request.localId as number);
      continue;
    }
    if (request.type === ET.EditRequestType.DELETE_LOCAL_TRANSFORM) {
      ltsToDelete.add(request.localId as number);
      continue;
    }
    if (request.type === ET.EditRequestType.DELETE_ITEM) {
      itemsToDelete.add(request.localId as number);
      continue;
    }
    if (request.type === ET.EditRequestType.UPDATE_MAX_LOCAL_ID) {
      newMaxLocalId = request.localId as number;
      continue;
    }
    if (request.type === ET.EditRequestType.DELETE_RELATION) {
      relationsToDelete.add(request.localId as number);
      continue;
    }
  }

  for (let i = 0; i < meshes.representationsLength(); i++) {
    const repr = meshes.representations(i) as TFB.Representation;
    const geometryIndex = repr.id();
    const reprId = meshes.representationIds(i) as number;

    if (delta && !deltaReps.has(reprId)) {
      continue;
    }

    if (reprsToDelete.has(reprId)) {
      if (repr.representationClass() === TFB.RepresentationClass.SHELL) {
        shellsToDelete.add(geometryIndex);
      } else if (
        repr.representationClass() === TFB.RepresentationClass.CIRCLE_EXTRUSION
      ) {
        circleExtrusionsToDelete.add(geometryIndex);
      } else {
        throw new Error("Representation class is not supported");
      }
      continue;
    }
    if (!reprsToUpdate.has(reprId)) {
      continue;
    }
    const reprClass = repr.representationClass();
    if (reprClass === TFB.RepresentationClass.SHELL) {
      shellsToUpdate.set(geometryIndex, reprId);
    } else if (reprClass === TFB.RepresentationClass.CIRCLE_EXTRUSION) {
      circleExtrusionsToUpdate.set(geometryIndex, reprId);
    } else {
      throw new Error("Representation class is not supported");
    }
  }

  // Let's clean up what we don't need anymore

  prevMatIds.clear();
  prevReprIds.clear();
  prevSampleIds.clear();
  prevGtIds.clear();
  prevLtIds.clear();
  prevItemIds.clear();

  // Let's see what numbers do we have

  const prevMatCount = meshes.materialsLength();
  const includedMatCount = delta ? deltaMaterials.size : prevMatCount;
  const deletedMatCount = delta ? deltaDeletedMaterials : matsToDelete.size;
  const newMatCount = includedMatCount + matsToCreate.size - deletedMatCount;

  const prevReprCount = meshes.representationsLength();
  const includedReprCount = delta ? deltaReps.size : prevReprCount;
  const deletedReprCount = delta
    ? deltaDeletedRepresentations
    : reprsToDelete.size;
  const newReprCount =
    includedReprCount + reprsToCreate.size - deletedReprCount;

  const prevShellCount = meshes.shellsLength();
  const includedShellCount = delta ? deltaShells.size : prevShellCount;
  const deletedShellCount = delta ? deltaDeletedShells : shellsToDelete.size;
  const newShellCount =
    includedShellCount + shellsToCreate.size - deletedShellCount;

  const prevCircleExtrusionCount = meshes.circleExtrusionsLength();
  const includedCircleExtrusionCount = delta
    ? deltaCircleExtrusions.size
    : prevCircleExtrusionCount;
  const deletedCircleExtrusionCount = delta
    ? deltaDeletedCircleExtrusions
    : circleExtrusionsToDelete.size;
  const newCircleExtrusionCount =
    includedCircleExtrusionCount +
    circleExtrusionsToCreate.size -
    deletedCircleExtrusionCount;

  const prevSampleCount = meshes.samplesLength();
  const includedSampleCount = delta ? deltaSamples.size : prevSampleCount;
  const deletedSampleCount = delta ? deltaDeletedSamples : samplesToDelete.size;
  const newSampleCount =
    includedSampleCount + samplesToCreate.size - deletedSampleCount;

  const prevGtCount = meshes.globalTransformsLength();
  const includedGtCount = delta ? deltaGts.size : prevGtCount;
  const deletedGtCount = delta ? deltaDeletedGts : gtsToDelete.size;
  const newGtCount = includedGtCount + gtsToCreate.size - deletedGtCount;

  const prevLtCount = meshes.localTransformsLength();
  const includedLtCount = delta ? deltaLts.size : prevLtCount;
  const deletedLtCount = delta ? deltaDeletedLts : ltsToDelete.size;
  const newLtCount = includedLtCount + ltsToCreate.size - deletedLtCount;

  if (
    newGtCount < 0 ||
    newReprCount < 0 ||
    newSampleCount < 0 ||
    newLtCount < 0 ||
    newMatCount < 0 ||
    newShellCount < 0 ||
    newCircleExtrusionCount < 0
  ) {
    throw new Error("Invalid number of elements");
  }

  // Next we will make a map from local id to index
  // We need to convert them to indices when copying the samples
  // Incoming sample objects use local ids

  // We will also store the new local ids to add them to the new model

  const localIdToIndex = new Map<number, number>();
  const finalMaterialIds: number[] = [];
  const finalReprIds: number[] = [];
  const finalSampleIds: number[] = [];
  const finalGtIds: number[] = [];
  const finalMeshesItems: number[] = [];
  const finalLtIds: number[] = [];
  const finalItemIds: number[] = [];

  // Updated global transforms

  let gtCounter = 0;
  for (let i = 0; i < meshes.globalTransformsLength(); i++) {
    const localId = meshes.globalTransformIds(i) as number;
    if (gtsToDelete.has(localId)) {
      continue;
    }
    if (delta && !deltaGts.has(localId)) {
      continue;
    }
    if (localIdToIndex.has(localId)) {
      throw new Error("Local id already exists");
    }
    localIdToIndex.set(localId, gtCounter++);
    finalGtIds.push(localId);
  }

  // Created global transforms

  for (const [localId] of gtsToCreate) {
    if (gtsToDelete.has(localId)) {
      continue;
    }
    if (localIdToIndex.has(localId)) {
      throw new Error("Local id already exists");
    }
    localIdToIndex.set(localId, gtCounter++);
    finalGtIds.push(localId);
  }

  // Updated materials

  let matCounter = 0;
  for (let i = 0; i < meshes.materialIdsLength(); i++) {
    const localId = meshes.materialIds(i) as number;
    if (matsToDelete.has(localId)) {
      continue;
    }
    if (delta && !deltaMaterials.has(localId)) {
      continue;
    }
    if (localIdToIndex.has(localId)) {
      throw new Error("Local id already exists");
    }
    localIdToIndex.set(localId, matCounter++);
    finalMaterialIds.push(localId);
  }

  // Created materials

  for (const [localId] of matsToCreate) {
    if (matsToDelete.has(localId)) {
      continue;
    }
    if (localIdToIndex.has(localId)) {
      throw new Error("Local id already exists");
    }
    localIdToIndex.set(localId, matCounter++);
    finalMaterialIds.push(localId);
  }

  // Updated local transforms

  let ltCounter = 0;
  for (let i = 0; i < meshes.localTransformIdsLength(); i++) {
    const localId = meshes.localTransformIds(i) as number;
    if (ltsToDelete.has(localId)) {
      continue;
    }
    if (delta && !deltaLts.has(localId)) {
      continue;
    }
    if (localIdToIndex.has(localId)) {
      throw new Error("Local id already exists");
    }
    localIdToIndex.set(localId, ltCounter++);
    finalLtIds.push(localId);
  }

  // Created local transforms

  for (const [localId] of ltsToCreate) {
    if (ltsToDelete.has(localId)) {
      continue;
    }
    if (localIdToIndex.has(localId)) {
      throw new Error("Local id already exists");
    }
    localIdToIndex.set(localId, ltCounter++);
    finalLtIds.push(localId);
  }

  // Updated representations

  let reprCounter = 0;
  for (let i = 0; i < meshes.representationIdsLength(); i++) {
    const localId = meshes.representationIds(i) as number;
    if (reprsToDelete.has(localId)) {
      continue;
    }
    if (delta && !deltaReps.has(localId)) {
      continue;
    }
    if (localIdToIndex.has(localId)) {
      throw new Error("Local id already exists");
    }
    localIdToIndex.set(localId, reprCounter++);
    finalReprIds.push(localId);
  }

  // Created representations

  for (const [localId] of reprsToCreate) {
    if (reprsToDelete.has(localId)) {
      continue;
    }
    if (localIdToIndex.has(localId)) {
      throw new Error("Local id already exists");
    }
    localIdToIndex.set(localId, reprCounter++);
    finalReprIds.push(localId);
  }

  // Updated samples (we don't need to store the index because it's not used)

  for (let i = 0; i < meshes.sampleIdsLength(); i++) {
    const localId = meshes.sampleIds(i) as number;
    if (samplesToDelete.has(localId)) {
      continue;
    }
    if (delta && !deltaSamples.has(localId)) {
      continue;
    }
    finalSampleIds.push(localId);
  }

  // Created samples  (we don't need to store the index because it's not used`)

  for (const [localId] of samplesToCreate) {
    if (samplesToDelete.has(localId)) {
      continue;
    }
    finalSampleIds.push(localId);
  }

  // Updated items

  let itemsCounter = 0;
  for (let i = 0; i < model.localIdsLength(); i++) {
    const localId = model.localIds(i) as number;
    if (itemsToDelete.has(localId)) {
      continue;
    }
    if (delta && !deltaItemIds.has(localId)) {
      continue;
    }
    localIdToIndex.set(localId, itemsCounter++);
    finalItemIds.push(localId);
  }

  // Created items
  for (const [localId] of itemsToCreate) {
    if (itemsToDelete.has(localId)) {
      continue;
    }
    localIdToIndex.set(localId, itemsCounter++);
    finalItemIds.push(localId);
  }

  // Now, let's start creating the model

  const builder = new FB.Builder(1024);

  // Meshes.globalTransforms

  TFB.Meshes.startGlobalTransformsVector(builder, newGtCount);

  // Create new global transforms

  const newGtIdSet = Array.from(gtsToCreate.keys());
  for (let i = 0; i < newGtIdSet.length; i++) {
    const j = newGtIdSet.length - 1 - i;
    const localId = newGtIdSet[j];

    const needsUpdate = gtsToUpdate.has(localId);
    const gt = needsUpdate
      ? gtsToUpdate.get(localId)
      : gtsToCreate.get(localId);

    if (!gt) {
      throw new Error(`Global transform not found: ${localId}`);
    }

    if (gtsToDelete.has(localId)) {
      continue;
    }

    const itemId = gt.itemId as number;
    if (!localIdToIndex.has(itemId)) {
      throw new Error("Item id not found for global transform");
    }
    const itemIndex = localIdToIndex.get(itemId) as number;
    finalMeshesItems.unshift(itemIndex);

    createTransform(gt, builder);
  }
  newGtIdSet.length = 0;

  // Update or copy existing global transforms

  for (let i = 0; i < prevGtCount; i++) {
    const j = prevGtCount - 1 - i;
    const current = meshes.globalTransforms(j) as TFB.Transform;
    const localId = meshes.globalTransformIds(j) as number;

    if (gtsToDelete.has(localId)) {
      continue;
    }

    if (delta && !deltaGts.has(localId)) {
      continue;
    }

    const needsUpdate = gtsToUpdate.has(localId);

    if (needsUpdate) {
      const updated = gtsToUpdate.get(localId) as ET.RawGlobalTransformData;

      const itemId = updated.itemId as number;
      if (!localIdToIndex.has(itemId)) {
        throw new Error(`Item id not found for global transform: ${localId}`);
      }
      const newItemIndex = localIdToIndex.get(itemId) as number;
      finalMeshesItems.unshift(newItemIndex);

      createTransform(updated, builder);
    } else {
      const prevItemIndex = meshes.meshesItems(j) as number;
      const itemId = model.localIds(prevItemIndex) as number;
      if (!localIdToIndex.has(itemId)) {
        throw new Error(`Item id not found for global transform: ${localId}`);
      }
      const newItemIndex = localIdToIndex.get(itemId) as number;
      finalMeshesItems.unshift(newItemIndex);

      copyTransform(builder, current);
    }
  }

  const globalTransformsRef = builder.endVector();

  // Meshes.shells

  const shellsOffsets: number[] = [];

  // Update or copy existing shells

  for (let i = 0; i < prevShellCount; i++) {
    if (shellsToDelete.has(i)) {
      continue;
    }
    if (delta && !deltaShells.has(i)) {
      continue;
    }
    if (shellsToUpdate.has(i)) {
      const reprId = shellsToUpdate.get(i) as number;
      const repr = reprsToUpdate.get(reprId) as ET.RawRepresentation;
      const shell = repr.geometry as ET.RawShell;
      const shellOffset = createShell(builder, shell);
      shellsOffsets.push(shellOffset);
      continue;
    }
    const shell = meshes.shells(i) as TFB.Shell;
    const shellOffset = copyShell(builder, shell);
    shellsOffsets.push(shellOffset);
  }

  // Create new shells

  for (const [id] of shellsToCreate) {
    // Here we don't have a shell index because it doesn't exist, but the repr local id
    if (reprsToDelete.has(id)) {
      continue;
    }

    const needsUpdate = shellsToUpdate.has(id);
    let shellOffset = 0;
    if (needsUpdate) {
      const reprId = shellsToUpdate.get(id) as number;
      const repr = reprsToUpdate.get(reprId) as ET.RawRepresentation;
      const shell = repr.geometry as ET.RawShell;
      shellOffset = createShell(builder, shell);
    } else {
      const shell = shellsToCreate.get(id) as ET.RawShell;
      shellOffset = createShell(builder, shell);
    }
    shellsOffsets.push(shellOffset);
  }

  const shells = TFB.Meshes.createShellsVector(builder, shellsOffsets);

  // Meshes.circleExtrusions

  const circleExtrusionsOffsets: number[] = [];

  // Update or copy existing circle extrusions

  for (let i = 0; i < prevCircleExtrusionCount; i++) {
    if (circleExtrusionsToDelete.has(i)) {
      continue;
    }
    if (delta && !deltaCircleExtrusions.has(i)) {
      continue;
    }
    if (circleExtrusionsToUpdate.has(i)) {
      const reprId = circleExtrusionsToUpdate.get(i) as number;
      const repr = reprsToUpdate.get(reprId) as ET.RawRepresentation;
      const circleExtrusion = repr.geometry as ET.RawCircleExtrusion;
      const circleExtrusionOffset = createCircleExtrusion(
        builder,
        circleExtrusion,
      );
      circleExtrusionsOffsets.push(circleExtrusionOffset);
      continue;
    }
    const circleExtrusion = meshes.circleExtrusions(i) as TFB.CircleExtrusion;
    const circleExtrusionOffset = copyCircleExtrusion(builder, circleExtrusion);
    circleExtrusionsOffsets.push(circleExtrusionOffset);
  }

  // Create new circle extrusions

  for (const [id] of circleExtrusionsToCreate) {
    // Here we don't have a circle extrusion index because it doesn't exist, but the repr local id
    if (circleExtrusionsToDelete.has(id)) {
      continue;
    }

    const needsUpdate = circleExtrusionsToUpdate.has(id);
    let circleExtrusionOffset = 0;
    if (needsUpdate) {
      const reprId = circleExtrusionsToUpdate.get(id) as number;
      const repr = reprsToUpdate.get(reprId) as ET.RawRepresentation;
      const circleExtrusion = repr.geometry as ET.RawCircleExtrusion;
      circleExtrusionOffset = createCircleExtrusion(builder, circleExtrusion);
    } else {
      const circleExtrusion = circleExtrusionsToCreate.get(
        id,
      ) as ET.RawCircleExtrusion;
      circleExtrusionOffset = createCircleExtrusion(builder, circleExtrusion);
    }
    circleExtrusionsOffsets.push(circleExtrusionOffset);
  }

  const circleExtrusions = TFB.Meshes.createCircleExtrusionsVector(
    builder,
    circleExtrusionsOffsets,
  );

  // Meshes.representations

  TFB.Meshes.startRepresentationsVector(builder, newReprCount);

  // Create new representations

  const createdReprsIdSet = Array.from(reprsToCreate.keys());
  let newShellCounter = newShellCount - 1;
  let newCircleExtrusionCounter = newCircleExtrusionCount - 1;

  for (let i = 0; i < createdReprsIdSet.length; i++) {
    const j = createdReprsIdSet.length - 1 - i;
    const localId = createdReprsIdSet[j];

    if (reprsToDelete.has(localId)) {
      continue;
    }

    const needsUpdate = reprsToUpdate.has(localId);
    const repr = needsUpdate
      ? reprsToUpdate.get(localId)
      : reprsToCreate.get(localId);

    if (!repr) {
      throw new Error(`Representation not found: ${localId}`);
    }

    const bbox = repr.bbox;
    const rClass = repr.representationClass;
    let id = 0;
    if (repr.representationClass === TFB.RepresentationClass.SHELL) {
      id = newShellCounter--;
    } else if (
      repr.representationClass === TFB.RepresentationClass.CIRCLE_EXTRUSION
    ) {
      id = newCircleExtrusionCounter--;
    } else {
      throw new Error("Representation class is not supported");
    }
    // prettier-ignore
    TFB.Representation.createRepresentation(
        builder, id,
        bbox[0],bbox[1],bbox[2],
        bbox[3],bbox[4],bbox[5],
        rClass,
      );
  }
  createdReprsIdSet.length = 0;

  // Update or copy existing representations

  for (let i = 0; i < prevReprCount; i++) {
    const j = prevReprCount - 1 - i;
    const current = meshes.representations(j) as TFB.Representation;
    const currentId = meshes.representationIds(j) as number;

    if (reprsToDelete.has(currentId)) {
      continue;
    }

    if (delta && !deltaReps.has(currentId)) {
      continue;
    }

    const needsUpdate = reprsToUpdate.has(currentId);
    if (needsUpdate) {
      const updated = reprsToUpdate.get(currentId) as ET.RawRepresentation;
      const bbox = updated.bbox;

      let id = 0;
      if (updated.representationClass === TFB.RepresentationClass.SHELL) {
        id = newShellCounter--;
      } else if (
        updated.representationClass === TFB.RepresentationClass.CIRCLE_EXTRUSION
      ) {
        id = newCircleExtrusionCounter--;
      } else {
        throw new Error("Representation class is not supported");
      }

      const rClass = updated.representationClass;
      // prettier-ignore
      TFB.Representation.createRepresentation(
        builder, id,
        bbox[0],bbox[1],bbox[2],
        bbox[3],bbox[4],bbox[5],
        rClass,
      );
    } else {
      const bbox = current.bbox() as TFB.BoundingBox;

      let id = 0;
      if (current.representationClass() === TFB.RepresentationClass.SHELL) {
        id = newShellCounter--;
      } else if (
        current.representationClass() ===
        TFB.RepresentationClass.CIRCLE_EXTRUSION
      ) {
        id = newCircleExtrusionCounter--;
      } else {
        throw new Error("Representation class is not supported");
      }

      const rClass = current.representationClass();
      const min = bbox.min() as TFB.FloatVector;
      const max = bbox.max() as TFB.FloatVector;
      // prettier-ignore
      TFB.Representation.createRepresentation(
        builder, id,
        min.x(),min.y(),min.z(),
        max.x(),max.y(),max.z(),
        rClass,
      );
    }
  }

  const representationsRef = builder.endVector();

  // Meshes.samples

  TFB.Meshes.startSamplesVector(builder, newSampleCount);

  // Create new samples

  const newSamplesIdSet = Array.from(samplesToCreate.keys());
  for (let i = 0; i < newSamplesIdSet.length; i++) {
    const j = newSamplesIdSet.length - 1 - i;
    const localId = newSamplesIdSet[j];
    if (samplesToDelete.has(localId)) {
      continue;
    }

    const needsUpdate = samplesToUpdate.has(localId);
    const sample = needsUpdate
      ? samplesToUpdate.get(localId)
      : samplesToCreate.get(localId);
    if (!sample) {
      throw new Error(`Sample not found: ${localId}`);
    }

    // We will get the local id of all elements the sample reference and assign them its new index

    if (matsToDelete.has(sample.material)) {
      throw new Error(`Material to delete found in sample ${localId}`);
    }

    if (reprsToDelete.has(sample.representation)) {
      throw new Error(`Representation to delete found in sample ${localId}`);
    }

    const gtId = sample.item;
    const matId = sample.material;
    const reprId = sample.representation;
    const ltId = sample.localTransform;
    buildSample(builder, localIdToIndex, gtId, matId, reprId, ltId);
  }
  newSamplesIdSet.length = 0;

  // Update or copy existing samples

  for (let i = 0; i < prevSampleCount; i++) {
    const j = prevSampleCount - 1 - i;
    const current = meshes.samples(j) as TFB.Sample;
    const currentId = meshes.sampleIds(j) as number;

    if (samplesToDelete.has(currentId)) {
      continue;
    }

    if (delta && !deltaSamples.has(currentId)) {
      continue;
    }

    // We will get the local id of all elements the sample reference and assign them its new index
    const needsUpdate = samplesToUpdate.has(currentId);
    if (needsUpdate) {
      const updated = samplesToUpdate.get(currentId) as ET.RawSample;
      const gtId = updated.item;
      const matId = updated.material;
      const reprId = updated.representation;
      const ltId = updated.localTransform;
      buildSample(builder, localIdToIndex, gtId, matId, reprId, ltId);
      continue;
    }

    const gtId = meshes.globalTransformIds(current.item()) as number;
    const matId = meshes.materialIds(current.material()) as number;
    const reprId = meshes.representationIds(current.representation()) as number;
    const ltId = meshes.localTransformIds(current.localTransform()) as number;

    if (matsToDelete.has(matId)) {
      throw new Error(`Material to delete found in sample ${currentId}`);
    }

    buildSample(builder, localIdToIndex, gtId, matId, reprId, ltId);
  }

  const samplesOffset = builder.endVector();

  // Meshes.localTransforms

  TFB.Meshes.startLocalTransformsVector(builder, newLtCount);

  // Create new local transforms

  const newLtIdSet = Array.from(ltsToCreate.keys());
  for (let i = 0; i < newLtIdSet.length; i++) {
    const j = newLtIdSet.length - 1 - i;
    const localId = newLtIdSet[j];

    if (ltsToDelete.has(localId)) {
      continue;
    }

    const needsUpdate = ltsToUpdate.has(localId);
    const lt = needsUpdate
      ? ltsToUpdate.get(localId)
      : ltsToCreate.get(localId);

    if (!lt) {
      throw new Error(`Local transform not found: ${localId}`);
    }

    createTransform(lt, builder);
  }
  newLtIdSet.length = 0;

  // Update or copy existing local transforms

  for (let i = 0; i < prevLtCount; i++) {
    const j = prevLtCount - 1 - i;
    const current = meshes.localTransforms(j) as TFB.Transform;
    const currentId = meshes.localTransformIds(j) as number;
    const needsUpdate = ltsToUpdate.has(currentId);

    if (ltsToDelete.has(currentId)) {
      continue;
    }

    if (delta && !deltaLts.has(currentId)) {
      continue;
    }

    if (needsUpdate) {
      const updated = ltsToUpdate.get(currentId) as ET.RawTransformData;
      createTransform(updated, builder);
    } else {
      copyTransform(builder, current);
    }
  }

  const localTransformRef = builder.endVector();

  // Meshes.materials

  TFB.Meshes.startMaterialsVector(builder, newMatCount);

  // Create new materials

  const newMatsIdSet = Array.from(matsToCreate.keys());
  for (let i = 0; i < newMatsIdSet.length; i++) {
    const j = newMatsIdSet.length - 1 - i;
    const currentId = newMatsIdSet[j];
    if (matsToDelete.has(currentId)) {
      continue;
    }

    const needsUpdate = matsToUpdate.has(currentId);
    const material = needsUpdate
      ? matsToUpdate.get(currentId)
      : matsToCreate.get(currentId);

    if (!material) {
      throw new Error(`Material not found: ${currentId}`);
    }

    const r = material.r;
    const g = material.g;
    const b = material.b;
    const a = material.a;
    const stroke = material.stroke;
    const renderedFaces = material.renderedFaces;
    TFB.Material.createMaterial(builder, r, g, b, a, renderedFaces, stroke);
  }
  newMatsIdSet.length = 0;

  // Update or copy existing materials

  for (let i = 0; i < prevMatCount; i++) {
    const j = prevMatCount - 1 - i;
    const current = meshes.materials(j) as TFB.Material;
    const currentId = meshes.materialIds(j) as number;
    if (matsToDelete.has(currentId)) {
      continue;
    }

    if (delta && !deltaMaterials.has(currentId)) {
      continue;
    }

    const needsUpdate = matsToUpdate.has(currentId);
    const updated = matsToUpdate.get(currentId) as ET.RawMaterial;

    const r = needsUpdate ? updated.r : current.r();
    const g = needsUpdate ? updated.g : current.g();
    const b = needsUpdate ? updated.b : current.b();
    const a = needsUpdate ? updated.a : current.a();
    const stroke = needsUpdate ? updated.stroke : current.stroke();
    const renderedFaces = needsUpdate
      ? updated.renderedFaces
      : current.renderedFaces();

    TFB.Material.createMaterial(builder, r, g, b, a, renderedFaces, stroke);
  }

  const materialsRef = builder.endVector();

  // Meshes.meshesItems

  const meshesItemsOffset = TFB.Meshes.createMeshesItemsVector(
    builder,
    finalMeshesItems,
  );

  // Meshes.representationIds

  const reprLocalIdsOffset = TFB.Meshes.createRepresentationIdsVector(
    builder,
    finalReprIds,
  );

  // Meshes.sampleIds

  const sampleLocalIdsOffset = TFB.Meshes.createSampleIdsVector(
    builder,
    finalSampleIds,
  );

  // Meshes.materialIds

  const materialLocalIdsOffset = TFB.Meshes.createMaterialIdsVector(
    builder,
    finalMaterialIds,
  );

  // Meshes.localTransformIds

  const ltLocalIdsOffset = TFB.Meshes.createLocalTransformIdsVector(
    builder,
    finalLtIds,
  );

  // Meshes.globalTransformIds

  const gtLocalIdsOffset = TFB.Meshes.createGlobalTransformIdsVector(
    builder,
    finalGtIds,
  );

  // Meshes

  TFB.Meshes.startMeshes(builder);
  const coordinates = meshes.coordinates() as TFB.Transform;
  const coordinatesRef = copyTransform(builder, coordinates);
  TFB.Meshes.addCoordinates(builder, coordinatesRef);
  TFB.Meshes.addGlobalTransforms(builder, globalTransformsRef);
  TFB.Meshes.addShells(builder, shells);
  TFB.Meshes.addRepresentations(builder, representationsRef);
  TFB.Meshes.addSamples(builder, samplesOffset);
  TFB.Meshes.addLocalTransforms(builder, localTransformRef);
  TFB.Meshes.addMaterials(builder, materialsRef);
  TFB.Meshes.addCircleExtrusions(builder, circleExtrusions);
  TFB.Meshes.addMeshesItems(builder, meshesItemsOffset);
  TFB.Meshes.addRepresentationIds(builder, reprLocalIdsOffset);
  TFB.Meshes.addSampleIds(builder, sampleLocalIdsOffset);
  TFB.Meshes.addMaterialIds(builder, materialLocalIdsOffset);
  TFB.Meshes.addLocalTransformIds(builder, ltLocalIdsOffset);
  TFB.Meshes.addGlobalTransformIds(builder, gtLocalIdsOffset);
  const modelMesh = TFB.Meshes.endMeshes(builder);

  // Metadata

  let metadataOffset: number;
  if (metadataToUpdate) {
    const metadata = JSON.stringify(metadataToUpdate);
    metadataOffset = builder.createString(metadata);
  } else {
    const metadata = model.metadata() as string;
    metadataOffset = builder.createString(metadata);
  }

  // Attributes

  // Update or copy existing attributes

  const prevAttrLength = model.attributesLength();
  const attributesOffsets: number[] = [];
  const uniqueAttributes = new Set<string>();

  const categoriesOffsets: number[] = [];
  const guidsOffsets: number[] = [];
  const guidsItems: number[] = [];

  // TODO: Do we need to change guid items to be the index, not the local id?
  const guidsIndicesById = new Map<number, number>();
  for (let i = 0; i < model.guidsItemsLength(); i++) {
    const guidLocalId = model.guidsItems(i) as number;
    guidsIndicesById.set(guidLocalId, i);
  }

  for (let i = 0; i < prevAttrLength; i++) {
    const currentId = model.localIds(i) as number;
    if (itemsToDelete.has(currentId)) {
      continue;
    }
    const current = model.attributes(i) as TFB.Attribute;
    const dataOffsets: number[] = [];

    const needsUpdate = itemsToUpdate.has(currentId);

    if (needsUpdate) {
      const updated = itemsToUpdate.get(currentId) as ET.RawItemData;
      // Category
      categoriesOffsets.push(builder.createSharedString(updated.category));

      // Guid
      if (updated.guid) {
        guidsOffsets.push(builder.createSharedString(updated.guid));
        guidsItems.push(currentId);
      }

      // Attributes
      for (const attrName in updated.data) {
        const { value, type } = updated.data[attrName];
        const attrString = JSON.stringify([attrName, value, type]);
        uniqueAttributes.add(attrString);
        const dataOffset = builder.createSharedString(attrString);
        dataOffsets.push(dataOffset);
      }
    } else {
      // Category
      const currentCategory = model.categories(i) as string;
      categoriesOffsets.push(builder.createSharedString(currentCategory));

      // Guid
      const guidIndex = guidsIndicesById.get(currentId);
      if (guidIndex !== undefined) {
        const guid = model.guids(guidIndex) as string;
        // console.log(guid);
        guidsOffsets.push(builder.createSharedString(guid));
        guidsItems.push(currentId);
      }

      // Attributes
      const dataLength = current.dataLength();
      for (let j = 0; j < dataLength; j++) {
        const currentData = current.data(j) as string;
        uniqueAttributes.add(currentData);
        const dataOffset = builder.createSharedString(currentData);
        dataOffsets.push(dataOffset);
      }
    }
    const dataOffset = TFB.Attribute.createDataVector(builder, dataOffsets);
    const attributeOffset = TFB.Attribute.createAttribute(builder, dataOffset);
    attributesOffsets.push(attributeOffset);
  }

  // Create new attributes

  for (const [currentId, attributes] of itemsToCreate) {
    if (itemsToDelete.has(currentId)) {
      continue;
    }

    // Category
    categoriesOffsets.push(builder.createSharedString(attributes.category));

    // Guid
    if (attributes.guid) {
      console.log(attributes.guid);
      guidsOffsets.push(builder.createSharedString(attributes.guid));
      guidsItems.push(currentId);
    }

    const dataOffsets: number[] = [];
    for (const attrName in attributes.data) {
      const { value, type } = attributes.data[attrName];
      const attrString = JSON.stringify([attrName, value, type]);
      uniqueAttributes.add(attrString);
      const dataOffset = builder.createSharedString(attrString);
      dataOffsets.push(dataOffset);
    }
    const dataOffset = TFB.Attribute.createDataVector(builder, dataOffsets);
    const attributeOffset = TFB.Attribute.createAttribute(builder, dataOffset);
    attributesOffsets.push(attributeOffset);
  }

  const attributesVector = TFB.Model.createAttributesVector(
    builder,
    attributesOffsets,
  );

  // UniqueAttributes
  const uniqueAttrsOffsets: number[] = [];
  for (const attr of uniqueAttributes) {
    const dataOffset = builder.createSharedString(attr);
    uniqueAttrsOffsets.push(dataOffset);
  }
  const uniqueAttributesVector = TFB.Model.createUniqueAttributesVector(
    builder,
    uniqueAttrsOffsets,
  );

  // RelationNames

  const relationNamesLength = model.relationNamesLength();
  const relationNamesOffsets: number[] = [];
  for (let i = 0; i < relationNamesLength; i++) {
    const current = model.relationNames(i) as string;
    const relationNameOffset = builder.createSharedString(current);
    relationNamesOffsets.push(relationNameOffset);
  }

  const relNamesVector = TFB.Model.createRelationNamesVector(
    builder,
    relationNamesOffsets,
  );

  // LocalIds

  const localIdsVector = TFB.Model.createLocalIdsVector(builder, finalItemIds);

  // Categories

  const categoriesVector = TFB.Model.createCategoriesVector(
    builder,
    categoriesOffsets,
  );

  // Relations

  // Update or copy existing Relations

  // TODO: If the user deletes a relation, it can't create it again until the model is saved
  // because delete requests will prevent any new create or update requests
  // Mostly relations are updated, not deleted. Is this a problem?

  const relsOffsets: number[] = [];
  const newRelationsItems: number[] = [];
  const existingRelations = new Set<number>();
  const relItemsIndices = model.relationsItemsLength();

  const saveRelation = (relationData: ET.RawRelationData) => {
    const dataOffsets: number[] = [];
    for (const name in relationData.data) {
      const ids = relationData.data[name];

      // Filter out deleted items
      const filteredIds = ids.filter((id) => !itemsToDelete.has(id));

      // Skip empty relations
      if (!filteredIds.length) continue;
      const dataOffset = builder.createSharedString(
        JSON.stringify([name, ...filteredIds]),
      );
      dataOffsets.push(dataOffset);
    }
    const dataOffset = TFB.Relation.createDataVector(builder, dataOffsets);
    const relOffset = TFB.Relation.createRelation(builder, dataOffset);
    relsOffsets.push(relOffset);
  };

  for (let i = 0; i < relItemsIndices; i++) {
    const localId = model.relationsItems(i) as number;
    existingRelations.add(localId);
    if (
      itemsToDelete.has(localId) ||
      relationsToDelete.has(localId) ||
      !localIdToIndex.has(localId)
    ) {
      continue;
    }

    // Relations
    let relationData: ET.RawRelationData;
    if (relationsToUpdate.has(localId)) {
      relationData = relationsToUpdate.get(localId) as ET.RawRelationData;
    } else {
      const current = model.relations(i) as TFB.Relation;
      relationData = EditUtils.getRelationData(current);
    }

    saveRelation(relationData);

    // RelationsItems
    newRelationsItems.push(localId);
  }

  // Create new Relations

  for (const [localId, newRelationData] of relationsToCreate) {
    if (
      itemsToDelete.has(localId) ||
      relationsToDelete.has(localId) ||
      existingRelations.has(localId) // the relation already exists
    ) {
      continue;
    }

    let relationData: ET.RawRelationData;
    if (relationsToUpdate.has(localId)) {
      relationData = relationsToUpdate.get(localId) as ET.RawRelationData;
    } else {
      relationData = newRelationData;
    }

    saveRelation(relationData);

    newRelationsItems.push(localId);
  }

  existingRelations.clear();

  const relsVector = TFB.Model.createRelationsVector(builder, relsOffsets);

  const relIndicesVector = TFB.Model.createRelationsItemsVector(
    builder,
    newRelationsItems,
  );

  // GuidsItems

  const guidsItemsVector = TFB.Model.createGuidsItemsVector(
    builder,
    guidsItems,
  );

  // Guids

  const guidsVector = TFB.Model.createGuidsVector(builder, guidsOffsets);

  // SpatialStructure

  let spatialStructureOffset: number | null = null;
  if (spatialStructureToUpdate) {
    spatialStructureOffset = createSpatialStructure(
      builder,
      spatialStructureToUpdate,
    );
  } else {
    const spatialStruture = model.spatialStructure();
    spatialStructureOffset = copySpatialStructure(builder, spatialStruture);
  }

  // Guid

  const guidLength = model.guid() as string;
  const guidRef = builder.createString(guidLength);

  // Model

  TFB.Model.startModel(builder);
  TFB.Model.addMeshes(builder, modelMesh);
  TFB.Model.addMetadata(builder, metadataOffset);
  TFB.Model.addAttributes(builder, attributesVector);
  TFB.Model.addUniqueAttributes(builder, uniqueAttributesVector);
  TFB.Model.addRelationNames(builder, relNamesVector);
  TFB.Model.addLocalIds(builder, localIdsVector);
  TFB.Model.addCategories(builder, categoriesVector);
  TFB.Model.addRelationsItems(builder, relIndicesVector);
  TFB.Model.addRelations(builder, relsVector);
  TFB.Model.addGuidsItems(builder, guidsItemsVector);
  TFB.Model.addGuids(builder, guidsVector);
  if (spatialStructureOffset !== null) {
    TFB.Model.addSpatialStructure(builder, spatialStructureOffset);
  }
  TFB.Model.addGuid(builder, guidRef);
  TFB.Model.addMaxLocalId(builder, newMaxLocalId);
  const outData = TFB.Model.endModel(builder);

  builder.finish(outData);
  const outBytes = builder.asUint8Array();

  builder.clear();

  // const byteBuffer = new FB.ByteBuffer(outBytes);
  // const readModel = TFB.Model.getRootAsModel(byteBuffer);
  // const result2 = {};
  // getObject(readModel, result2);
  // console.log(result2);

  const result = raw ? outBytes : pako.deflate(outBytes);

  // We need to find out which items were affected by the edit
  // Let's see what samples were edited or deleted

  const affectedItems = new Set(finalItemIds);
  const editedSamples = new Set<number>(finalSampleIds);
  getAffectedItems(requests, editedSamples, meshes, model, affectedItems);

  return { model: result, items: Array.from(affectedItems) };
}
