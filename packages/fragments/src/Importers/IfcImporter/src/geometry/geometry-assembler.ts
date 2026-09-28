import {
  ExtractedBatch,
  ExtractedElement,
  ExtractedGeometry,
  GeometryData,
  SHELL,
} from "./geometry-records";

export type IfcLocalTransform = {
  id: number;
  data: number[]; // [px, py, pz, dxx, dxy, dxz, dyx, dyy, dyz]
};

export type IfcGeometryInstance = {
  id: number;
  color: number[];
  localTransformID: number | null;
};

export type IfcElement = {
  id: number;
  guid: string;
  type: number;
  geometries: IfcGeometryInstance[];
};

export interface AssemblerCallbacks {
  onElementLoaded: (data: {
    element: IfcElement;
    position: number[];
    xDirection: number[];
    yDirection: number[];
  }) => void;
  onGeometryLoaded: (data: { id: number; geometry: GeometryData }) => void;
  onLocalTransformLoaded: (localTransform: IfcLocalTransform) => void;
}

// For each item:
// - use the position of the first geometry as the item position
// - for the rest of the geometries:
//   - if the geometry is new, apply a transformation to its vertices so that its local transform is 0
//   - if the geometry was previously found, check the local space to see if it needs a local transform, and return it if so

/**
 * The part of the geometry pass that depends on the elements before it:
 * deduplicates geometry and local transforms and hands out ids.
 *
 * Fed {@link ExtractedElement}s in processing order, it makes exactly the
 * decisions the single-pass reader made, in the same order — whichever worker
 * extracted them, and over whichever part of the file.
 */
export class IfcGeometryAssembler {
  /** Next free id for geometry that needs one of its own. */
  nextId: number;

  private _previousGeometries = new Map<string, number>();
  private _previousGeometriesIDs = new Map<number, number>();
  private _previousGeometriesScales = new Map<number, string>();
  private _previousLocalTransforms = new Map<string, IfcLocalTransform>();

  private _problematicGeometries = new Set<number>();
  private _problematicGeometriesHashes = new Set<string>();

  constructor(
    firstFreeId: number,
    private readonly _callbacks: AssemblerCallbacks,
  ) {
    this.nextId = firstFreeId;
    // First local transform is the no-transform
    // prettier-ignore
    _callbacks.onLocalTransformLoaded({
      id: 0,
      data: [0, 0, 0, 1, 0, 0, 0, 1, 0]
    });
  }

  /** Assemble a batch's elements, in order. */
  addBatch(batch: ExtractedBatch) {
    for (const element of batch.elements) this.add(element, batch);
  }

  /**
   * Assemble one element. Geometry it is the first to use is handed to
   * `onGeometryLoaded` and then dropped from `batch`, which only ever needs
   * it once.
   */
  add(extracted: ExtractedElement, batch: ExtractedBatch) {
    const element: IfcElement = {
      id: extracted.id,
      type: extracted.type,
      guid: extracted.guid,
      geometries: [],
    };
    for (const geometry of extracted.geometries) {
      if (geometry.kind === SHELL) this.addShell(element, geometry, batch);
      else this.addExtrusion(element, geometry, batch);
    }
    if (element.geometries.length > 0) {
      this._callbacks.onElementLoaded({
        element,
        position: extracted.position,
        xDirection: extracted.xDirection,
        yDirection: extracted.yDirection,
      });
    }
  }

