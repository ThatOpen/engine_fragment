import * as WEBIFC from "web-ifc";
import * as THREE from "three";
import { ifcCategoryMap, GeomsFbUtils } from "../../../../Utils";

import { CivilReader } from "./ifc/civil-reader";
import { AlignmentData, GridData } from "../../../../FragmentsModels";
import { IfcImporter } from "../..";
import { ProcessData } from "../types";
import { GridReader } from "./grid-reader";
import { SpaceBoundaryReader } from "./space-boundary-reader";
import { Hasher } from "./geometry-hash";
import { IfcGeometryExtractor } from "./geometry-extractor";
import {
  IfcElement,
  IfcGeometryAssembler,
  IfcLocalTransform,
} from "./geometry-assembler";
import { GeometryData } from "./geometry-records";

export type {
  CircleExtrusionData,
  EncodedShell,
  GeometryData,
} from "./geometry-records";
export type {
  IfcElement,
  IfcGeometryInstance,
  IfcLocalTransform,
} from "./geometry-assembler";

export type TransformData = {
  dxx: number;
  dxy: number;
  dxz: number;
  dyx: number;
  dyy: number;
  dyz: number;
  px: number;
  py: number;
  pz: number;
};

/** web-ifc's typings leave out `delete`, which every embind handle has. */
type EmbindHandle = { delete(): void };

/** Rounds a coordination matrix the way the importer stores it. */
export function decomposeCoordinates(matrix: number[]): TransformData {
  const { elements } = new THREE.Matrix4().fromArray(matrix);
  const p = 1000;
  const ap = 100000;
  return {
    dxx: GeomsFbUtils.round(elements[0], p),
    dxy: GeomsFbUtils.round(elements[1], p),
    dxz: GeomsFbUtils.round(elements[2], p),
    dyx: GeomsFbUtils.round(elements[4], ap),
    dyy: GeomsFbUtils.round(elements[5], ap),
    dyz: GeomsFbUtils.round(elements[6], ap),
    px: GeomsFbUtils.round(elements[12], ap),
    py: GeomsFbUtils.round(elements[13], ap),
    pz: GeomsFbUtils.round(elements[14], ap),
  };
}

/**
 * Reads the geometry of a whole IFC file in one web-ifc model: extraction
 * and assembly run back to back on each element as web-ifc streams it.
 */
export class IfcFileReader {
  wasm = {
    path: "../../../../node_modules/web-ifc/",
    absolute: false,
  };

  webIfcSettings: WEBIFC.LoaderSettings = {};

  private _civilReader = new CivilReader();
  private _gridReader = new GridReader();
  private _spaceBoundaryReader = new SpaceBoundaryReader();

  scene: THREE.Scene | null = null;

  isolatedMeshes: Set<number> | null = null;

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

