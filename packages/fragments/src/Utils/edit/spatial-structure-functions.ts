import * as FB from "flatbuffers";
import * as TFB from "../../Schema";
import { SpatialTreeItem } from "../../FragmentsModels";

export function copySpatialStructure(
  builder: FB.Builder,
  spatialStructure: TFB.SpatialStructure | null,
) {
  if (!spatialStructure) return null;
  const childrenLength = spatialStructure.childrenLength();
  const childrenOffsets: number[] = [];
  for (let i = 0; i < childrenLength; i++) {
    const current = spatialStructure.children(i) as TFB.SpatialStructure;
    const childOffset = copySpatialStructure(builder, current);
    if (childOffset === null) continue;
    childrenOffsets.push(childOffset);
  }
  const childrenOffset = TFB.SpatialStructure.createChildrenVector(
    builder,
    childrenOffsets,
  );

  const localId = spatialStructure.localId();
  const category = spatialStructure.category();

  if (localId !== null) {
    TFB.SpatialStructure.startSpatialStructure(builder);
    TFB.SpatialStructure.addLocalId(builder, localId);
    TFB.SpatialStructure.addChildren(builder, childrenOffset);
    return TFB.SpatialStructure.endSpatialStructure(builder);
  }

  if (category !== null) {
    const categoryOffset = builder.createSharedString(category);
    TFB.SpatialStructure.startSpatialStructure(builder);
    TFB.SpatialStructure.addCategory(builder, categoryOffset);
    TFB.SpatialStructure.addChildren(builder, childrenOffset);
    return TFB.SpatialStructure.endSpatialStructure(builder);
  }

  throw new Error("Spatial structure must have a local id or a category");
}

export function createSpatialStructure(
  builder: FB.Builder,
  spatialStructure: SpatialTreeItem,
) {
  const children = spatialStructure.children ?? [];
  const childrenLength = children ? children.length : 0;

  const childrenOffsets: number[] = [];

  for (let i = 0; i < childrenLength; i++) {
    const current = children[i] as SpatialTreeItem;
    const childOffset = createSpatialStructure(builder, current);
    if (childOffset === null) continue;
    childrenOffsets.push(childOffset);
  }

  const childrenOffset = TFB.SpatialStructure.createChildrenVector(
    builder,
    childrenOffsets,
  );

  const localId = spatialStructure.localId;
  const category = spatialStructure.category;

  if (localId !== null) {
    TFB.SpatialStructure.startSpatialStructure(builder);
    TFB.SpatialStructure.addLocalId(builder, localId);
    TFB.SpatialStructure.addChildren(builder, childrenOffset);
    return TFB.SpatialStructure.endSpatialStructure(builder);
  }

  if (category !== null) {
    const categoryOffset = builder.createSharedString(category);
    TFB.SpatialStructure.startSpatialStructure(builder);
    TFB.SpatialStructure.addCategory(builder, categoryOffset);
    TFB.SpatialStructure.addChildren(builder, childrenOffset);
    return TFB.SpatialStructure.endSpatialStructure(builder);
  }

  throw new Error("Spatial structure must have a local id or a category");
}
