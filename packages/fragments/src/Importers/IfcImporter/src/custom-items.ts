import { Builder } from "flatbuffers";
import {
  ALIGNMENT_CATEGORY,
  AlignmentData,
  GRID_CATEGORY,
  GridData,
} from "../../../FragmentsModels";
import * as TFB from "../../../Schema";
import type { TransformData } from "./geometry/ifc-file-reader";
import { MeshesWriter } from "./geometry/meshes-writer";

/**
 * Writes a grid or an alignment as an item's attributes: its data as JSON,
 * which is how the viewer reads it back.
 *
 * @returns the attributes, and the one string they hold.
 */
export function writeCustomItem(
  builder: Builder,
  customItem: AlignmentData | GridData,
) {
  const data = JSON.stringify([
    "data",
    JSON.stringify(customItem),
    "UNDEFINED",
  ]);
  const dataVector = TFB.Attribute.createDataVector(builder, [
    builder.createSharedString(data),
  ]);
  return {
    data,
    attribute: TFB.Attribute.createAttribute(builder, dataVector),
  };
}

/**
 * Writes a conversion's grids and alignments as a model of their own: the
 * reference split. They are items the importer makes up, with local ids
 * from `firstLocalId` on, and the viewer draws them from their attributes,
 * so the model has those and no meshes.
 */
export function writeReferenceSplit({
  alignments,
  grids,
  coordinates,
  firstLocalId,
  guid,
}: {
  alignments: AlignmentData[];
  grids: GridData[];
  coordinates: TransformData;
  firstLocalId: number;
  guid: string;
}) {
  const builder = new Builder(1024);
  const localIds: number[] = [];
  const categories: number[] = [];
  const attributes: number[] = [];
  const add = (items: (AlignmentData | GridData)[], category: string) => {
    for (const item of items) {
      localIds.push(firstLocalId + localIds.length);
      categories.push(builder.createSharedString(category));
      attributes.push(writeCustomItem(builder, item).attribute);
    }
  };
  add(alignments, ALIGNMENT_CATEGORY);
  add(grids, GRID_CATEGORY);
  const maxLocalID = firstLocalId + localIds.length;

  // A model has a meshes table, and the viewer aligns models by the
  // coordinates in it
  const meshes = new MeshesWriter(builder, false).finish(
    coordinates,
    maxLocalID,
  ).modelMesh;
  const attributesVector = TFB.Model.createAttributesVector(
    builder,
    attributes,
  );
  const categoriesVector = TFB.Model.createCategoriesVector(
    builder,
    categories,
  );
  const localIdsVector = TFB.Model.createLocalIdsVector(builder, localIds);
  // The schema requires both, and these items have no GUID
  const guidsVector = TFB.Model.createGuidsVector(builder, []);
  const guidsItemsVector = TFB.Model.createGuidsItemsVector(builder, []);
  const guidRef = builder.createString(guid);

  TFB.Model.startModel(builder);
  TFB.Model.addMeshes(builder, meshes);
  TFB.Model.addAttributes(builder, attributesVector);
  TFB.Model.addLocalIds(builder, localIdsVector);
  TFB.Model.addCategories(builder, categoriesVector);
  TFB.Model.addGuidsItems(builder, guidsItemsVector);
  TFB.Model.addGuids(builder, guidsVector);
  TFB.Model.addGuid(builder, guidRef);
  TFB.Model.addMaxLocalId(builder, maxLocalID);
  builder.finish(TFB.Model.endModel(builder));

  return { model: builder.asUint8Array(), localIds, maxLocalID };
}
