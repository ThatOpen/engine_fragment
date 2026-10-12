import * as fb from "flatbuffers";
import { MathUtils } from "three";
import pako from "pako";
import * as WEBIFC from "web-ifc";
import * as TFB from "../../Schema";
import {
  IfcPropertyProcessor,
  IfcGeometryProcessor,
  ifcClasses,
  IfcSplitInfo,
  IfcSplitManifest,
  ProcessData,
} from "./src";
import {
  DataSet,
  GeometryProcessSettings,
  ifcCategoryMap,
  ifcRelationsMap,
  geometryTypes,
} from "../../Utils";
import {
  IfcBlobSource,
  IfcBytesSource,
  IfcChunkedBytesSource,
} from "../../Utils/ifc-byte-source";
import { IfcEntityResolver } from "../../Utils/ifc-resolver";
import { IfcResolverLineApi } from "../../Utils/ifc-line-api";
import {
  BatchExecutor,
  BatchRunnerOptions,
  LocalBatchExecutor,
  WorkerBatchExecutor,
} from "./src/geometry/geometry-batch";
import type {
  ProjectedReadOptions,
  ProjectedReadStats,
} from "./src/geometry/ifc-projected-reader";
import { MeshesWriter } from "./src/geometry/meshes-writer";
import { writeReferenceSplit } from "./src/custom-items";
import { buildSplitIndex } from "./src/split-index";

/**
 * An objet to convert IFC files into fragments.
 */
export class IfcImporter {
  private _builder: fb.Builder | null = null;

  /** Configuration for the web-ifc WASM module
   * @property {string} path - The path to the web-ifc WASM files
   * @property {boolean} absolute - Whether the path is absolute or relative
   */
  wasm = {
    path: "/node_modules/web-ifc/",
    absolute: false,
  };

  webIfcSettings: WEBIFC.LoaderSettings = {
    COORDINATE_TO_ORIGIN: true,
  };

  /** A set of attribute names to exclude from serialization.
   */
  attributesToExclude = new Set([
    "Representation",
    "ObjectPlacement",
    "CompositionType",
    "OwnerHistory",
  ]);

  geometryProcessSettings: GeometryProcessSettings = {
    // TODO: Test to see if this is the correct threshold
    // if not applied, some geometries take too long to process
    threshold: 3000,
    precision: 1000000,
    normalPrecision: 10000000,
    planePrecision: 1000,
    faceThreshold: 0.6,
    forceTransparentSpaces: true,
  };

  /**
   * @summary Defines the relationships between IFC entities.
   * @description This map defines the relationships between IFC entities, specifying the relationship type,
   * and the properties that define the relationship in both directions.
   *
   * The keys of the map are IFC relationship types (e.g., `IFCRELDEFINESBYPROPERTIES`).
   * The values are objects that define the properties for relating and related entities.
   *
   * - `forRelating`: The property name on the relating entity.
   * - `forRelated`: The property name on the related entity.
   */
  relations = new Map([
    [
      WEBIFC.IFCRELDEFINESBYPROPERTIES,
      { forRelating: "DefinesOccurrence", forRelated: "IsDefinedBy" },
    ],
    [
      WEBIFC.IFCRELDEFINESBYTYPE,
      { forRelating: "ObjectTypeOf", forRelated: "IsDefinedBy" },
    ],
    [
      WEBIFC.IFCRELASSOCIATESMATERIAL,
      { forRelated: "HasAssociations", forRelating: "AssociatedTo" },
    ],
    [
      WEBIFC.IFCRELAGGREGATES,
      { forRelated: "Decomposes", forRelating: "IsDecomposedBy" },
    ],
    [
      WEBIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE,
      { forRelated: "ContainedInStructure", forRelating: "ContainsElements" },
    ],
    // Needed for the spatial structure to include IFC4x3 alignment layouts:
    // alignments attach to the spatial element by reference (not containment)
    // and nest their horizontal/vertical/referent children via IfcRelNests
    // (issue #743).
    [
      WEBIFC.IFCRELREFERENCEDINSPATIALSTRUCTURE,
      { forRelated: "ReferencedInStructures", forRelating: "ReferencesElements" },
    ],
    [
      WEBIFC.IFCRELNESTS,
      { forRelated: "Nests", forRelating: "IsNestedBy" },
    ],
  ]);

  /**
   * @summary A map containing sets of IFC classes, categorized into 'elements' and 'abstract'.
   * @remarks The 'elements' category contains a set of IFC classes representing physical elements.
   * The 'abstract' category contains a set of abstract IFC classes, including materials, properties, classifications, etc.
   */
  classes = {
    elements: new DataSet<number>([...ifcClasses.elements]),
    abstract: new DataSet<number>([
      ...ifcClasses.base,
      ...ifcClasses.materials,
      ...ifcClasses.properties,
      ...ifcClasses.units,
      ...ifcClasses.types,
    ]),
  };

