import * as WEBIFC from "web-ifc";
import * as THREE from "three";
import { ShellData, ifcCategoryMap, GeomsFbUtils } from "../../../../Utils";

import * as TFB from "../../../../Schema";

import { CivilReader } from "./ifc/civil-reader";
import { AlignmentData } from "../../../../FragmentsModels";
import { IfcImporter } from "../..";
import { ProcessData } from "../types";

export type CircleExtrusionData = {
  type: TFB.RepresentationClass.CIRCLE_EXTRUSION;
  indicesArray: number[];
  typesArray: number[];
  circleCurveData: number[][];
  segments: number[][];
  radius: number;
  bbox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
};

export type GeometryData = ShellData | CircleExtrusionData;

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

// For each item:
// - use the position of the first geometry as the item position
// - for the rest of the geometries:
//   - if the geometry is new, apply a transformation to its vertices so that its local transform is 0
//   - if the geometry was previously found, check the local space to see if it needs a local transform, and return it if so

export class IfcFileReader {
  private _ifcAPI: WEBIFC.IfcAPI | null = null;
  wasm = {
    path: "../../../../node_modules/web-ifc/",
    absolute: false,
  };

  webIfcSettings: WEBIFC.LoaderSettings = {};

  private _tempObject1 = new THREE.Object3D();
  private _tempObject2 = new THREE.Object3D();
  private _tempMatrix1 = new THREE.Matrix4();

  private _previousGeometries = new Map<string, number>();
  private _previousGeometriesIDs = new Map<number, number>();
  private _previousGeometriesScales = new Map<number, string>();
  private _previousLocalTransforms = new Map<string, IfcLocalTransform>();

  private _problematicGeometries = new Set<number>();
  private _problematicGeometriesHashes = new Set<string>();

  private _coordinatesInitialized = false;

  private _civilReader = new CivilReader();

  private _nextId = 0;

  private _rawCategories = new Set<number>([
    WEBIFC.IFCEARTHWORKSFILL,
    WEBIFC.IFCEARTHWORKSCUT,
  ]);

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

