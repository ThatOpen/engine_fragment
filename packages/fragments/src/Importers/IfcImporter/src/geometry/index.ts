import * as FB from "flatbuffers";
import * as THREE from "three";
import * as WEBIFC from "web-ifc";
import * as TFB from "../../../../Schema";
import {
  CircleExtrusionData,
  EncodedShell,
  GeometryData,
  IfcFileReader,
  IfcLocalTransform,
  TransformData,
} from "./ifc-file-reader";
import { AlignmentData, GridData } from "../../../../FragmentsModels";
import { IfcImporter } from "../..";
import { ProcessData } from "../types";
import { GeomsFbUtils } from "../../../../Utils/shells";
import {
  IfcProjectedReader,
  ProjectedReadOptions,
  ProjectedReadStats,
} from "./ifc-projected-reader";

export { serveIfcGeometryWorker } from "./geometry-batch";
export type { ProjectedReadStats } from "./ifc-projected-reader";

/** A growable column of unsigned 32-bit integers. */
class U32List {
  private _data = new Uint32Array(1024);
  length = 0;

  push(value: number) {
    if (this.length === this._data.length) {
      const grown = new Uint32Array(this._data.length * 2);
      grown.set(this._data);
      this._data = grown;
    }
    this._data[this.length++] = value;
  }

  view() {
    return this._data.subarray(0, this.length);
  }
}

/** A growable column of doubles. */
class F64List {
  private _data = new Float64Array(1024);
  length = 0;

  push(...values: number[]) {
    if (this.length + values.length > this._data.length) {
      const grown = new Float64Array(
        Math.max(this._data.length * 2, this.length + values.length),
      );
      grown.set(this._data);
      this._data = grown;
    }
    for (const value of values) this._data[this.length++] = value;
  }

  view() {
    return this._data.subarray(0, this.length);
  }
}

interface GeometriesProcessData extends ProcessData {
  builder: FB.Builder;
  /** Read geometry as projections instead of one whole-file model. */
  projected?: ProjectedReadOptions;
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

