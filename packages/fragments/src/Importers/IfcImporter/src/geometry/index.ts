import * as FB from "flatbuffers";
import * as WEBIFC from "web-ifc";
import * as TFB from "../../../../Schema";
import { ifcCategoryMap } from "../../../../Utils";
import { IfcFileReader, TransformData } from "./ifc-file-reader";
import { AlignmentData, GridData } from "../../../../FragmentsModels";
import { IfcImporter } from "../..";
import { ProcessData } from "../types";
import {
  IfcProjectedReader,
  ProjectedReadOptions,
  ProjectedReadStats,
} from "./ifc-projected-reader";
import { MeshesWriter } from "./meshes-writer";

export { serveIfcGeometryWorker } from "./geometry-batch";
export type { ProjectedReadStats } from "./ifc-projected-reader";

/** Writes geometry as several models; see {@link ProcessData.splits}. */
export interface GeometrySplitOptions {
  /** Most elements per split. */
  maxItems: number;
  /** Bytes of model past which a split is ended. */
  maxBytes: number;
  /** Each split's id, by position: written as its model's guid. */
  id: (index: number) => string;
  /** Takes each split as it is completed: its model, raw, and its items. */
  onSplit: (split: {
    id: string;
    model: Uint8Array;
    localIds: Uint32Array;
  }) => void | Promise<void>;
}

interface GeometriesProcessData extends ProcessData {
  builder: FB.Builder;
  /** Read geometry as projections instead of one whole-file model. */
  projected?: ProjectedReadOptions;
  /** Write geometry to models of its own instead of to {@link builder}. */
  geometrySplits?: GeometrySplitOptions;
}

export interface GeometryProcessResult {
  /** The model's meshes table, or null when geometry went to splits. */
  modelMesh: number | null;
  /** The items with geometry, in the order mesh items refer to them. */
  localIDs: Uint32Array;
  maxLocalID: number;
  alignments: AlignmentData[];
  grids: GridData[];
  coordinates: TransformData;
}

export class IfcGeometryProcessor {
  wasm = {
    path: "../../../../node_modules/web-ifc/",
    absolute: false,
  };

  webIfcSettings: WEBIFC.LoaderSettings = {};

  /** Set after a projected read. */
  projectedStats: ProjectedReadStats | null = null;

  private _serializer: IfcImporter;

  constructor(_serializer: IfcImporter) {
    this._serializer = _serializer;
  }