  async load(data: ProcessData) {
    data.progressCallback?.(0, {
      process: "conversion",
      state: "start",
    });

    this._previousGeometriesIDs.clear();

    this._ifcAPI = new WEBIFC.IfcAPI();
    this._ifcAPI.SetWasmPath(this.wasm.path, this.wasm.absolute);
    await this._ifcAPI.Init();

    let modelID = 0;

    if (data.readFromCallback && data.readCallback) {
      modelID = this._ifcAPI.OpenModelFromCallback(
        data.readCallback,
        this.webIfcSettings,
      );
    } else if (data.bytes) {
      modelID = await this._ifcAPI.OpenModel(data.bytes, this.webIfcSettings);
    } else {
      throw new Error("Fragments: No data provided");
    }

    this._ifcAPI.SetLogLevel(WEBIFC.LogLevel.LOG_LEVEL_OFF);

    this._nextId = this._ifcAPI.GetMaxExpressID(modelID) + 1;

    // First local transform is the no-transform

    // prettier-ignore
    this.onLocalTransformLoaded({
      id: 0,
      data: [0, 0, 0, 1, 0, 0, 0, 1, 0]
    });

    const tempPosition = new THREE.Vector3();

    const callback = (mesh: WEBIFC.FlatMesh) => {
      if (this._ifcAPI === null) {
        throw new Error("Fragments: IfcAPI not initialized");
      }

      if (!this._coordinatesInitialized) {
        const coordinates = this._ifcAPI.GetCoordinationMatrix(modelID);
        this._tempMatrix1.fromArray(coordinates);
        const coordinatesData = this.decompose(this._tempMatrix1);
        this.onCoordinatesLoaded(coordinatesData);
        this._coordinatesInitialized = true;
      }

      const properties = this._ifcAPI.GetLine(0, mesh.expressID);

      const element: IfcElement = {
        id: mesh.expressID,
        type: properties.type,
        guid: properties.GlobalId.value,
        geometries: [],
      };

      const geometryCount = mesh.geometries.size();

      // Use the position of the first geometry as the entity position
      const firstGeometryRef = mesh.geometries.get(0);
      const transformArray = firstGeometryRef.flatTransformation;
      const { transformWithoutScale } = this.removeScale(transformArray);

      // Check that the object is not too far away
      const distanceThreshold = this._serializer.distanceThreshold;
      if (distanceThreshold !== null) {
        tempPosition.set(0, 0, 0);
        tempPosition.applyMatrix4(transformWithoutScale);
        if (
          tempPosition.x > distanceThreshold ||
          tempPosition.y > distanceThreshold ||
          tempPosition.z > distanceThreshold
        ) {
          console.log(
            `Object ${element.id} is more than ${distanceThreshold} meters away from the origin and will be skipped.`,
          );
          return;
        }
      }

      for (let i = 0; i < geometryCount; i++) {
        if (element.type === WEBIFC.IFCREINFORCINGBAR) {
          this.loadCircleExtrusionGeometry(
            modelID,
            element,
            mesh,
            i,
            transformWithoutScale.elements,
          );
        } else {
          this.loadShellGeometry(
            modelID,
            element,
            mesh,
            i,
            transformWithoutScale.elements,
          );
        }
      }

      const { dxx, dxy, dxz, dyx, dyy, dyz, px, py, pz } = this.decompose(
        transformWithoutScale,
      );

      if (element.geometries.length > 0) {
        this.onElementLoaded({
          element,
          position: [px, py, pz],
          xDirection: [dxx, dxy, dxz],
          yDirection: [dyx, dyy, dyz],
        });
      }
    };

    if (this.isolatedMeshes?.size) {
      this._ifcAPI.StreamMeshes(
        modelID,
        Array.from(this.isolatedMeshes),
        callback,
      );
    } else {
      const modelClasses = this._ifcAPI
        .GetAllTypesOfModel(modelID)
        .map((entry) => entry.typeID);

      const toProcess = modelClasses.filter((type) =>
        this._serializer.classes.elements.has(type),
      );

      // Force ifc annotations to be processed last because
      // they can cause some problems with coordination matrix
      // e.g. when there is an annotation at the 0,0
      if (toProcess.includes(WEBIFC.IFCANNOTATION)) {
        toProcess.splice(toProcess.indexOf(WEBIFC.IFCANNOTATION), 1);
        toProcess.push(WEBIFC.IFCANNOTATION);
      }

      const categoryPercentage = 0.5 / toProcess.length;
      for (const [index, category] of toProcess.entries()) {
        const state = (() => {
          if (index === 0) return "start";
          if (index + 1 === toProcess.length) return "finish";
          return "inProgress";
        })();
        const idsVector = this._ifcAPI.GetLineIDsWithType(modelID, category);
        const ids: number[] = [];
        for (let i = 0; i < idsVector.size(); i++) {
          ids.push(idsVector.get(i));
        }
        if (ids.length > 0) {
          this._ifcAPI.StreamMeshes(modelID, ids, callback);
          data.progressCallback?.(categoryPercentage * (index + 1), {
            process: "geometries",
            state,
            class: ifcCategoryMap[category],
            entitiesProcessed: ids.length,
          });
        }
      }
    }

    const alignments = this._civilReader.read(this._ifcAPI);
    this.onAlignmentsLoaded(alignments);

    this.onNextIdFound(this._nextId);

    this._ifcAPI.Dispose();
    this._ifcAPI = null;
    this._ifcAPI = new WEBIFC.IfcAPI();
    this._ifcAPI.SetWasmPath(this.wasm.path, this.wasm.absolute);
    await this._ifcAPI.Init();

    this._previousGeometries.clear();
    this._previousGeometriesIDs.clear();
    this._previousGeometriesScales.clear();
    this._nextId = 0;
    this._previousLocalTransforms.clear();
    this._problematicGeometries.clear();
    this._problematicGeometriesHashes.clear();
  }