  /**
   * Whether to include unique attributes from the imported IFC data.
   */
  includeUniqueAttributes = false;

  /**
   * Whether to include relation names from the imported IFC data.
   */
  includeRelationNames = false;

  /**
   * Whether to replace the IfcBuildingStorey.Elevation with the absolute storey elevation.
   * @remarks The value is calculated taking into consideration the relative positions between entities
   * and it is always given in meters.
   */
  replaceStoreyElevation = true;

  /**
   * Whether to replace the IfcSite.RefElevation with the absolute site elevation.
   * @remarks The value is calculated taking into consideration the relative positions between entities
   * and it is always given in meters.
   */
  replaceSiteElevation = true;

  /**
   * Whether the generated materials should render both faces (double-sided)
   * instead of just the front face.
   * @remarks Some exporters (e.g. certain Revit pipelines) produce geometry
   * whose winding is not consistent, so front-face-only rendering can hide
   * those faces. Enable this to render both sides. Defaults to false
   * (front-face only) to match the previous behavior.
   */
  doubleSidedMaterials = false;

  /**
   * Whether to import each material's own property sets (`IfcMaterialProperties`
   * in IFC4, `IfcExtendedMaterialProperties` in IFC2X3).
   * @remarks Off by default to keep the output lean. These entities link to
   * their material through a direct `Material` attribute rather than an
   * `IfcRel*`, so when enabled the importer also synthesizes the inverse
   * `HasProperties` relation on the material, making the properties reachable as
   * element -> material -> material properties. See issue #249.
   */
  includeMaterialProperties = false;

  /**
   * If set, ignores the items that are further away to the origin than this value.
   * Keep in mind that if your IFC is correctly georreferenced, this value should never
   * be too high. If it's too high, it's either because your file uses absolute coordinates,
   * (which is a very bad idea, and usually due to a poor IFC export) or because there are
   * objects that are very, very far away (very unlikely).
   */
  distanceThreshold: number | null = 100000;

  /**
   * Largest `file` (in bytes) the parsing layer reads into memory rather than
   * a page at a time through the file reader. See {@link ProcessData.file}.
   */
  residentBudget = 1024 * 1024 * 1024;

  /** Numbers about the last {@link process} call. */
  stats: { projected: ProjectedReadStats | null } = { projected: null };

  private get builder() {
    if (!this._builder) {
      throw new Error("Fragments: Builder not initialized");
    }
    return this._builder;
  }