  private addShell(
    element: IfcElement,
    extracted: ExtractedGeometry,
    batch: ExtractedBatch,
  ) {
    if (this._problematicGeometries.has(extracted.gid)) {
      console.log(`Fragments: Problematic geometry: ${extracted.gid}`);
      return;
    }

    const geometryData: IfcGeometryInstance = {
      id: extracted.gid,
      color: extracted.color,
      localTransformID: null,
    };

    element.geometries.push(geometryData);

    if (this._previousGeometriesIDs.has(geometryData.id)) {
      // This geometry was already computed according to the IFC
      // Just save its transform and ID and return

      // Some files have geometries with different scales
      // Fragments transforms dont have scale, so we have to consider them new geometries
      const previousScaleHash = this._previousGeometriesScales.get(
        geometryData.id,
      );
      if (previousScaleHash === extracted.scale) {
        this.addLocalTransform(extracted.local, geometryData);
        // We need to recover the ID, in case this geometry was previously deduplicated
        geometryData.id = this._previousGeometriesIDs.get(geometryData.id)!;
        return;
      }
      // This geometry has a different scale, so we need to consider it as a new geometry
      const newId = this.nextId++;
      this._previousGeometriesScales.set(newId, extracted.scale);
      geometryData.id = newId;
    }

    const { hash } = extracted;
    if (hash === undefined) {
      // Zero length geometry
      element.geometries.pop();
      this._problematicGeometries.add(geometryData.id);
      return;
    }

    if (this._problematicGeometriesHashes.has(hash)) {
      console.log(`Fragments: Problematic geometry: ${geometryData.id}`);
      element.geometries.pop();
      this._problematicGeometries.add(geometryData.id);
      this._problematicGeometriesHashes.add(hash);
      return;
    }

    const isNewGeometry = !this._previousGeometries.has(hash);

    const geomID = geometryData.id;

    if (isNewGeometry) {
      // New geometry: save its ID for future deduplication
      this._previousGeometries.set(hash, geomID);
      this._previousGeometriesIDs.set(geomID, geomID);
    } else {
      // When deduplicated, just use the previously found geometry id
      const previousGeometryID = this._previousGeometries.get(hash);
      if (previousGeometryID === undefined) {
        throw new Error("Fragments: Previous geometry not found");
      }

      this._previousGeometriesIDs.set(geomID, previousGeometryID);
      geometryData.id = previousGeometryID;
    }

    this.addLocalTransform(extracted.local, geometryData);

    // Only compute geometry data that hasn't been computed before
    if (!isNewGeometry) return;
    const shell =
      extracted.data === undefined || extracted.data === -1
        ? undefined
        : batch.shells[extracted.data];
    if (!shell) {
      console.log(`Fragments: Problematic geometry: ${geometryData.id}`);
      element.geometries.pop();
      this._problematicGeometries.add(geometryData.id);
      this._problematicGeometriesHashes.add(hash);
      return;
    }
    batch.shells[extracted.data!] = undefined;
    this._callbacks.onGeometryLoaded({ id: geometryData.id, geometry: shell });
  }

  private addExtrusion(
    element: IfcElement,
    extracted: ExtractedGeometry,
    batch: ExtractedBatch,
  ) {
    const geometryData: IfcGeometryInstance = {
      id: extracted.gid,
      color: extracted.color,
      localTransformID: null,
    };

    element.geometries.push(geometryData);

    if (this._previousGeometriesIDs.has(geometryData.id)) {
      // This geometry was already computed according to the IFC
      // Just save its transform and ID and return
      this.addLocalTransform(extracted.local, geometryData);
      // We need to recover the ID, in case this geometry was previously deduplicated
      geometryData.id = this._previousGeometriesIDs.get(geometryData.id)!;
      return;
    }

    this.addLocalTransform(extracted.local, geometryData);

    const extrusion =
      extracted.data === undefined || extracted.data === -1
        ? undefined
        : batch.extrusions[extracted.data];
    if (!extrusion) {
      // Zero length geometry
      element.geometries.pop();
      this._problematicGeometries.add(geometryData.id);
      return;
    }
    batch.extrusions[extracted.data!] = undefined;

    this._previousGeometriesIDs.set(geometryData.id, geometryData.id);
    this._callbacks.onGeometryLoaded({
      id: geometryData.id,
      geometry: extrusion,
    });
  }

  private addLocalTransform(
    local: number[] | null,
    geometryData: IfcGeometryInstance,
  ) {
    if (local === null) return;
    // Deduplicate local transforms for smaller files
    const [px, py, pz, dxx, dxy, dxz, dyx, dyy, dyz] = local;
    const hash = `${px}-${py}-${pz}-${dxx}-${dxy}-${dxz}-${dyx}-${dyy}-${dyz}`;

    const previousLocalTransform = this._previousLocalTransforms.get(hash);

    if (previousLocalTransform) {
      geometryData.localTransformID = previousLocalTransform.id;
    } else {
      // We add 1 because the local transform 0 is the no-transform
      const id = this._previousLocalTransforms.size + 1;
      const localTransform: IfcLocalTransform = { id, data: local };

      this._previousLocalTransforms.set(hash, localTransform);
      geometryData.localTransformID = localTransform.id;

      this._callbacks.onLocalTransformLoaded(localTransform);
    }
  }
}