  async load(data: ProcessData) {
    data.progressCallback?.(0, {
      process: "conversion",
      state: "start",
    });
    data.progressCallback?.(0, { process: "opening", state: "start" });

    const ifcAPI = new WEBIFC.IfcAPI();
    ifcAPI.SetWasmPath(this.wasm.path, this.wasm.absolute);
    const [, hasher] = await Promise.all([ifcAPI.Init(), Hasher.init()]);

    let modelID = 0;

    if (data.source) {
      const { source } = data;
      modelID = ifcAPI.OpenModelFromCallback(
        (offset, size) => source.read(offset, size),
        this.webIfcSettings,
      );
    } else if (data.readFromCallback && data.readCallback) {
      modelID = ifcAPI.OpenModelFromCallback(
        data.readCallback,
        this.webIfcSettings,
      );
    } else if (data.bytes) {
      modelID = await ifcAPI.OpenModel(data.bytes, this.webIfcSettings);
    } else {
      throw new Error("Fragments: No data provided");
    }

    ifcAPI.SetLogLevel(WEBIFC.LogLevel.LOG_LEVEL_OFF);

    const assembler = new IfcGeometryAssembler(
      ifcAPI.GetMaxExpressID(modelID) + 1,
      {
        onElementLoaded: (element) => this.onElementLoaded(element),
        onGeometryLoaded: (geometry) => this.onGeometryLoaded(geometry),
        onLocalTransformLoaded: (transform) =>
          this.onLocalTransformLoaded(transform),
      },
    );
    const extractor = new IfcGeometryExtractor({
      api: ifcAPI,
      modelID,
      hasher,
      options: {
        geometryProcessSettings: this._serializer.geometryProcessSettings,
        distanceThreshold: this._serializer.distanceThreshold,
      },
      known: assembler.known,
    });

    let coordinatesInitialized = false;
    let currentCategory = 0;

    // Progress within a category, not only between them: a model whose
    // elements are nearly all one class would otherwise sit at 0% for the
    // whole geometry pass.
    let meshesTotal = 0;
    let meshesDone = 0;
    let lastReport = performance.now();
    const reportEvery = 250; // ms

    const processMesh = (mesh: WEBIFC.FlatMesh) => {
      meshesDone++;
      if (
        data.progressCallback &&
        meshesTotal > 0 &&
        performance.now() - lastReport > reportEvery
      ) {
        lastReport = performance.now();
        data.progressCallback((0.5 * meshesDone) / meshesTotal, {
          process: "geometries",
          state: "inProgress",
          class: ifcCategoryMap[currentCategory],
          entitiesProcessed: meshesDone,
        });
      }

      if (!coordinatesInitialized) {
        const coordinates = ifcAPI.GetCoordinationMatrix(modelID);
        this.onCoordinatesLoaded(decomposeCoordinates(coordinates));
        coordinatesInitialized = true;
      }

      if (extractor.extract(mesh, currentCategory)) {
        // One element at a time, so every geometry it is the first to use
        // goes straight to the builder instead of piling up in a batch.
        assembler.addBatch(extractor.takeBatch());
      }
    };

    // `mesh.geometries` is an embind handle to a heap copy with no finalizer:
    // left alone, every element leaks a few hundred bytes of WASM memory.
    const callback = (mesh: WEBIFC.FlatMesh) => {
      try {
        processMesh(mesh);
      } finally {
        (mesh.geometries as unknown as EmbindHandle).delete();
      }
    };

    if (this.isolatedMeshes?.size) {
      ifcAPI.StreamMeshes(modelID, Array.from(this.isolatedMeshes), callback);
    } else {
      const toProcess = elementClasses(
        ifcAPI.GetAllTypesOfModel(modelID).map((entry) => entry.typeID),
        this._serializer.classes.elements,
      );

      const idsByCategory = toProcess.map((category) => {
        const idsVector = ifcAPI.GetLineIDsWithType(modelID, category);
        const ids: number[] = [];
        for (let i = 0; i < idsVector.size(); i++) {
          ids.push(idsVector.get(i));
        }
        (idsVector as unknown as EmbindHandle).delete();
        meshesTotal += ids.length;
        return ids;
      });

      data.progressCallback?.(0, { process: "geometries", state: "start" });
      for (const [index, category] of toProcess.entries()) {
        currentCategory = category;
        const state = (() => {
          if (index === 0) return "start";
          if (index + 1 === toProcess.length) return "finish";
          return "inProgress";
        })();
        const ids = idsByCategory[index];
        if (ids.length > 0) {
          ifcAPI.StreamMeshes(modelID, ids, callback);
          data.progressCallback?.((0.5 * meshesDone) / meshesTotal, {
            process: "geometries",
            state,
            class: ifcCategoryMap[category],
            entitiesProcessed: ids.length,
          });
        }
      }
    }

    const alignments = this._civilReader.read(ifcAPI);
    this.onAlignmentsLoaded(alignments);

    const grids = this._gridReader.read(
      ifcAPI,
      ifcAPI.GetCoordinationMatrix(0),
    );
    this.onGridsLoaded(grids);

    if (
      this._serializer.geometryProcessSettings
        .processIfcRelSpaceBoundarySecondLevel
    ) {
      this._spaceBoundaryReader.read(
        ifcAPI,
        this._serializer,
        (data) => this.onGeometryLoaded(data),
        (data) => this.onElementLoaded(data),
        () => assembler.nextId++,
      );
    }

    this.onNextIdFound(assembler.nextId);

    // Dropping the instance is what releases its WASM memory, which never
    // shrinks while the module lives.
    ifcAPI.Dispose();
  }
}

/**
 * The classes whose elements get geometry, in the order they are processed:
 * ascending type code, as `GetAllTypesOfModel` lists them, with annotations
 * last.
 */
export function elementClasses(
  modelClasses: number[],
  elements: { has(type: number): boolean },
) {
  const toProcess = modelClasses.filter((type) => elements.has(type));

  // Force ifc annotations to be processed last because
  // they can cause some problems with coordination matrix
  // e.g. when there is an annotation at the 0,0
  if (toProcess.includes(WEBIFC.IFCANNOTATION)) {
    toProcess.splice(toProcess.indexOf(WEBIFC.IFCANNOTATION), 1);
    toProcess.push(WEBIFC.IFCANNOTATION);
  }
  return toProcess;
}