  async process(data: GeometriesProcessData): Promise<GeometryProcessResult> {
    const { geometrySplits: splits } = data;
    const doubleSided = this._serializer.doubleSidedMaterials;

    let nextId = 0;

    // prettier-ignore
    let coordinates: TransformData = {
      dxx: 1, dxy: 0, dxz: 0,
      dyx: 0, dyy: 1, dyz: 0,
      px: 0, py: 0, pz: 0,
    };

    const alignments: AlignmentData[] = [];
    const grids: GridData[] = [];

    // A split is a model of its own, in a builder of its own: both are
    // replaced whenever one is completed.
    let builder = splits ? new FB.Builder(1024) : data.builder;
    let writer = new MeshesWriter(builder, doubleSided);
    let splitCount = 0;

    const fileReader = new IfcFileReader(this._serializer);
    fileReader.wasm = this.wasm;
    fileReader.webIfcSettings = this.webIfcSettings;
    // fileReader.isolatedMeshes = new Set([22835]);
    const projectedReader = new IfcProjectedReader(this._serializer);
    const reader = data.projected ? projectedReader : fileReader;

    reader.onGeometryLoaded = (geometry) => writer.addGeometry(geometry);

    reader.onElementLoaded = (element) => writer.addElement(element);

    reader.onLocalTransformLoaded = (localTransform) => {
      writer.addLocalTransform(localTransform);
    };

    reader.onCoordinatesLoaded = (coords) => {
      coordinates = coords;
    };

    reader.onNextIdFound = (foundNextId) => {
      nextId = foundNextId;
    };

    reader.onAlignmentsLoaded = (data) => {
      for (const alignment of data) {
        alignments.push(alignment);
      }
    };

    reader.onGridsLoaded = (data: GridData[]) => {
      for (const grid of data) {
        grids.push(grid);
      }
    };

    // Completes the split being written and starts the next. Ids carry on
    // from one split to the next, so none is used twice in a conversion.
    const cut = async (firstFreeId: number) => {
      const finished = { builder, writer };
      // The next one starts at the size this one reached, rather than growing
      // to it by doubling.
      builder = new FB.Builder(Math.max(1024, finished.builder.offset()));
      writer = new MeshesWriter(builder, doubleSided);
      if (finished.writer.itemCount === 0) return firstFreeId;
      const id = splits!.id(splitCount++);
      const { model, localIds, maxLocalID } = this.writeSplit({
        ...finished,
        coordinates,
        firstFreeId,
        guid: id,
      });
      await splits!.onSplit({ id, model, localIds });
      return maxLocalID;
    };

    if (data.projected) {
      await projectedReader.load(data, {
        ...data.projected,
        splits: splits && {
          maxItems: splits.maxItems,
          isFull: () => builder.offset() >= splits.maxBytes,
          cut,
        },
      });
    } else {
      await fileReader.load(data);
    }
    this.projectedStats = data.projected ? projectedReader.stats : null;

    // GEOMETRY

    // For now we are just saving alignments as lines
    // When we save other implicit data, we might need to move this
    // to a different file and sort things better

    if (splits) {
      return {
        modelMesh: null,
        localIDs: new Uint32Array(0),
        maxLocalID: await cut(nextId),
        alignments,
        grids,
        coordinates,
      };
    }

    const { modelMesh, localIDs, maxLocalID } = writer.finish(
      coordinates,
      nextId,
    );

    return {
      modelMesh,
      localIDs,
      maxLocalID,
      alignments,
      grids,
      coordinates,
    };
  }

  /**
   * Completes a geometry split: its meshes, and the local id and category of
   * the item each belongs to, which is all that drawing, picking and hiding
   * read. Everything else about an item is data, and is not written here.
   */
  private writeSplit({
    builder,
    writer,
    coordinates,
    firstFreeId,
    guid,
  }: {
    builder: FB.Builder;
    writer: MeshesWriter;
    coordinates: TransformData;
    firstFreeId: number;
    guid: string;
  }) {
    const { modelMesh, localIDs, types, maxLocalID } = writer.finish(
      coordinates,
      firstFreeId,
    );

    const categories: number[] = [];
    for (const type of types) {
      categories.push(builder.createSharedString(ifcCategoryMap[type]));
    }
    const categoriesVector = TFB.Model.createCategoriesVector(
      builder,
      categories,
    );
    const localIdsVector = TFB.Model.createLocalIdsVector(builder, localIDs);
    // The schema requires both, and GUIDs are data: left empty
    const guidsVector = TFB.Model.createGuidsVector(builder, []);
    const guidsItemsVector = TFB.Model.createGuidsItemsVector(builder, []);
    const guidRef = builder.createString(guid);

    TFB.Model.startModel(builder);
    TFB.Model.addMeshes(builder, modelMesh);
    TFB.Model.addLocalIds(builder, localIdsVector);
    TFB.Model.addCategories(builder, categoriesVector);
    TFB.Model.addGuidsItems(builder, guidsItemsVector);
    TFB.Model.addGuids(builder, guidsVector);
    TFB.Model.addGuid(builder, guidRef);
    TFB.Model.addMaxLocalId(builder, maxLocalID);
    builder.finish(TFB.Model.endModel(builder));

    return {
      model: builder.asUint8Array(),
      localIds: localIDs.slice(),
      maxLocalID,
    };
  }
}