  async process(data: GeometriesProcessData) {
    const { builder } = data;

    let nextId = 0;

    // prettier-ignore
    let coordinates: TransformData = {
      dxx: 1, dxy: 0, dxz: 0,
      dyx: 0, dyy: 1, dyz: 0,
      px: 0, py: 0, pz: 0,
    };

    // Geometry is written to the builder as it arrives rather than held until
    // the end: a shell's points and profiles are JS arrays, and holding every
    // one of them is what made the importer's heap grow with the model. What
    // the representations vector needs later is kept per geometry instead.
    const shellsOffsets: number[] = [];
    const circleExtrusionsOffsets: number[] = [];
    const representations: {
      type: TFB.RepresentationClass;
      classIndex: number;
      bbox: GeometryData["bbox"];
    }[] = [];

    const alignments: AlignmentData[] = [];
    const grids: GridData[] = [];

    // Items with geometry, as columns rather than an object graph per item:
    // kept until the end for the meshes vectors, so this is what the
    // geometry pass holds per element of the model.
    const itemIds = new U32List();
    const itemTransforms = new F64List(); // 9 per item
    const itemSamples = new U32List(); // where each item's samples start
    const sampleGeometries = new U32List();
    const sampleMaterials = new U32List();
    const sampleTransforms = new U32List();

    const localTransforms: IfcLocalTransform[] = [];

    const geometryIDMap = new Map<number, number>();
    // colour key -> material index, in order of first use
    const materialIDMap = new Map<string, number>();
    const materialColors: number[][] = [];

    const fileReader = new IfcFileReader(this._serializer);
    fileReader.wasm = this.wasm;
    fileReader.webIfcSettings = this.webIfcSettings;
    // fileReader.isolatedMeshes = new Set([22835]);
    const projectedReader = new IfcProjectedReader(this._serializer);
    const reader = data.projected ? projectedReader : fileReader;

    reader.onGeometryLoaded = ({ id, geometry }) => {
      geometryIDMap.set(id, representations.length);
      let classIndex: number;
      if (geometry.type === TFB.RepresentationClass.SHELL) {
        classIndex = shellsOffsets.length;
        shellsOffsets.push(this.writeShell(builder, geometry));
      } else {
        classIndex = circleExtrusionsOffsets.length;
        circleExtrusionsOffsets.push(
          this.writeCircleExtrusion(builder, geometry),
        );
      }
      representations.push({
        type: geometry.type,
        classIndex,
        bbox: geometry.bbox,
      });
    };

    reader.onElementLoaded = ({ element, position, xDirection, yDirection }) => {
      itemIds.push(element.id);
      itemTransforms.push(...position, ...xDirection, ...yDirection);
      itemSamples.push(sampleGeometries.length);
      for (const geometry of element.geometries) {
        const colorID = geometry.color.toString();
        let material = materialIDMap.get(colorID);
        if (material === undefined) {
          material = materialColors.push(geometry.color.map((n) => n * 255)) - 1;
          materialIDMap.set(colorID, material);
        }
        sampleGeometries.push(geometry.id);
        sampleMaterials.push(material);
        sampleTransforms.push(geometry.localTransformID || 0);
      }
    };

    reader.onLocalTransformLoaded = (localTransform) => {
      localTransforms.push(localTransform);
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

    if (data.projected) await projectedReader.load(data, data.projected);
    else await fileReader.load(data);
    this.projectedStats = data.projected ? projectedReader.stats : null;

    // Create geometry

    const itemCount = itemIds.length;
    const localIDs = itemIds.view();
    const geometriesItems: number[] = [];

    TFB.Meshes.startGlobalTransformsVector(builder, itemCount);

    // Filled back to front, like the vector itself, and reversed once after:
    // `unshift` in this loop made it quadratic in the number of items.
    const gtLocalIds: number[] = [];

    const transforms = itemTransforms.view();
    for (let i = 0; i < itemCount; i++) {
      geometriesItems.push(i);
      gtLocalIds.push(nextId++);
      const t = (itemCount - 1 - i) * 9;
      // prettier-ignore
      TFB.Transform.createTransform(
        builder,
        transforms[t], transforms[t + 1], transforms[t + 2],
        transforms[t + 3], transforms[t + 4], transforms[t + 5],
        transforms[t + 6], transforms[t + 7], transforms[t + 8],
      );
    }
    gtLocalIds.reverse();

    const globalTransforms = builder.endVector();

    const shells = TFB.Meshes.createShellsVector(builder, shellsOffsets);

    // Create circle extrusions

    const circleExtrusions = TFB.Meshes.createCircleExtrusionsVector(
      builder,
      circleExtrusionsOffsets,
    );

    // Create representations

    const representationsLocalIds: number[] = [];

    TFB.Meshes.startRepresentationsVector(builder, representations.length);

    const tempMin = new THREE.Vector3();
    const tempMax = new THREE.Vector3();

    for (let g = representations.length - 1; g >= 0; g--) {
      const { type, classIndex, bbox } = representations[g];

      tempMin.set(bbox.min.x, bbox.min.y, bbox.min.z);
      tempMax.set(bbox.max.x, bbox.max.y, bbox.max.z);
      const distance = tempMin.distanceTo(tempMax);

      // 1000 kilometers as max bounding box
      if (distance > 999999) {
        console.log(`Infinity bounding box: representation ${g}`);
        bbox.min.x = 0;
        bbox.min.y = 0;
        bbox.min.z = 0;
        bbox.max.x = 0.1;
        bbox.max.y = 0.1;
        bbox.max.z = 0.1;
      }

      representationsLocalIds.push(nextId++);

      // prettier-ignore
      TFB.Representation.createRepresentation(
        builder,
        classIndex,
        bbox.min.x, bbox.min.y, bbox.min.z,
        bbox.max.x, bbox.max.y, bbox.max.z,
        type,
      );
    }

    const representationsOffsets = builder.endVector();
    representationsLocalIds.reverse();

    TFB.Meshes.startMaterialsVector(builder, materialColors.length);

    const materialsLocalIds: number[] = [];

    const renderedFaces = this._serializer.doubleSidedMaterials
      ? TFB.RenderedFaces.TWO
      : TFB.RenderedFaces.ONE;

    for (let i = materialColors.length - 1; i >= 0; i--) {
      const [r, g, b, a] = materialColors[i];
      materialsLocalIds.push(nextId++);
      TFB.Material.createMaterial(builder, r, g, b, a, renderedFaces, 0);
    }

    const materials = builder.endVector();

    const sampleCount = sampleGeometries.length;
    TFB.Meshes.startSamplesVector(builder, sampleCount);

    const samplesLocalIds: number[] = [];
    const starts = itemSamples.view();
    const geometriesOfSamples = sampleGeometries.view();
    const materialsOfSamples = sampleMaterials.view();
    const transformsOfSamples = sampleTransforms.view();

    for (let item = itemCount - 1; item >= 0; item--) {
      const end = item + 1 < itemCount ? starts[item + 1] : sampleCount;
      for (let k = end - 1; k >= starts[item]; k--) {
        samplesLocalIds.push(nextId++);
        TFB.Sample.createSample(
          builder,
          item,
          materialsOfSamples[k],
          geometryIDMap.get(geometriesOfSamples[k])!,
          transformsOfSamples[k],
        );
      }
    }

    const samplesOffset = builder.endVector();

    TFB.Meshes.startLocalTransformsVector(builder, localTransforms.length);

    const localTransformsLocalIds: number[] = [];

    for (let i = 0; i < localTransforms.length; i++) {
      const transform = localTransforms[localTransforms.length - 1 - i];
      const [ox, oy, oz, x1, x2, x3, y1, y2, y3] = transform.data;

      localTransformsLocalIds.push(nextId++);

      // prettier-ignore
      TFB.Transform.createTransform(
        builder,
        ox,oy,oz,
        x1,x2,x3,
        y1,y2,y3
      );
    }

    const localTransformRef = builder.endVector();

    const meshesItemsOffset = TFB.Meshes.createMeshesItemsVector(
      builder,
      geometriesItems,
    );

    const reprLocalIdsOffset = TFB.Meshes.createRepresentationIdsVector(
      builder,
      representationsLocalIds,
    );

    const sampleLocalIdsOffset = TFB.Meshes.createSampleIdsVector(
      builder,
      samplesLocalIds,
    );

    const materialLocalIdsOffset = TFB.Meshes.createMaterialIdsVector(
      builder,
      materialsLocalIds,
    );

    const ltLocalIdsOffset = TFB.Meshes.createLocalTransformIdsVector(
      builder,
      localTransformsLocalIds,
    );

    const gtLocalIdsOffset = TFB.Meshes.createGlobalTransformIdsVector(
      builder,
      gtLocalIds,
    );

    // prettier-ignore
    const coordinatesOffset = TFB.Transform.createTransform(builder,
      coordinates.px, coordinates.py, coordinates.pz, 
      coordinates.dxx, coordinates.dxy, coordinates.dxz, 
      coordinates.dyx, coordinates.dyy, coordinates.dyz);

    TFB.Meshes.startMeshes(builder);
    TFB.Meshes.addCoordinates(builder, coordinatesOffset);
    TFB.Meshes.addGlobalTransforms(builder, globalTransforms);
    TFB.Meshes.addShells(builder, shells);
    TFB.Meshes.addRepresentations(builder, representationsOffsets);
    TFB.Meshes.addSamples(builder, samplesOffset);
    TFB.Meshes.addLocalTransforms(builder, localTransformRef);
    TFB.Meshes.addMaterials(builder, materials);
    TFB.Meshes.addCircleExtrusions(builder, circleExtrusions);
    TFB.Meshes.addMeshesItems(builder, meshesItemsOffset);
    TFB.Meshes.addRepresentationIds(builder, reprLocalIdsOffset);
    TFB.Meshes.addSampleIds(builder, sampleLocalIdsOffset);
    TFB.Meshes.addMaterialIds(builder, materialLocalIdsOffset);
    TFB.Meshes.addLocalTransformIds(builder, ltLocalIdsOffset);
    TFB.Meshes.addGlobalTransformIds(builder, gtLocalIdsOffset);
    const modelMesh = TFB.Meshes.endMeshes(builder);

    // GEOMETRY

    // For now we are just saving alignments as lines
    // When we save other implicit data, we might need to move this
    // to a different file and sort things better

    return {
      modelMesh,
      localIDs,
      maxLocalID: nextId,
      alignments,
      grids,
    };
  }

  private writeShell(builder: FB.Builder, shell: EncodedShell) {
    const { points, profiles, profileSizes, holeIds, holeCounts } = shell;
    const { holes, holeSizes, faceIds } = shell;

    const pointCount = points.length / 3;
    const isBigShell = pointCount > GeomsFbUtils.ushortMaxValue;

    const shellType = isBigShell ? TFB.ShellType.BIG : TFB.ShellType.NONE;

    TFB.Shell.startPointsVector(builder, pointCount);
    for (let i = pointCount - 1; i >= 0; i--) {
      TFB.FloatVector.createFloatVector(
        builder,
        points[i * 3],
        points[i * 3 + 1],
        points[i * 3 + 2],
      );
    }
    const pointsOffset = builder.endVector();

    const profilesOffsets: number[] = [];
    const holesOffsets: number[] = [];
    const bigProfilesOffsets: number[] = [];
    const bigHolesOffsets: number[] = [];

    let offset = 0;
    for (const size of profileSizes) {
      const indices = profiles.subarray(offset, offset + size);
      offset += size;
      if (isBigShell) {
        const indicesOffset = TFB.BigShellProfile.createIndicesVector(
          builder,
          indices,
        );
        const bigProfileOffset = TFB.BigShellProfile.createBigShellProfile(
          builder,
          indicesOffset,
        );
        bigProfilesOffsets.push(bigProfileOffset);
        continue;
      }

      const indicesOffset = TFB.ShellProfile.createIndicesVector(
        builder,
        indices as unknown as Uint16Array,
      );
      const profileOffset = TFB.ShellProfile.createShellProfile(
        builder,
        indicesOffset,
      );
      profilesOffsets.push(profileOffset);
    }

    const bigShellProfilesOffset = TFB.Shell.createBigProfilesVector(
      builder,
      bigProfilesOffsets,
    );

    const shellProfilesOffset = TFB.Shell.createProfilesVector(
      builder,
      profilesOffsets,
    );

    offset = 0;
    let set = 0;
    for (let h = 0; h < holeIds.length; h++) {
      const holeId = holeIds[h];
      for (let k = 0; k < holeCounts[h]; k++) {
        const size = holeSizes[set++];
        const indices = holes.subarray(offset, offset + size);
        offset += size;
        if (isBigShell) {
          const indicesOffset = TFB.BigShellHole.createIndicesVector(
            builder,
            indices,
          );
          const holeOffset = TFB.BigShellHole.createBigShellHole(
            builder,
            indicesOffset,
            holeId,
          );
          bigHolesOffsets.push(holeOffset); // Flattening the structure
          continue;
        }

        const indicesOffset = TFB.ShellHole.createIndicesVector(
          builder,
          indices as unknown as Uint16Array,
        );
        const holeOffset = TFB.ShellHole.createShellHole(
          builder,
          indicesOffset,
          holeId,
        );
        holesOffsets.push(holeOffset); // Flattening the structure
      }
    }

    const bigShellHolesOffset = TFB.Shell.createBigHolesVector(
      builder,
      bigHolesOffsets,
    );

    const shellHolesOffset = TFB.Shell.createHolesVector(
      builder,
      holesOffsets,
    );

    const shellFaceIdsOffset = TFB.Shell.createProfilesFaceIdsVector(
      builder,
      faceIds as unknown as number[],
    );

    return TFB.Shell.createShell(
      builder,
      shellProfilesOffset,
      shellHolesOffset,
      pointsOffset,
      bigShellProfilesOffset,
      bigShellHolesOffset,
      shellType,
      shellFaceIdsOffset,
    );
  }

  private writeCircleExtrusion(
    builder: FB.Builder,
    extrusion: CircleExtrusionData,
  ) {
    const axisOffsets: number[] = [];
    const { radius, indicesArray, typesArray, segments, circleCurveData } =
      extrusion;

    TFB.Axis.startCircleCurvesVector(builder, circleCurveData.length);
    for (let i = 0; i < circleCurveData.length; i++) {
      const [x1, y1, z1, radius, angle, dx1, dy1, dz1, dx3, dy3, dz3] =
        circleCurveData[i];

      TFB.CircleCurve.createCircleCurve(
        builder,
        (angle / 360) * 2 * Math.PI,
        x1,
        y1,
        z1,
        radius,
        dx3,
        dy3,
        dz3,
        dx1,
        dy1,
        dz1,
      );
    }

    const circleCurvesOffset = builder.endVector();

    TFB.Axis.startWiresVector(builder, segments.length);

    for (let i = 0; i < segments.length; i++) {
      const [x1, y1, z1, x2, y2, z2] = segments[i];
      TFB.Wire.createWire(builder, x1, y1, z1, x2, y2, z2);
    }

    const wiresOffset = builder.endVector();

    const ordersOffset = TFB.Axis.createOrderVector(builder, indicesArray);
    const axisPartsOffset = TFB.Axis.createPartsVector(builder, typesArray);

    TFB.Axis.startWireSetsVector(builder, 0);
    const wireSetOffset = builder.endVector();

    TFB.Axis.startAxis(builder);
    TFB.Axis.addCircleCurves(builder, circleCurvesOffset);
    TFB.Axis.addOrder(builder, ordersOffset);
    TFB.Axis.addWires(builder, wiresOffset);
    TFB.Axis.addWireSets(builder, wireSetOffset);
    TFB.Axis.addParts(builder, axisPartsOffset);
    const axisOffset = TFB.Axis.endAxis(builder);
    axisOffsets.push(axisOffset);

    const axisVectorOffset = TFB.CircleExtrusion.createAxesVector(
      builder,
      axisOffsets,
    );

    const radiusOffset = TFB.CircleExtrusion.createRadiusVector(builder, [
      radius,
    ]);

    TFB.CircleExtrusion.startCircleExtrusion(builder);
    TFB.CircleExtrusion.addAxes(builder, axisVectorOffset);
    TFB.CircleExtrusion.addRadius(builder, radiusOffset);
    return TFB.CircleExtrusion.endCircleExtrusion(builder);
  }
}