  private loadCircleExtrusionGeometry(
    modelID: number,
    element: IfcElement,
    mesh: WEBIFC.FlatMesh,
    geometryIndex: number,
    elementTransform: number[],
  ) {
    if (this._ifcAPI === null) {
      throw new Error("Fragments: IfcAPI not initialized");
    }

    const geometryRef = mesh.geometries.get(geometryIndex);

    // We need to get the units here because each geometry can have different units
    const transformArray = geometryRef.flatTransformation;
    const { units } = this.removeScale(transformArray);

    const { x, y, z, w } = geometryRef.color;

    const geometryData: IfcGeometryInstance = {
      id: geometryRef.geometryExpressID,
      color: [x, y, z, w],
      localTransformID: null,
    };

    element.geometries.push(geometryData);

    const { transformWithoutScale } = this.removeScale(
      geometryRef.flatTransformation,
    );

    if (this._previousGeometriesIDs.has(geometryData.id)) {
      // This geometry was already computed according to the IFC
      // Just save its transform and ID and return

      this.getLocalTransform(
        elementTransform,
        transformWithoutScale,
        geometryData,
      );

      // We need to recover the ID, in case this geometry was previously deduplicated
      geometryData.id = this._previousGeometriesIDs.get(geometryData.id)!;
      return;
    }

    this.getLocalTransform(
      elementTransform,
      transformWithoutScale,
      geometryData,
    );

    const geometry = this._ifcAPI.GetGeometry(modelID, geometryData.id);

    // @ts-ignore
    const circleExtrusion = geometry.GetSweptDiskSolid();

    const circleCurves: number[][] = [];
    const axisPoints: any[][] = [];

    // @ts-ignore
    const axisSize = circleExtrusion.axis.size();

    for (let i = 0; i < axisSize; i++) {
      // @ts-ignore
      const axis = circleExtrusion.axis.get(i);

      const circleCurveTemp: number[] = [];
      for (let j = 0; j < axis.arcSegments.size(); j++) {
        circleCurveTemp.push(axis.arcSegments.get(j));
      }
      circleCurves.push(circleCurveTemp);
      const axisTemp: any[] = [];
      for (let j = 0; j < axis.points.size(); j++) {
        const p = axis.points.get(j);
        axisTemp.push({ x: p.x * units.x, y: p.y * units.y, z: p.z * units.z });
      }
      axisPoints.push(axisTemp);
    }

    // Now we create serialized circle curve data

    const indicesArray: number[] = [];
    const typesArray: number[] = [];
    const segments: number[][] = [];
    const circleCurveData: number[][] = [];

    for (let i = 0; i < axisPoints.length; i++) {
      const axisPointsList: any[] = axisPoints[i];
      const curves: number[] = circleCurves[i];
      const pointsSize = axisPointsList.length;
      for (let j = 0; j < pointsSize - 1; j++) {
        let startCircleCurve = -1;
        let endCircleCurve = -1;
        for (let k = 0; k < curves.length; k += 2) {
          if (curves[k] === j) {
            startCircleCurve = j;
            endCircleCurve = curves[k + 1];
            break;
          }
        }
        if (startCircleCurve === -1) {
          const newSegment: number[] = [];
          const currentPoint = axisPointsList[j];
          const nextPoint = axisPointsList[j + 1];
          const currentX = currentPoint.x;
          const currentY = currentPoint.y;
          const currentZ = currentPoint.z;
          const nextX = nextPoint.x;
          const nextY = nextPoint.y;
          const nextZ = nextPoint.z;
          indicesArray.push(segments.length);
          newSegment.push(currentX, currentY, currentZ, nextX, nextY, nextZ);
          segments.push(newSegment);
          typesArray.push(TFB.AxisPartClass.WIRE);
        } else {
          const newCircleCurve: number[] = [];
          const firstPointIndex = startCircleCurve;
          const midPointIndex = Math.round(
            (startCircleCurve + endCircleCurve) / 2,
          );
          const lastPointIndex = endCircleCurve;
          const point1 = axisPointsList[firstPointIndex];
          const point2 = axisPointsList[midPointIndex];
          const point3 = axisPointsList[lastPointIndex];
          const circleCurveProperties = this.computeCircleCurveProperties(
            point1,
            point2,
            point3,
          );
          const dx = point1.x - circleCurveProperties.center.x;
          const dy = point1.y - circleCurveProperties.center.y;
          const dz = point1.z - circleCurveProperties.center.z;
          let dd = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dd === 0) {
            dd = 1;
          }
          const dx1 = dx / dd;
          const dy1 = dy / dd;
          const dz1 = dz / dd;
          const dxb = point2.x - circleCurveProperties.center.x;
          const dyb = point2.y - circleCurveProperties.center.y;
          const dzb = point2.z - circleCurveProperties.center.z;
          let dd2 = Math.sqrt(dxb * dxb + dyb * dyb + dzb * dzb);
          if (dd2 === 0) {
            dd2 = 1;
          }
          const dx2 = dxb / dd2;
          const dy2 = dyb / dd2;
          const dz2 = dzb / dd2;
          let v3 = this.crossProduct(
            { x: dx1, y: dy1, z: dz1 },
            { x: dx2, y: dy2, z: dz2 },
          );
          dd = Math.sqrt(v3.x * v3.x + v3.y * v3.y + v3.z * v3.z);
          if (dd === 0) {
            dd = 1;
          }
          v3 = { x: v3.x / dd, y: v3.y / dd, z: v3.z / dd };
          indicesArray.push(circleCurveData.length);
          newCircleCurve.push(
            circleCurveProperties.center.x,
            circleCurveProperties.center.y,
            circleCurveProperties.center.z,
            circleCurveProperties.radius,
            circleCurveProperties.angle,
            dx1,
            dy1,
            dz1,
            v3.x,
            v3.y,
            v3.z,
          );
          circleCurveData.push(newCircleCurve);
          typesArray.push(TFB.AxisPartClass.CIRCLE_CURVE);
          j = lastPointIndex - 1;
        }
      }
    }

