import * as TFB from "../../Schema";
import * as ET from "./edit-types";
import { EditUtils } from "./edit-utils";

export function getIdsDelta(model: TFB.Model, requests: ET.EditRequest[]) {
  const itemIds = new Set<number>();
  const globalTranforms = new Set<number>();
  const localTransforms = new Set<number>();
  const samples = new Set<number>();
  const materials = new Set<number>();
  const representations = new Set<number>();
  const shells = new Set<number>(); // Indices
  const circleExtrusions = new Set<number>(); // Indices

  let createNewSample = false;

  // Compute new deleted elements to know how many items we will create in flatbuffers
  // Existing elements don't count because they are already excluded in this function
  // We will only account deleted elements that did not exist in the previous model
  let detaDeletedGtsCount = 0;
  let detaDeletedLtsCount = 0;
  let detaDeletedSamplesCount = 0;
  let detaDeletedMaterialsCount = 0;
  let detaDeletedRepresentationsCount = 0;
  let detaDeletedShellsCount = 0;
  let detaDeletedCircleExtrusionsCount = 0;

  const deletedSamples = new Set<number>();

  // These ids are used to store ids so that are not taken into account when
  // fetching samples (e.g. when a sample has a material, we don't necessarily
  // want all samples with that material)
  const samplesGtIds = new Set<number>();
  const samplesLtIds = new Set<number>();
  const samplesMaterialIds = new Set<number>();
  const samplesRepIds = new Set<number>();
  const samplesSamplesIds = new Set<number>();
  const samplesItemsIds = new Set<number>();

  const meshes = model.meshes()!;

  const prevGts = new Set(meshes.globalTransformIdsArray());
  const prevLts = new Set(meshes.localTransformIdsArray());
  const prevMaterials = new Set(meshes.materialIdsArray());
  const prevRepresentations = new Set(meshes.representationIdsArray());
  const prevItems = new Set(model.localIdsArray());
  const prevSamples = new Set(meshes.sampleIdsArray());

  const createdSamplesIds = new Set<number>();

  for (const request of requests) {
    if (request.type === ET.EditRequestType.CREATE_SAMPLE) {
      createNewSample = true;
    }

    if (request.type === ET.EditRequestType.UPDATE_LOCAL_TRANSFORM) {
      localTransforms.add(request.localId as number);
      continue;
    }
    if (request.type === ET.EditRequestType.UPDATE_MATERIAL) {
      materials.add(request.localId as number);
      continue;
    }
    if (request.type === ET.EditRequestType.UPDATE_REPRESENTATION) {
      representations.add(request.localId as number);
      continue;
    }
    if (request.type === ET.EditRequestType.UPDATE_ITEM) {
      itemIds.add(request.localId as number);
      continue;
    }

    // When we create a global transform, it can reference an existing item id
    // We want to include it in the delta
    if (request.type === ET.EditRequestType.CREATE_GLOBAL_TRANSFORM) {
      if (prevItems.has(request.data.itemId as number)) {
        itemIds.add(request.data.itemId as number);
      }
      continue;
    }

    // We also want to include any items referenced by updated global transforms
    if (request.type === ET.EditRequestType.UPDATE_GLOBAL_TRANSFORM) {
      globalTranforms.add(request.localId as number);
      if (prevItems.has(request.data.itemId as number)) {
        itemIds.add(request.data.itemId as number);
      }
      continue;
    }

    // Samples can reference new elements, and here we only want existing elements
    if (request.type === ET.EditRequestType.UPDATE_SAMPLE) {
      // If the updated sample was created in a previous request, then skip this
      // just like we do in the CREATE_SAMPLE logic
      if (!createdSamplesIds.has(request.localId as number)) {
        samples.add(request.localId as number);
      }

      // We add the global transform here because when a sample involes an item
      // We also want all the samples of the same item
      if (prevGts.has(request.data.item as number)) {
        globalTranforms.add(request.data.item as number);
      }

      // For other sample elements, we don't want to include them in the delta
      // e.g. when a sample has a material, we don't want all samples with that material
      if (prevLts.has(request.data.localTransform as number)) {
        samplesLtIds.add(request.data.localTransform as number);
      }
      if (prevMaterials.has(request.data.material as number)) {
        samplesMaterialIds.add(request.data.material as number);
      }
      if (prevRepresentations.has(request.data.representation as number)) {
        samplesRepIds.add(request.data.representation as number);
      }
      continue;
    }

    // When a new sample reference existing elements, we also want them
    if (request.type === ET.EditRequestType.CREATE_SAMPLE) {
      createdSamplesIds.add(request.localId as number);

      // We add the global transform here because when a sample involes an item
      // We also want all the samples of the same item
      if (prevGts.has(request.data.item as number)) {
        globalTranforms.add(request.data.item as number);
      }
      // For other sample elements, we don't want to include them in the delta
      // e.g. when a sample has a material, we don't want all samples with that material
      if (prevLts.has(request.data.localTransform as number)) {
        samplesLtIds.add(request.data.localTransform as number);
      }
      if (prevMaterials.has(request.data.material as number)) {
        samplesMaterialIds.add(request.data.material as number);
      }
      if (prevRepresentations.has(request.data.representation as number)) {
        samplesRepIds.add(request.data.representation as number);
      }
      continue;
    }
  }

  const deletedRepsIds = new Set<number>();
  for (const request of requests) {
    if (request.type === ET.EditRequestType.DELETE_GLOBAL_TRANSFORM) {
      globalTranforms.delete(request.localId as number);
      if (!prevGts.has(request.localId as number)) {
        detaDeletedGtsCount++;
      }
      continue;
    }
    if (request.type === ET.EditRequestType.DELETE_LOCAL_TRANSFORM) {
      localTransforms.delete(request.localId as number);
      if (!prevLts.has(request.localId as number)) {
        detaDeletedLtsCount++;
      }
      continue;
    }
    if (request.type === ET.EditRequestType.DELETE_SAMPLE) {
      samples.delete(request.localId as number);
      deletedSamples.add(request.localId as number);
      if (!prevSamples.has(request.localId as number)) {
        detaDeletedSamplesCount++;
      }
      continue;
    }
    if (request.type === ET.EditRequestType.DELETE_MATERIAL) {
      materials.delete(request.localId as number);
      if (!prevMaterials.has(request.localId as number)) {
        detaDeletedMaterialsCount++;
      }
      continue;
    }
    if (request.type === ET.EditRequestType.DELETE_REPRESENTATION) {
      representations.delete(request.localId as number);
      deletedRepsIds.add(request.localId as number);
      if (!prevRepresentations.has(request.localId as number)) {
        detaDeletedRepresentationsCount++;
      }
      continue;
    }
    if (request.type === ET.EditRequestType.DELETE_ITEM) {
      itemIds.delete(request.localId as number);
      continue;
    }
  }

  // Also count deleted shells and circle extrusions

  const deletedReprs = EditUtils.getRepresentations(model, deletedRepsIds);
  for (const [, repr] of deletedReprs) {
    if (repr.representationClass === TFB.RepresentationClass.SHELL) {
      detaDeletedShellsCount++;
    } else if (
      repr.representationClass === TFB.RepresentationClass.CIRCLE_EXTRUSION
    ) {
      detaDeletedCircleExtrusionsCount++;
    } else {
      throw new Error("Unsupported representation class");
    }
  }

  // This is for representations that were both created and deleted
  for (const request of requests) {
    if (request.type === ET.EditRequestType.CREATE_REPRESENTATION) {
      if (deletedRepsIds.has(request.localId as number)) {
        if (
          request.data.representationClass === TFB.RepresentationClass.SHELL
        ) {
          detaDeletedShellsCount++;
        } else if (
          request.data.representationClass ===
          TFB.RepresentationClass.CIRCLE_EXTRUSION
        ) {
          detaDeletedCircleExtrusionsCount++;
        } else {
          throw new Error("Unsupported representation class");
        }
      }
    }
  }

  // We also need to include any sample that is referenced by the gathered items

  // First gather the item ids referenced by samples

  for (let i = 0; i < meshes.samplesLength(); i++) {
    const sample = meshes.samples(i)!;
    const gtIndex = sample.item()!;
    const ltIndex = sample.localTransform()!;
    const materialIndex = sample.material()!;
    const repIndex = sample.representation()!;

    const gtId = meshes.globalTransformIds(gtIndex)!;
    const ltId = meshes.localTransformIds(ltIndex)!;
    const materialId = meshes.materialIds(materialIndex)!;
    const repId = meshes.representationIds(repIndex)!;
    const itemIndex = meshes.meshesItems(gtIndex)!;
    const itemId = model.localIds(itemIndex)!;

    if (
      globalTranforms.has(gtId) ||
      localTransforms.has(ltId) ||
      materials.has(materialId) ||
      representations.has(repId) ||
      itemIds.has(itemId)
    ) {
      if (prevItems.has(itemId)) {
        itemIds.add(itemId);
      }
    }
  }

  // Now gather the rest of elements

  for (let i = 0; i < meshes.samplesLength(); i++) {
    // If this sample was deleted, don't include it in the delta
    const sampleId = meshes.sampleIds(i)!;
    if (deletedSamples.has(sampleId)) {
      continue;
    }

    const sample = meshes.samples(i)!;
    const gtIndex = sample.item()!;
    const ltIndex = sample.localTransform()!;
    const materialIndex = sample.material()!;
    const repIndex = sample.representation()!;

    const gtId = meshes.globalTransformIds(gtIndex)!;
    const ltId = meshes.localTransformIds(ltIndex)!;
    const materialId = meshes.materialIds(materialIndex)!;
    const repId = meshes.representationIds(repIndex)!;
    const itemIndex = meshes.meshesItems(gtIndex)!;
    const itemId = model.localIds(itemIndex)!;

    if (
      globalTranforms.has(gtId) ||
      localTransforms.has(ltId) ||
      materials.has(materialId) ||
      representations.has(repId) ||
      itemIds.has(itemId)
    ) {
      if (prevGts.has(gtId)) {
        samplesGtIds.add(gtId);
      }
      if (prevLts.has(ltId)) {
        samplesLtIds.add(ltId);
      }
      if (prevMaterials.has(materialId)) {
        samplesMaterialIds.add(materialId);
      }
      if (prevRepresentations.has(repId)) {
        samplesRepIds.add(repId);
      }
      if (prevItems.has(itemId)) {
        samplesItemsIds.add(itemId);
      }
      samplesSamplesIds.add(sampleId);
    }
  }

  prevGts.clear();
  prevLts.clear();
  prevMaterials.clear();
  prevRepresentations.clear();
  prevItems.clear();
  prevSamples.clear();

  for (const id of samplesGtIds) {
    globalTranforms.add(id);
  }

  for (const id of samplesLtIds) {
    localTransforms.add(id);
  }

  for (const id of samplesMaterialIds) {
    materials.add(id);
  }

  for (const id of samplesRepIds) {
    representations.add(id);
  }

  for (const id of samplesSamplesIds) {
    samples.add(id);
  }

  for (const id of samplesItemsIds) {
    itemIds.add(id);
  }

  samplesGtIds.clear();
  samplesLtIds.clear();
  samplesMaterialIds.clear();
  samplesRepIds.clear();
  samplesSamplesIds.clear();
  samplesItemsIds.clear();

  const indices = EditUtils.getGeometryIndicesFromRepresentations(
    model,
    representations,
  );

  for (const index of indices.shellsIndices) {
    shells.add(index);
  }

  for (const index of indices.rebarsIndices) {
    circleExtrusions.add(index);
  }

  return {
    itemIds,
    globalTranforms,
    localTransforms,
    samples,
    materials,
    representations,
    shells, // Indices
    circleExtrusions, // Indices
    detaDeletedGts: detaDeletedGtsCount,
    detaDeletedLts: detaDeletedLtsCount,
    detaDeletedSamples: detaDeletedSamplesCount,
    detaDeletedMaterials: detaDeletedMaterialsCount,
    detaDeletedRepresentations: detaDeletedRepresentationsCount,
    detaDeletedShells: detaDeletedShellsCount,
    detaDeletedCircleExtrusions: detaDeletedCircleExtrusionsCount,
    createNewSample,
  };
}
