import * as FB from "flatbuffers";
import * as THREE from "three";
import * as WEBIFC from "web-ifc";
import * as TFB from "../../../../Schema";
import {
  CircleExtrusionData,
  EncodedShell,
  GeometryData,
  IfcElement,
  IfcFileReader,
  IfcLocalTransform,
  TransformData,
} from "./ifc-file-reader";
import { AlignmentData, GridData } from "../../../../FragmentsModels";
import { IfcImporter } from "../..";
import { ProcessData } from "../types";
import { GeomsFbUtils } from "../../../../Utils/shells";

interface GeometriesProcessData extends ProcessData {
  builder: FB.Builder;
}

export class IfcGeometryProcessor {
  wasm = {
    path: "../../../../node_modules/web-ifc/",
    absolute: false,
  };

  webIfcSettings: WEBIFC.LoaderSettings = {};

  private _serializer: IfcImporter;

  constructor(_serializer: IfcImporter) {
    this._serializer = _serializer;
  }

  async process(data: GeometriesProcessData) {
    const { builder } = data;

    let nextId = 0;

    const localIDs: number[] = [];

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

    const items: {
      element: IfcElement;
      position: number[];
      xDirection: number[];
      yDirection: number[];
    }[] = [];

    const localTransforms: IfcLocalTransform[] = [];

    const itemIDMap = new Map<number, number>();
    const geometryIDMap = new Map<number, number>();
    const materialIDMap = new Map<string, { id: number; color: number[] }>();

    const reader = new IfcFileReader(this._serializer);
    reader.wasm = this.wasm;
    reader.webIfcSettings = this.webIfcSettings;

    // reader.isolatedMeshes = new Set([22835]);

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

    reader.onElementLoaded = (element) => {
      items.push(element);
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

    await reader.load(data);

    // Create geometry

    const geometriesItems: number[] = [];
    let itemCounter = 0;

    TFB.Meshes.startGlobalTransformsVector(builder, items.length);

    // Filled back to front, like the vector itself, and reversed once after:
    // `unshift` in this loop made it quadratic in the number of items.
    const gtLocalIds: number[] = [];

    for (let i = 0; i < items.length; i++) {
      const currentItem = items[items.length - 1 - i];

      geometriesItems.push(itemCounter++);

      const { position, xDirection, yDirection } = currentItem;
      const [px, py, pz] = position;
      const [dxx, dxy, dxz] = xDirection;
      const [dyx, dyy, dyz] = yDirection;

      localIDs.push(items[i].element.id);

      const itemIndex = items.length - 1 - i;

      gtLocalIds.push(nextId++);

      // prettier-ignore
      TFB.Transform.createTransform(
        builder,
        px, py, pz,
        dxx,dxy,dxz,
        dyx,dyy,dyz
      );

      itemIDMap.set(currentItem.element.id, itemIndex);
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

    let materialCounter = 0;
    for (const item of items) {
      for (const geometry of item.element.geometries) {
        const colorID = geometry.color.toString();
        if (!materialIDMap.has(colorID)) {
          const color = geometry.color.map((n) => n * 255);
          materialIDMap.set(colorID, { id: materialCounter++, color });
        }
      }
    }

    TFB.Meshes.startMaterialsVector(builder, materialIDMap.size);

    const materialsLocalIds: number[] = [];

    const materialMapKeys = Array.from(materialIDMap.keys());

    for (let i = 0; i < materialMapKeys.length; i++) {
      const key = materialMapKeys[materialMapKeys.length - 1 - i];
      const { color } = materialIDMap.get(key)!;
      const [r, g, b, a] = color;

      materialsLocalIds.push(nextId++);

      const renderedFaces = this._serializer.doubleSidedMaterials
        ? TFB.RenderedFaces.TWO
        : TFB.RenderedFaces.ONE;

      TFB.Material.createMaterial(builder, r, g, b, a, renderedFaces, 0);
    }

    const materials = builder.endVector();

    let sampleCount = 0;
    for (const item of items) {
      sampleCount += item.element.geometries.length;
    }

    TFB.Meshes.startSamplesVector(builder, sampleCount);

    const samplesLocalIds: number[] = [];

    for (let g = 0; g < items.length; g++) {
      const currentItem = items[items.length - 1 - g];

      const itemID = itemIDMap.get(currentItem.element.id)!;

      const geoms = currentItem.element.geometries;
      for (let i = 0; i < geoms.length; i++) {
        const geometry = geoms[geoms.length - i - 1];
        const geometryID = geometryIDMap.get(geometry.id)!;
        const materialID = materialIDMap.get(geometry.color.toString())!.id;
        const transformID = geometry.localTransformID || 0;

        samplesLocalIds.push(nextId++);

        TFB.Sample.createSample(
          builder,
          itemID,
          materialID,
          geometryID,
          transformID,
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
