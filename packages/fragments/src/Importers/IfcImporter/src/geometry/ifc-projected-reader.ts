import { AlignmentData, GridData } from "../../../../FragmentsModels";
import { ifcCategoryMap } from "../../../../Utils";
import type { IfcEntityResolver } from "../../../../Utils/ifc-resolver";
import type { IfcLineApi } from "../../../../Utils/ifc-line-api";
import { IfcImporter } from "../..";
import { ProcessData } from "../types";
import {
  IfcElement,
  IfcGeometryAssembler,
  IfcLocalTransform,
} from "./geometry-assembler";
import {
  BatchExecutor,
  BatchRequest,
  BatchResult,
  isIdentity,
} from "./geometry-batch";
import { GeometryData } from "./geometry-records";
import { GridReader } from "./grid-reader";
import {
  decomposeCoordinates,
  elementClasses,
  TransformData,
} from "./ifc-file-reader";
import { IfcProjector, ProjectedGroup } from "./ifc-projector";

export interface ProjectedReadOptions {
  resolver: IfcEntityResolver;
  lines: IfcLineApi;
  executors: BatchExecutor[];
  /** Largest projection, in bytes of IFC. */
  batchBytes: number;
  /** Most elements per projection. */
  batchElements: number;
  /** Elements in the first projection, which fixes the origin alone. */
  probeElements: number;
  coordinateToOrigin: boolean;
}

/** Numbers about a projected read, for measuring it. */
export interface ProjectedReadStats {
  batches: number;
  projectedBytes: number;
  largestProjection: number;
  largestWasmHeap: number;
  planningMs: number;
}

/**
 * Reads a file's geometry as many small projections instead of one model.
 * Each projection holds only what its elements' geometry reads, so a batch
 * costs web-ifc memory in proportion to the batch, not the file, and batches
 * run in parallel on as many executors as are given. Results are assembled in
 * batch order, which is processing order, so the output is the one a single
 * pass would produce.
 */
export class IfcProjectedReader {
  private _gridReader = new GridReader();

  stats: ProjectedReadStats = {
    batches: 0,
    projectedBytes: 0,
    largestProjection: 0,
    largestWasmHeap: 0,
    planningMs: 0,
  };

  constructor(private _serializer: IfcImporter) {}

  onElementLoaded: (data: {
    element: IfcElement;
    position: number[];
    xDirection: number[];
    yDirection: number[];
  }) => void = () => {};

  onGeometryLoaded: (data: { id: number; geometry: GeometryData }) => void =
    () => {};

  onLocalTransformLoaded: (localTransform: IfcLocalTransform) => void =
    () => {};

  onNextIdFound: (maxId: number) => void = () => {};

  onCoordinatesLoaded: (data: TransformData) => void = () => {};

  onAlignmentsLoaded: (data: AlignmentData[]) => void = () => {};

  onGridsLoaded: (data: GridData[]) => void = () => {};