    // TODO: Deduplicate the bars with a geometry hash, like with shells

    const buffers = this.getGeometryBuffers(modelID, geometryRef);
    if (buffers === null) {
      console.log(`Zero length geometry: ${geometryData.id}`);
      element.geometries.pop();
      this._problematicGeometries.add(geometryData.id);
      return;
    }

    const { position } = buffers;

    for (let i = 0; i < position.length - 2; i += 3) {
      position[i] *= units.x;
      position[i + 1] *= units.y;
      position[i + 2] *= units.z;
    }

    const bbox = GeomsFbUtils.getAABB(position);

    // TODO: This might fail? What units should we use?
    const radius = circleExtrusion.profileRadius * units.x;

    this._previousGeometriesIDs.set(geometryData.id, geometryData.id);

    this.onGeometryLoaded({
      id: geometryData.id,
      geometry: {
        type: TFB.RepresentationClass.CIRCLE_EXTRUSION,
        indicesArray,
        typesArray,
        segments,
        circleCurveData,
        radius,
        bbox,
      },
    });

    geometry.delete();
  }

  private loadShellGeometry(
    modelID: number,
    element: IfcElement,
    mesh: WEBIFC.FlatMesh,
    geometryIndex: number,
    elementTransform: number[],
  ) {
    if (this._ifcAPI === null) {
      throw new Error("Fragments: IfcAPI not initialized");
    }

    // First, let's get the geometry data from web-ifc

    const geometryRef = mesh.geometries.get(geometryIndex);

    // We need to get the units here because each geometry can have different units
    const transformArray = geometryRef.flatTransformation;
    const { units } = this.removeScale(transformArray);

    if (this._problematicGeometries.has(geometryRef.geometryExpressID)) {
      console.log(` Problematic geometry: ${geometryRef.geometryExpressID}`);
      return;
    }

    const { x, y, z, w } = geometryRef.color;

    const geometryData: IfcGeometryInstance = {
      id: geometryRef.geometryExpressID,
      color: [x, y, z, w],
      localTransformID: null,
    };

    element.geometries.push(geometryData);

    const { transformWithoutScale } = this.removeScale(
      geometryRef.flatTransformation,
    );

    if (this._previousGeometriesIDs.has(geometryData.id)) {
      // This geometry was already computed according to the IFC
      // Just save its transform and ID and return

      // Some files have geometries with different scales
      // Fragments transforms dont have scale, so we have to consider them new geometries
      const scaleHash = this.getScaleHash(units);
      const previousScaleHash = this._previousGeometriesScales.get(
        geometryData.id,
      );
      const sameScale = previousScaleHash === scaleHash;

      if (sameScale) {
        this.getLocalTransform(
          elementTransform,
          transformWithoutScale,
          geometryData,
        );

        // We need to recover the ID, in case this geometry was previously deduplicated
        geometryData.id = this._previousGeometriesIDs.get(geometryData.id)!;
        return;
      }
      // This geometry has a different scale, so we need to consider it as a new geometry
      const newId = this._nextId++;
      this._previousGeometriesScales.set(newId, scaleHash);
      geometryData.id = newId;
    }

    // Now we need to determine if this geometry is duplicated or not
    // To do that, we'll collect the geometry buffers data

    const buffers = this.getGeometryBuffers(modelID, geometryRef);
    if (buffers === null) {
      console.log(`Zero length geometry: ${geometryData.id}`);
      element.geometries.pop();
      this._problematicGeometries.add(geometryData.id);
      return;
    }

    const { position, normals, index } = buffers;

    for (let i = 0; i < position.length - 2; i += 3) {
      position[i] *= units.x;
      position[i + 1] *= units.y;
      position[i + 2] *= units.z;
    }

    // Determine whether the geometry is duplicated by computing some properties
    // Like areas, volumes, and some vertices
    // We'll just deduplicate exact geometries, without taking transforms into account

    const vertexCount = position.length / 3;
    const triangleCount = index.length / 3;

    let biggestArea = 0;
    let areaSum = 0;

    const triangle = new THREE.Triangle();

    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    const v3 = new THREE.Vector3();

    // Compute volume, area and biggest/smallest triangles

    const volume = this.getVolume(index, position);

    const centroid = new THREE.Vector3();

    for (let i = 0; i < index.length - 2; i += 3) {
      const i1 = index[i];
      const i2 = index[i + 1];
      const i3 = index[i + 2];

      v1.set(position[i1 * 3], position[i1 * 3 + 1], position[i1 * 3 + 2]);
      v2.set(position[i2 * 3], position[i2 * 3 + 1], position[i2 * 3 + 2]);
      v3.set(position[i3 * 3], position[i3 * 3 + 1], position[i3 * 3 + 2]);

      centroid.add(v1);
      centroid.add(v2);
      centroid.add(v3);

      triangle.set(v1, v2, v3);
      const area = triangle.getArea();

      if (area > biggestArea) {
        biggestArea = area;
      }

      areaSum += area;
    }

    centroid.divideScalar(index.length);

    v1.set(position[0], position[1], position[2]);
    v2.set(position[3], position[4], position[5]);
    v3.set(position[6], position[7], position[8]);

    const p = 10000;
    const hashAreaSum = GeomsFbUtils.round(areaSum, p);
    const hashBigArea = GeomsFbUtils.round(biggestArea, p);
    const hashVolume = GeomsFbUtils.round(volume, p);

    const x1 = GeomsFbUtils.round(v1.x, p);
    const y1 = GeomsFbUtils.round(v1.y, p);
    const z1 = GeomsFbUtils.round(v1.z, p);

    const cx = GeomsFbUtils.round(centroid.x, p);
    const cy = GeomsFbUtils.round(centroid.x, p);
    const cz = GeomsFbUtils.round(centroid.x, p);

    const hash = `${vertexCount}-${triangleCount}-${hashAreaSum}-${hashBigArea}-${hashVolume}-${cx}-${cy}-${cz}-${x1}-${y1}-${z1}`;

    if (this._problematicGeometriesHashes.has(hash)) {
      console.log(`Problematic geometry: ${geometryData.id}`);
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

    this.getLocalTransform(
      elementTransform,
      transformWithoutScale,
      geometryData,
    );

    const raw = this._rawCategories.has(element.type);

    // Only compute geometry data that hasn't been computed before
    if (isNewGeometry) {
      try {
        const geomData = GeomsFbUtils.getShellData({
          position,
          normals,
          index,
          raw,
          settings: this._serializer.geometryProcessSettings,
        });
        this.onGeometryLoaded({
          id: geometryData.id,
          geometry: geomData,
        });
      } catch (error) {
        console.error(`Fragments: Problematic geometry: ${geometryData.id}`);
        element.geometries.pop();
        this._problematicGeometries.add(geometryData.id);
        this._problematicGeometriesHashes.add(hash);
      }
    }
  }

  private getScaleHash(units: THREE.Vector3) {
    return `${units.x}-${units.y}-${units.z}`;
  }

  private getLocalTransform(
    elementTransform: number[],
    transformWithoutScale: THREE.Matrix4,
    geometryData: IfcGeometryInstance,
  ) {
    this._tempObject1.position.set(0, 0, 0);
    this._tempObject1.rotation.set(0, 0, 0);
    this._tempObject1.scale.set(1, 1, 1);
    this._tempObject1.updateMatrix();
    this._tempMatrix1.fromArray(elementTransform);
    this._tempObject1.applyMatrix4(this._tempMatrix1);

    this._tempObject2.position.set(0, 0, 0);
    this._tempObject2.rotation.set(0, 0, 0);
    this._tempObject2.scale.set(1, 1, 1);
    this._tempObject2.updateMatrix();
    this._tempObject2.applyMatrix4(transformWithoutScale);

    this._tempObject1.attach(this._tempObject2);

    const { px, py, pz, dxx, dxy, dxz, dyx, dyy, dyz } = this.decompose(
      this._tempObject2.matrix,
    );

    this._tempObject2.removeFromParent();

    // prettier-ignore
    const isOrigin = px === 0 && py === 0 && pz === 0 &&
    dxx === 1 && dxy === 0 && dxz === 0 &&
    dyx === 0 && dyy === 1 && dyz === 0;

    if (!isOrigin) {
      // Deduplicate local transforms for smaller files
      const hash = `${px}-${py}-${pz}-${dxx}-${dxy}-${dxz}-${dyx}-${dyy}-${dyz}`;

      const previousLocalTransform = this._previousLocalTransforms.get(hash);

      if (previousLocalTransform) {
        geometryData.localTransformID = previousLocalTransform.id;
      } else {
        // We add 1 because the local transform 0 is the no-transform
        const id = this._previousLocalTransforms.size + 1;
        const localTransform: IfcLocalTransform = {
          id,
          data: [px, py, pz, dxx, dxy, dxz, dyx, dyy, dyz],
        };

        this._previousLocalTransforms.set(hash, localTransform);
        geometryData.localTransformID = localTransform.id;

        this.onLocalTransformLoaded(localTransform);
      }
    }
  }

  private removeScale(elements: number[]) {
    const matrix = new THREE.Matrix4().fromArray(elements);
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    matrix.decompose(position, quaternion, scale);

    // To convert models to meters

    const units = scale;

    const transformWithoutScale = new THREE.Matrix4();
    transformWithoutScale.compose(
      position,
      quaternion,
      new THREE.Vector3(1, 1, 1),
    );

    return { units, transformWithoutScale };
  }

  private decompose(transform: THREE.Matrix4) {
    const p = 1000;
    const ap = 100000;
    const dxx = GeomsFbUtils.round(transform.elements[0], p);
    const dxy = GeomsFbUtils.round(transform.elements[1], p);
    const dxz = GeomsFbUtils.round(transform.elements[2], p);
    const dyx = GeomsFbUtils.round(transform.elements[4], ap);
    const dyy = GeomsFbUtils.round(transform.elements[5], ap);
    const dyz = GeomsFbUtils.round(transform.elements[6], ap);
    const dzx = GeomsFbUtils.round(transform.elements[8], ap);
    const dzy = GeomsFbUtils.round(transform.elements[9], ap);
    const dzz = GeomsFbUtils.round(transform.elements[10], ap);
    const px = GeomsFbUtils.round(transform.elements[12], ap);
    const py = GeomsFbUtils.round(transform.elements[13], ap);
    const pz = GeomsFbUtils.round(transform.elements[14], ap);
    return { dxx, dxy, dxz, dyx, dyy, dyz, dzx, dzy, dzz, px, py, pz };
  }

  // https://stackoverflow.com/a/1568551
  private getVolume(index: Uint32Array, pos: Float32Array) {
    let volume = 0;
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    const p3 = new THREE.Vector3();

    for (let i = 0; i < index.length - 2; i += 3) {
      const i1 = index[i] * 3;
      const i2 = index[i + 1] * 3;
      const i3 = index[i + 2] * 3;
      p1.set(pos[i1], pos[i1 + 1], pos[i1 + 2]);
      p2.set(pos[i2], pos[i2 + 1], pos[i2 + 2]);
      p3.set(pos[i3], pos[i3 + 1], pos[i3 + 2]);
      volume += this.getSignedVolumeOfTriangle(p1, p2, p3);
    }

    return Math.abs(volume);
  }

  private getSignedVolumeOfTriangle(
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    p3: THREE.Vector3,
  ) {
    const v321 = p3.x * p2.y * p1.z;
    const v231 = p2.x * p3.y * p1.z;
    const v312 = p3.x * p1.y * p2.z;
    const v132 = p1.x * p3.y * p2.z;
    const v213 = p2.x * p1.y * p3.z;
    const v123 = p1.x * p2.y * p3.z;
    return (1.0 / 6.0) * (-v321 + v231 + v312 - v132 - v213 + v123);
  }

  private getGeometryBuffers(
    modelID: number,
    geometryRef: WEBIFC.PlacedGeometry,
  ) {
    if (!this._ifcAPI) {
      throw new Error("Fragments: IfcAPI not initialized");
    }

    const geometry = this._ifcAPI.GetGeometry(
      modelID,
      geometryRef.geometryExpressID,
    );

    const index = this._ifcAPI.GetIndexArray(
      geometry.GetIndexData(),
      geometry.GetIndexDataSize(),
    ) as Uint32Array;

    const vertexData = this._ifcAPI.GetVertexArray(
      geometry.GetVertexData(),
      geometry.GetVertexDataSize(),
    ) as Float32Array;

    if (index.length === 0 || vertexData.length === 0) {
      geometry.delete();
      return null;
    }

    const position = new Float32Array(vertexData.length / 2);
    const normals = new Float32Array(vertexData.length / 2);

    for (let i = 0; i < vertexData.length; i += 6) {
      position[i / 2] = vertexData[i];
      position[i / 2 + 1] = vertexData[i + 1];
      position[i / 2 + 2] = vertexData[i + 2];

      normals[i / 2] = vertexData[i + 3];
      normals[i / 2 + 1] = vertexData[i + 4];
      normals[i / 2 + 2] = vertexData[i + 5];
    }

    geometry.delete();

    return { position, normals, index };
  }

  // private exportGeometry(
  //   position: Float32Array,
  //   normals: Float32Array,
  //   index: Uint32Array,
  // ) {
  //   // Create Three.js geometry and mesh
  //   const geometry = new THREE.BufferGeometry();
  //   geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  //   geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  //   geometry.setIndex(new THREE.BufferAttribute(index, 1));

  //   const material = new THREE.MeshStandardMaterial();
  //   const mesh = new THREE.Mesh(geometry, material);

  //   // Export to GLTF
  //   const exporter = new GLTFExporter();
  //   exporter.parse(
  //     mesh,
  //     (gltf) => {
  //       const output = JSON.stringify(gltf, null, 2);
  //       const blob = new Blob([output], { type: "application/json" });
  //       const url = URL.createObjectURL(blob);

  //       // Create download link
  //       const link = document.createElement("a");
  //       link.href = url;
  //       link.download = `geometry.gltf`;
  //       link.click();

  //       URL.revokeObjectURL(url);
  //     },
  //     { binary: false },
  //   );
  // }

  // Function to compute cross product
  private crossProduct(v1: any, v2: any): any {
    return {
      x: v1.y * v2.z - v1.z * v2.y,
      y: v1.z * v2.x - v1.x * v2.z,
      z: v1.x * v2.y - v1.y * v2.x,
    };
  }

  private computeCircleCurveProperties(point1: any, point2: any, point3: any) {
    function computeCircleCenter(point1: any, point2: any, point3: any): any {
      // Compute D21 = P2 - P1
      const D21x = point2.x - point1.x;
      const D21y = point2.y - point1.y;
      const D21z = point2.z - point1.z;

      // Compute D31 = P3 - P1
      const D31x = point3.x - point1.x;
      const D31y = point3.y - point1.y;
      const D31z = point3.z - point1.z;

      // Compute F2 and F3
      const F2 = 0.5 * (D21x ** 2 + D21y ** 2 + D21z ** 2);
      const F3 = 0.5 * (D31x ** 2 + D31y ** 2 + D31z ** 2);

      // Compute cross products M23xy, M23yz, M23xz
      const M23xy = D21x * D31y - D21y * D31x;
      const M23yz = D21y * D31z - D21z * D31y;
      const M23xz = D21z * D31x - D21x * D31z;

      // Compute F23 components
      const F23x = F2 * D31x - F3 * D21x;
      const F23y = F2 * D31y - F3 * D21y;
      const F23z = F2 * D31z - F3 * D21z;

      // Compute denominator (magnitude squared of M23 vector)
      const m23magsq = M23xy ** 2 + M23yz ** 2 + M23xz ** 2;

      if (m23magsq === 0) {
        throw new Error(
          "Fragments: Points are collinear, no unique circle exists.",
        );
      }

      // Compute the center (Cx, Cy, Cz)
      const Cx = point1.x + (M23xy * F23y - M23xz * F23z) / m23magsq;
      const Cy = point1.y + (M23yz * F23z - M23xy * F23x) / m23magsq;
      const Cz = point1.z + (M23xz * F23x - M23yz * F23y) / m23magsq;

      return { x: Cx, y: Cy, z: Cz };
    }

    // Function to compute vector subtraction
    function subtract(p1: any, p2: any): any {
      return { x: p1.x - p2.x, y: p1.y - p2.y, z: p1.z - p2.z };
    }

    // Function to compute vector length
    function length(v: any): number {
      return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    }

    // Direction vectors of the segments
    const dirAB = subtract(point2, point1);
    const dirBC = subtract(point3, point2);

    // Normal to the plane
    const normal = this.crossProduct(dirAB, dirBC);
    const center = computeCircleCenter(point1, point2, point3);

    const dirAcen = subtract(point1, center);
    const dirBcen = subtract(point3, center);

    // Compute radius
    const radius = length(subtract(center, point1));

    // Compute initial tangent (direction from center to first point)
    const initialTangent = subtract(point1, center);
    const tangentMagnitude = length(initialTangent);
    initialTangent.x /= tangentMagnitude;
    initialTangent.y /= tangentMagnitude;
    initialTangent.z /= tangentMagnitude;

    // Compute angle subtended by circle curve
    const angle = Math.acos(
      (dirAcen.x * dirBcen.x + dirAcen.y * dirBcen.y + dirAcen.z * dirBcen.z) /
        (length(dirAcen) * length(dirBcen)),
    );

    return {
      center,
      radius,
      normal,
      initialTangent,
      angle: (angle * 180) / Math.PI, // Convert to degrees
    };
  }
}