  /**
   * Processes IFC data and converts it into a fragments format.
   * @param data Configuration object for processing.
   * @param data.bytes Raw IFC file data as Uint8Array.
   * @param data.raw Whether to return raw uncompressed data. If false, the output fragments will be smaller.
   * @param data.readFromCallback Whether to read data from a callback function. Useful for node.js.
   * @param data.readCallback Callback function to read IFC data. Useful for node.js.
   * @param data.splits Write several models instead of one. Each is handed to `data.splits.onSplit`.
   * @returns The model, or with `data.splits` a manifest of the models written.
   */
  async process(
    input: ProcessData & { splits?: undefined },
  ): Promise<Uint8Array>;
  // eslint-disable-next-line no-dupe-class-members
  async process(
    input: ProcessData & { splits: NonNullable<ProcessData["splits"]> },
  ): Promise<IfcSplitManifest>;
  // eslint-disable-next-line no-dupe-class-members
  async process(input: ProcessData): Promise<Uint8Array | IfcSplitManifest>;
  // eslint-disable-next-line no-dupe-class-members
  async process(input: ProcessData) {
    // A `file` is read in place; everything downstream sees its reader.
    const data: ProcessData = input.file
      ? { ...input, source: input.source ?? new IfcBlobSource(input.file) }
      : input;

    const { splits } = data;
    if (splits && !data.geometryBatches) {
      throw new Error("Fragments: splits need geometryBatches");
    }
    const maxItems = splits?.geometry?.maxItems ?? 20_000;
    if (!Number.isInteger(maxItems) || maxItems < 1) {
      throw new RangeError(
        `Fragments: splits.geometry.maxItems must be a positive integer, received ${maxItems}`,
      );
    }

    const modelId = data.id ?? MathUtils.generateUUID();

    // Each split is handed out as soon as it is complete, and only what the
    // manifest says about it is kept.
    const written: { info: IfcSplitInfo; localIds: ArrayLike<number> }[] = [];
    const handOut = async ({
      id,
      kind,
      group,
      model,
      localIds,
    }: Pick<IfcSplitInfo, "id" | "kind" | "group"> & {
      model: Uint8Array;
      localIds: ArrayLike<number>;
    }) => {
      // `model` is the builder's own buffer, which the next split reuses
      const bytes = data.raw ? model.slice() : pako.deflate(model);
      const info: IfcSplitInfo = {
        id,
        kind,
        group,
        items: localIds.length,
        byteLength: bytes.length,
      };
      written.push({ info, localIds });
      await splits!.onSplit({ ...info, bytes });
    };

    this._builder = new fb.Builder(1024);

    // Opt-in material property sets (issue #249). Added here rather than in the
    // `classes` initializer so toggling the flag after construction still works.
    if (this.includeMaterialProperties) {
      for (const materialPropertyClass of ifcClasses.materialProperties) {
        this.classes.abstract.add(materialPropertyClass);
      }
    }

    // Get geometry

    // Geometry batches read the file through the parsing layer, so it is
    // indexed first; the property pass then reuses the same index.
    let lineApi: IfcResolverLineApi | undefined;
    let projected: ProjectedReadOptions | undefined;
    let executors: BatchExecutor[] = [];
    const batches = data.geometryBatches;
    if (batches) {
      lineApi = await this.index(data, 0, 0.1);
      const runnerOptions: BatchRunnerOptions = {
        wasm: this.wasm,
        loaderSettings: this.webIfcSettings,
        extractor: {
          geometryProcessSettings: this.geometryProcessSettings,
          distanceThreshold: this.distanceThreshold,
        },
      };
      const workers =
        batches.workers ??
        Math.max(1, (globalThis.navigator?.hardwareConcurrency ?? 4) - 1);
      executors = batches.createWorker
        ? Array.from(
            { length: workers },
            () => new WorkerBatchExecutor(batches.createWorker!(), runnerOptions),
          )
        : [new LocalBatchExecutor(runnerOptions)];
      projected = {
        resolver: lineApi.resolver,
        lines: lineApi,
        executors,
        batchBytes: batches.batchBytes ?? 32 * 1024 * 1024,
        batchElements: batches.batchElements ?? 2000,
        probeElements: batches.probeElements ?? 32,
        targetBatchMs: batches.targetBatchMs ?? 1000,
        coordinateToOrigin: this.webIfcSettings.COORDINATE_TO_ORIGIN === true,
      };
    }

    const geometryProcessor = new IfcGeometryProcessor(this);
    geometryProcessor.wasm = this.wasm;
    geometryProcessor.webIfcSettings = this.webIfcSettings;
    const geomData = {
      ...data,
      builder: this.builder,
      projected,
      geometrySplits: splits && {
        maxItems,
        maxBytes: splits.geometry?.maxBytes ?? 256 * 1024 * 1024,
        id: (index: number) => `${modelId}.g${index}`,
        onSplit: (split: {
          id: string;
          model: Uint8Array;
          localIds: Uint32Array;
        }) => handOut({ ...split, kind: "geometry", group: null }),
      },
    };

    const properties = new IfcPropertyProcessor(this, this.builder);
    properties.wasm = this.wasm;
    properties.webIfcSettings = this.webIfcSettings;

    // Grids and alignments come from the end of the geometry pass. With
    // splits they go to a model of their own right then: the viewer draws
    // them, so they should not wait for the data split, nor sit in it.
    const readGeometry = async () => {
      const read = await geometryProcessor.process(geomData);
      const { alignments, grids } = read;
      if (!splits || alignments.length + grids.length === 0) return read;
      const id = `${modelId}.r0`;
      const { model, localIds, maxLocalID } = writeReferenceSplit({
        alignments,
        grids,
        coordinates: read.coordinates,
        firstLocalId: read.maxLocalID + 1,
        guid: id,
      });
      await handOut({ id, kind: "reference", group: null, model, localIds });
      // what follows takes its ids from after theirs
      return { ...read, alignments: [], grids: [], maxLocalID: maxLocalID - 1 };
    };

    // With splits, properties go to a model of their own: this builder holds
    // the data split, and geometry writes to builders of its own.
    let geoms: Awaited<ReturnType<IfcGeometryProcessor["process"]>>;
    try {
      if (projected) {
        // Properties need nothing from geometry until they are laid out, so
        // with the geometry in workers they are read here meanwhile, handing
        // the thread back often enough to keep the workers fed.
        [geoms] = await Promise.all([
          readGeometry(),
          properties.prepare({
            ...data,
            lineApi,
            yieldEvery: 8,
            progressCallback: undefined,
          }),
        ]);
      } else {
        geoms = await readGeometry();
        // With a reader, properties come from the parsing layer: the file is
        // indexed once, now that web-ifc and its copy of the file are gone,
        // and entities are parsed from it on demand. Without one, the pass
        // opens the file in a second web-ifc instance, as it always has.
        if (!lineApi && data.source) lineApi = await this.index(data, 0.5, 0.6);
        await properties.prepare({ ...data, lineApi });
      }
    } finally {
      for (const executor of executors) executor.dispose();
    }
    this.stats = { projected: geometryProcessor.projectedStats };
    const { maxLocalID, localIDs, alignments, grids } = geoms;

    const propsData = await properties.finish({
      ...data,
      geometryProcessedLocalIDs: localIDs,
      alignments,
      grids,
      maxLocalID,
    });
    const {
      relIndicesVector,
      relsVector,
      guidsVector,
      guidsItemsVector,
      metadataOffset,
      localIdsVector,
      spatialStrutureOffset,
      attributesVector,
      categoriesVector,
      uniqueAttributesVector,
      relNamesVector,
      newMaxLocalID,
    } = propsData;

    // The data split has no geometry, but a model has a meshes table, and
    // the viewer aligns models by the coordinates in it.
    const modelMesh =
      geoms.modelMesh ??
      new MeshesWriter(this.builder, this.doubleSidedMaterials).finish(
        geoms.coordinates,
        maxLocalID,
      ).modelMesh;

    const guid = splits ? `${modelId}.d0` : modelId;
    const guidRef = this.builder.createString(guid);

    TFB.Model.startModel(this.builder);
    TFB.Model.addMeshes(this.builder, modelMesh);
    TFB.Model.addMetadata(this.builder, metadataOffset);
    TFB.Model.addAttributes(this.builder, attributesVector);
    TFB.Model.addUniqueAttributes(this.builder, uniqueAttributesVector);
    TFB.Model.addRelationNames(this.builder, relNamesVector);
    TFB.Model.addLocalIds(this.builder, localIdsVector);
    TFB.Model.addCategories(this.builder, categoriesVector);
    TFB.Model.addRelationsItems(this.builder, relIndicesVector);
    TFB.Model.addRelations(this.builder, relsVector);
    TFB.Model.addGuidsItems(this.builder, guidsItemsVector);
    TFB.Model.addGuids(this.builder, guidsVector);
    TFB.Model.addSpatialStructure(this.builder, spatialStrutureOffset);
    TFB.Model.addGuid(this.builder, guidRef);
    TFB.Model.addMaxLocalId(this.builder, newMaxLocalID);
    const outData = TFB.Model.endModel(this.builder);

    this.builder.finish(outData);
    const outBytes = this.builder.asUint8Array();

    if (splits) {
      await handOut({
        id: guid,
        kind: "data",
        group: splits.data?.group ?? "data",
        model: outBytes,
        localIds: propsData.localIds,
      });
      this.clean();
      data.progressCallback?.(1, { process: "conversion", state: "finish" });
      const manifest: IfcSplitManifest = {
        id: modelId,
        splits: written.map(({ info }) => info),
        index: buildSplitIndex(
          written.map(({ info, localIds }) => ({ kind: info.kind, localIds })),
        ),
      };
      return manifest;
    }

    this.clean();

    const content = data.raw ? outBytes : pako.deflate(outBytes);

    data.progressCallback?.(1, {
      process: "conversion",
      state: "finish",
    });

    return content;
  }