  async load(data: ProcessData, options: ProjectedReadOptions) {
    const { resolver, lines, executors } = options;
    if (
      this._serializer.geometryProcessSettings
        .processIfcRelSpaceBoundarySecondLevel
    ) {
      throw new Error(
        "Fragments: space boundaries need the whole model; convert without geometry batches",
      );
    }

    data.progressCallback?.(0, { process: "geometries", state: "start" });

    const assembler = new IfcGeometryAssembler(resolver.index.maxId + 1, {
      onElementLoaded: (element) => this.onElementLoaded(element),
      onGeometryLoaded: (geometry) => this.onGeometryLoaded(geometry),
      onLocalTransformLoaded: (transform) =>
        this.onLocalTransformLoaded(transform),
    });

    // Processing order: the one a single pass uses, element by element
    const order: [category: number, id: number][] = [];
    for (const category of elementClasses(
      lines.GetAllTypesOfModel(0).map(({ typeID }) => typeID),
      this._serializer.classes.elements,
    )) {
      for (const id of lines.GetLineIDsWithType(0, category)) {
        order.push([category, id]);
      }
    }

    const planStart = performance.now();
    const projector = new IfcProjector(resolver);
    this.stats.planningMs += performance.now() - planStart;

    let next = 0;
    let batchCount = 0;
    // elements per batch, for progress by what has been assembled
    const batchSizes: number[] = [];
    let assembledElements = 0;
    const plan = (
      maxElements: number,
      origin: BatchRequest["origin"],
    ): BatchRequest | null => {
      if (next >= order.length) return null;
      const start = performance.now();
      projector.begin();
      if (typeof origin === "number") projector.addElement(origin);
      const groups: ProjectedGroup[] = [];
      let count = 0;
      while (
        next < order.length &&
        count < maxElements &&
        (count === 0 || projector.size < options.batchBytes)
      ) {
        const [category, id] = order[next++];
        let group = groups[groups.length - 1];
        if (!group || group.category !== category) {
          group = { category, ids: [] };
          groups.push(group);
        }
        group.ids.push(id);
        projector.addElement(id);
        count++;
      }
      const projection = projector.finish(groups);
      batchSizes.push(count);
      this.stats.planningMs += performance.now() - start;
      this.stats.projectedBytes += projection.bytes.length;
      this.stats.largestProjection = Math.max(
        this.stats.largestProjection,
        projection.bytes.length,
      );
      return {
        index: batchCount++,
        projection: projection.bytes,
        groups,
        origin,
      };
    };

    // --- the origin ----------------------------------------------------------
    // A single pass takes its origin from the first geometry it meets. So the
    // first elements go alone, and report which of them set it; every batch
    // after them meets that element first, and so derives the same origin.
    let origin: BatchRequest["origin"] | null = options.coordinateToOrigin
      ? null
      : "none";
    let coordinatesReported = false;
    let meshesDone = 0;

    const consume = (result: BatchResult) => {
      this.stats.largestWasmHeap = Math.max(
        this.stats.largestWasmHeap,
        result.wasmHeap,
      );
      if (result.meshCount > 0 && !coordinatesReported) {
        this.onCoordinatesLoaded(decomposeCoordinates(result.coordination));
        coordinatesReported = true;
      }
      assembler.addBatch(result.batch);
      meshesDone += result.batch.elements.length;
      assembledElements += batchSizes[result.index] ?? 0;
      const last = result.batch.elements[result.batch.elements.length - 1];
      const fraction = assembledElements / Math.max(order.length, 1);
      data.progressCallback?.(0.1 + 0.4 * fraction, {
        process: "geometries",
        state: "inProgress",
        class: last ? ifcCategoryMap[last.type] : undefined,
        entitiesProcessed: meshesDone,
      });
    };

    let coordination: number[] | null = null;
    while (origin === null) {
      const probe = plan(options.probeElements, "probe");
      if (!probe) break;
      const result = await executors[0].run(probe);
      consume(result);
      if (result.primer !== undefined) {
        origin = result.primer;
        coordination = result.coordination;
      } else if (result.meshCount > 0 && isIdentity(result.coordination)) {
        // Meshes met, and the origin they set is the identity: the model
        // already sits on the origin, and moving it by nothing is exact.
        origin = "none";
      }
    }
    const batchOrigin = origin ?? "none";
    const gridCoordination =
      coordination ?? [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

    // --- the rest, in parallel, assembled in order ---------------------------
    const results = new Map<number, BatchResult>();
    let nextToAssemble = batchCount;
    const drain = () => {
      while (results.has(nextToAssemble)) {
        const result = results.get(nextToAssemble)!;
        results.delete(nextToAssemble++);
        consume(result);
      }
    };

    const work = async (executor: BatchExecutor) => {
      for (;;) {
        const request = plan(options.batchElements, batchOrigin);
        if (!request) return;
        const result = await executor.run(request);
        results.set(result.index, result);
        drain();
      }
    };
    await Promise.all(executors.map(work));
    drain();
    this.stats.batches = batchCount;

    // --- what is not per element ---------------------------------------------
    let alignments: AlignmentData[] = [];
    if (projector.hasAlignments) {
      projector.begin();
      if (typeof batchOrigin === "number") projector.addElement(batchOrigin);
      projector.addAlignments();
      const request: BatchRequest = {
        index: batchCount,
        projection: projector.finish([]).bytes,
        groups: [],
        origin: batchOrigin,
        alignments: true,
      };
      alignments = (await executors[0].run(request)).alignments ?? [];
    }
    this.onAlignmentsLoaded(alignments);

    this.onGridsLoaded(this._gridReader.read(lines, gridCoordination));

    this.onNextIdFound(assembler.nextId);
  }
}
