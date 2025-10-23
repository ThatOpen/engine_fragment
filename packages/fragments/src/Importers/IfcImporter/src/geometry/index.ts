import * as FB from "flatbuffers";
import * as THREE from "three";
import * as WEBIFC from "web-ifc";
import * as TFB from "../../../../Schema";
import {
  GeometryData,
  IfcElement,
  IfcFileReader,
  IfcLocalTransform,
  TransformData,
} from "./ifc-file-reader";
import { ifcCategoryMap } from "../../../../Utils";
import { AlignmentData } from "../../../../FragmentsModels";
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

    const geometries: {
      geometry: GeometryData;
      id: number;
    }[] = [];

    const alignments: AlignmentData[] = [];

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

    // reader.isolatedMeshes = new Set([186559]);

    reader.onGeometryLoaded = (geometry) => {
      geometries.push(geometry);
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

    await reader.load(data);

    // Create geometry

    const geometriesItems: number[] = [];
    let itemCounter = 0;

    TFB.Meshes.startGlobalTransformsVector(builder, items.length);

    const gtLocalIds: number[] = [];

    const itemCategories = new Map<string, number>();
    const categoriesIds: number[] = [];
    const localIds: number[] = [];

    for (let i = 0; i < items.length; i++) {
      const currentItem = items[items.length - 1 - i];

      geometriesItems.push(itemCounter++);

      const { position, xDirection, yDirection } = currentItem;
      const [px, py, pz] = position;
      const [dxx, dxy, dxz] = xDirection;
      const [dyx, dyy, dyz] = yDirection;

      localIDs.push(items[i].element.id);

      const itemIndex = items.length - 1 - i;

      const categoryId = currentItem.element.type;

      const category = ifcCategoryMap[categoryId];
      if (!itemCategories.has(category)) {
        itemCategories.set(category, itemCategories.size);
      }

      gtLocalIds.unshift(nextId++);

      // prettier-ignore
      TFB.Transform.createTransform(
        builder,
        px, py, pz,
        dxx,dxy,dxz,
        dyx,dyy,dyz
      );

      const categoryIndex = itemCategories.get(category)!;
      categoriesIds.unshift(categoryIndex);
      localIds.unshift(currentItem.element.id);
      itemIDMap.set(currentItem.element.id, itemIndex);
    }

    const globalTransforms = builder.endVector();

    // Create Shells

    const shellsOffsets: number[] = [];

    for (let g = 0; g < geometries.length; g++) {
      const geometryData = geometries[g];

      if (geometryData.geometry.type !== TFB.RepresentationClass.SHELL) {
        continue;
      }

      const { points, profiles, holes, profilesFaceIds } =
        geometryData.geometry;

      const isBigShell = points.length > GeomsFbUtils.ushortMaxValue;

      const shellType = isBigShell ? TFB.ShellType.BIG : TFB.ShellType.NONE;

      TFB.Shell.startPointsVector(builder, points.length);
      for (let i = 0; i < points.length; i++) {
        const [x, y, z] = points[points.length - 1 - i];
        TFB.FloatVector.createFloatVector(builder, x, y, z);
      }
      const pointsOffset = builder.endVector();

      const profilesOffsets: number[] = [];
      const holesOffsets: number[] = [];
      const bigProfilesOffsets: number[] = [];
      const bigHolesOffsets: number[] = [];

      for (const [, indices] of profiles) {
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
          indices,
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

      for (const [holeId, indicesSets] of holes) {
        if (isBigShell) {
          for (const indices of indicesSets) {
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
          }
          continue;
        }

        for (const indices of indicesSets) {
          const indicesOffset = TFB.ShellHole.createIndicesVector(
            builder,
            indices,
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
        profilesFaceIds,
      );

      const shellOffset = TFB.Shell.createShell(
        builder,
        shellProfilesOffset,
        shellHolesOffset,
        pointsOffset,
        bigShellProfilesOffset,
        bigShellHolesOffset,
        shellType,
        shellFaceIdsOffset,
      );

      shellsOffsets.push(shellOffset);
    }

    const shells = TFB.Meshes.createShellsVector(builder, shellsOffsets);

    // Create circle extrusions

    const circleExtrusionsOffsets: number[] = [];

    for (let g = 0; g < geometries.length; g++) {
      const geometryData = geometries[g];

      if (
        geometryData.geometry.type !== TFB.RepresentationClass.CIRCLE_EXTRUSION
      ) {
        continue;
      }

      const axisOffsets: number[] = [];
      const { radius, indicesArray, typesArray, segments, circleCurveData } =
        geometryData.geometry;

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
      const ceOffset = TFB.CircleExtrusion.endCircleExtrusion(builder);

      circleExtrusionsOffsets.push(ceOffset);
    }

    const circleExtrusions = TFB.Meshes.createCircleExtrusionsVector(
      builder,
      circleExtrusionsOffsets,
    );

    // Create representations

    const representationsLocalIds: number[] = [];

    TFB.Meshes.startRepresentationsVector(builder, geometries.length);

    const geometryClassesCounter = new Map<number, number>();

    for (let g = 0; g < geometries.length; g++) {
      const index = geometries.length - 1 - g;
      const currentGeometry = geometries[index];
      const geometryClass = currentGeometry.geometry.type;

      let previousCount = geometryClassesCounter.get(geometryClass);
      if (previousCount === undefined) {
        previousCount = -1;
      }
      geometryClassesCounter.set(geometryClass, previousCount + 1);
    }

    const tempMin = new THREE.Vector3();
    const tempMax = new THREE.Vector3();

    for (let g = 0; g < geometries.length; g++) {
      const index = geometries.length - 1 - g;
      const currentGeometry = geometries[index];
      const { bbox } = currentGeometry.geometry;
      geometryIDMap.set(currentGeometry.id, index);

      const geometryClass = currentGeometry.geometry.type;
      const geomIndex = geometryClassesCounter.get(geometryClass);
      if (geomIndex === undefined) {
        throw new Error("Fragments: Malformed geometry definition");
      }
      geometryClassesCounter.set(geometryClass, geomIndex - 1);

      tempMin.set(bbox.min.x, bbox.min.y, bbox.min.z);
      tempMax.set(bbox.max.x, bbox.max.y, bbox.max.z);
      const distance = tempMin.distanceTo(tempMax);

      // 1000 kilometers as max bounding box
      if (distance > 999999) {
        console.log(`Infinity bounding box: ${currentGeometry.id}`);
        bbox.min.x = 0;
        bbox.min.y = 0;
        bbox.min.z = 0;
        bbox.max.x = 0.1;
        bbox.max.y = 0.1;
        bbox.max.z = 0.1;
      }

      representationsLocalIds.unshift(nextId++);

      // prettier-ignore
      TFB.Representation.createRepresentation(
        builder,
        geomIndex, 
        bbox.min.x, bbox.min.y, bbox.min.z,
        bbox.max.x, bbox.max.y, bbox.max.z,  
        currentGeometry.geometry.type,
      );
    }

    const representationsOffsets = builder.endVector();

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

      TFB.Material.createMaterial(
        builder,
        r,
        g,
        b,
        a,
        TFB.RenderedFaces.ONE,
        0,
      );
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
    };
  }
}