  /**
   * Adds all attributes to the classes. Use this with precaution because it can increase the size of the output fragments.
   */
  addAllAttributes() {
    for (const categoryString in ifcCategoryMap) {
      const category = parseInt(categoryString, 10);
      if (geometryTypes.has(category)) {
        continue;
      }
      this.classes.abstract.add(category);
    }
    this.attributesToExclude = new Set();
  }

  /**
   * Adds all relations to the relations map. Use this with precaution because it can increase the size of the output fragments.
   */
  addAllRelations() {
    this.relations = new Map(ifcRelationsMap);
  }

  /**
   * Index the file for the parsing layer, reporting progress from `from` to
   * `to`.
   *
   * The index is read from randomly — the property pass visits entities class
   * by class, and batches follow references — so a `file` that fits
   * {@link residentBudget} is read into memory once rather than a page at a
   * time.
   */
  private async index(data: ProcessData, from: number, to: number) {
    data.progressCallback?.(from, { process: "indexing", state: "start" });
    let source = data.source ?? (data.bytes && new IfcBytesSource(data.bytes));
    if (!source) throw new Error("Fragments: No data provided");
    if (data.file && data.file.size <= this.residentBudget) {
      source = await IfcChunkedBytesSource.read(data.file);
    }
    const resolver = await IfcEntityResolver.fromSource(source, {
      stream: source === data.source ? data.file?.stream() : undefined,
      onProgress: (scanned) =>
        data.progressCallback?.(from + ((to - from) * scanned) / source.size, {
          process: "indexing",
          state: "inProgress",
        }),
    });
    data.progressCallback?.(to, { process: "indexing", state: "finish" });
    return new IfcResolverLineApi(resolver);
  }

  private clean() {
    this._builder?.clear();
    this._builder = null;
  }
}

export * from "./src/types";
export { findItemSplits } from "./src/split-index";
