import * as FB from "flatbuffers";
import * as THREE from "three";
import pako from "pako";
import * as TFB from "../../Schema";
import { createTransform } from "./transfom-functions";

export function newModel(config: { raw: boolean }) {
  const builder = new FB.Builder(1024);

  // Meshes.globalTransforms

  TFB.Meshes.startGlobalTransformsVector(builder, 0);
  const globalTransformsRef = builder.endVector();

  // Meshes.shells

  const shells = TFB.Meshes.createShellsVector(builder, []);

  // Meshes.representations

  TFB.Meshes.startRepresentationsVector(builder, 0);
  const representationsRef = builder.endVector();

  // Meshes.samples

  TFB.Meshes.startSamplesVector(builder, 0);
  const samplesOffset = builder.endVector();

  // Meshes.localTransforms

  TFB.Meshes.startLocalTransformsVector(builder, 0);
  const localTransformRef = builder.endVector();

  // Meshes.materials

  TFB.Meshes.startMaterialsVector(builder, 0);
  const materialsRef = builder.endVector();

  // Meshes.circleExtrusions

  const circleExtrusions = TFB.Meshes.createCircleExtrusionsVector(builder, []);

  // Meshes.meshesItems

  const meshesItemsOffset = TFB.Meshes.createMeshesItemsVector(builder, []);

  // Meshes.representationIds

  const reprLocalIdsOffset = TFB.Meshes.createRepresentationIdsVector(
    builder,
    [],
  );

  // Meshes.sampleIds

  const sampleLocalIdsOffset = TFB.Meshes.createSampleIdsVector(builder, []);

  // Meshes.materialIds

  const materialLocalIdsOffset = TFB.Meshes.createMaterialIdsVector(
    builder,
    [],
  );

  // Meshes.localTransformIds

  const ltLocalIdsOffset = TFB.Meshes.createLocalTransformIdsVector(
    builder,
    [],
  );

  // Meshes.globalTransformIds

  const gtLocalIdsOffset = TFB.Meshes.createGlobalTransformIdsVector(
    builder,
    [],
  );

  // Meshes

  TFB.Meshes.startMeshes(builder);

  const coordinatesRef = createTransform(
    {
      position: [0, 0, 0],
      xDirection: [1, 0, 0],
      yDirection: [0, 1, 0],
    },
    builder,
  );

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

  const metadataOffset = builder.createString("{}");

  // Attributes

  const attributesVector = TFB.Model.createAttributesVector(builder, []);

  // UniqueAttributes

  const uniqueAttributesVector = TFB.Model.createUniqueAttributesVector(
    builder,
    [],
  );

  // RelationNames

  const relNamesVector = TFB.Model.createRelationNamesVector(builder, []);

  // LocalIds

  const localIdsVector = TFB.Model.createLocalIdsVector(builder, []);

  // Categories

  const categoriesVector = TFB.Model.createCategoriesVector(builder, []);

  // RelationsItems

  const relIndicesVector = TFB.Model.createRelationsItemsVector(builder, []);

  // Relations

  const relsVector = TFB.Model.createRelationsVector(builder, []);

  // GuidsItems

  const guidsItemsVector = TFB.Model.createGuidsItemsVector(builder, []);

  // Guids

  const guidsVector = TFB.Model.createGuidsVector(builder, []);

  // Guid

  const guidRef = builder.createString(THREE.MathUtils.generateUUID());

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
  TFB.Model.addGuid(builder, guidRef);
  TFB.Model.addMaxLocalId(builder, 1);
  const outData = TFB.Model.endModel(builder);

  builder.finish(outData);
  const outBytes = builder.asUint8Array();

  builder.clear();

  const result = config.raw ? outBytes : pako.deflate(outBytes);

  return result;
}
