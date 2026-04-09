import * as WEBIFC from "web-ifc";
import * as THREE from "three";
import { FragmentsIfcUtils, GeomsFbUtils } from "../../../../Utils";
import {
  GeometryData,
  IfcElement,
  IfcGeometryInstance,
} from "./ifc-file-reader";
import { IfcImporter } from "../..";

export class SpaceBoundaryReader {
  read(
    webIfc: WEBIFC.IfcAPI,
    serializer: IfcImporter,
    onGeometryLoaded: (data: { id: number; geometry: GeometryData }) => void,
    onElementLoaded: (data: {
      element: IfcElement;
      position: number[];
      xDirection: number[];
      yDirection: number[];
    }) => void,
    getNextId: () => number,
  ) {
    try {
      const units = FragmentsIfcUtils.getUnitsFactor(webIfc);

      const coordMatrixValues = webIfc.GetCoordinationMatrix(0);
      const coordMatrix = new THREE.Matrix4();
      coordMatrix.fromArray(coordMatrixValues);

      const boundariesVector = webIfc.GetLineIDsWithType(
        0,
        WEBIFC.IFCRELSPACEBOUNDARY2NDLEVEL,
      );

      const size = boundariesVector.size();

      // Cache space transforms by expressID to avoid recomputing
      const spaceTransforms = new Map<
        number,
        {
          transform: THREE.Matrix4;
          decomposed: any;
        }
      >();

      for (let i = 0; i < size; i++) {
        const id = boundariesVector.get(i);
        const boundary = webIfc.GetLine(0, id);

        const connectionGeometry = boundary.ConnectionGeometry;
        if (!connectionGeometry) {
          continue;
        }

        // Get the relating space and its absolute placement
        const relatingSpace = boundary.RelatingSpace;
        if (!relatingSpace) {
          continue;
        }

        const spaceId = relatingSpace.value;
        let spaceData = spaceTransforms.get(spaceId);
        if (!spaceData) {
          const space = webIfc.GetLine(0, spaceId);
          // getAbsolutePlacement handles IFC Z-up → Three.js Y-up
          // premultiply with coordMatrix to handle COORDINATE_TO_ORIGIN offset
          const transform = FragmentsIfcUtils.getAbsolutePlacement(
            webIfc,
            space,
            units,
          );
          transform.premultiply(coordMatrix);
          const decomposed = this.decompose(transform);
          spaceData = { transform, decomposed };
          spaceTransforms.set(spaceId, spaceData);
        }

        const surfaceGeometry = webIfc.GetLine(0, connectionGeometry.value);

        const surfaceOnRelating = surfaceGeometry.SurfaceOnRelatingElement;
        if (!surfaceOnRelating) {
          continue;
        }

        // Vertices stay in local space (just scaled by units, no transform)
        const buffers = this.getFaceBuffers(
          webIfc,
          surfaceOnRelating.value,
          units,
        );

        if (!buffers) {
          continue;
        }

        const { position, normals, index } = buffers;

        let geomData;
        try {
          geomData = GeomsFbUtils.getShellData({
            position,
            normals,
            index,
            raw: false,
            settings: serializer.geometryProcessSettings,
          });
        } catch {
          console.log(
            `Fragments: Could not process space boundary geometry for #${id}`,
          );
          continue;
        }

        const geometryId = getNextId();

        onGeometryLoaded({
          id: geometryId,
          geometry: geomData,
        });

        const geometryInstance: IfcGeometryInstance = {
          id: geometryId,
          color: [0.5, 0.5, 0.8, 0.5],
          localTransformID: null,
        };

        const element: IfcElement = {
          id: boundary.expressID,
          type: WEBIFC.IFCRELSPACEBOUNDARY2NDLEVEL,
          guid: boundary.GlobalId.value,
          geometries: [geometryInstance],
        };

        // Pass the space's absolute placement as the element transform,
        // same pattern as the main pipeline's flatTransformation decomposition
        const { px, py, pz, dxx, dxy, dxz, dyx, dyy, dyz } =
          spaceData.decomposed;

        onElementLoaded({
          element,
          position: [px, py, pz],
          xDirection: [dxx, dxy, dxz],
          yDirection: [dyx, dyy, dyz],
        });
      }
    } catch (error) {
      console.error("Fragments: Error reading space boundaries", error);
    }
  }

  private getFaceBuffers(webIfc: WEBIFC.IfcAPI, faceId: number, units: number) {
    const face = webIfc.GetLine(0, faceId);

    if (!face.Bounds) {
      return null;
    }

    const points: THREE.Vector3[] = [];

    for (const boundRef of face.Bounds) {
      const bound = webIfc.GetLine(0, boundRef.value);
      const loop = webIfc.GetLine(0, bound.Bound.value);

      if (!loop.Polygon) {
        continue;
      }

      for (const pointRef of loop.Polygon) {
        const point = webIfc.GetLine(0, pointRef.value);
        const coords = point.Coordinates;
        const x = coords[0].value * units;
        const y = coords[1].value * units;
        const z = coords[2].value * units;
        points.push(new THREE.Vector3(x, y, z));
      }
    }

    if (points.length < 3) {
      return null;
    }

    // Compute face normal from the first 3 points
    const v1 = new THREE.Vector3().subVectors(points[1], points[0]);
    const v2 = new THREE.Vector3().subVectors(points[2], points[0]);
    const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();

    // Fan triangulation for a convex planar polygon
    const triangleCount = points.length - 2;
    const position = new Float32Array(points.length * 3);
    const normals = new Float32Array(points.length * 3);
    const index = new Uint32Array(triangleCount * 3);

    for (let i = 0; i < points.length; i++) {
      position[i * 3] = points[i].x;
      position[i * 3 + 1] = points[i].y;
      position[i * 3 + 2] = points[i].z;
      normals[i * 3] = normal.x;
      normals[i * 3 + 1] = normal.y;
      normals[i * 3 + 2] = normal.z;
    }

    for (let i = 0; i < triangleCount; i++) {
      index[i * 3] = 0;
      index[i * 3 + 1] = i + 1;
      index[i * 3 + 2] = i + 2;
    }

    return { position, normals, index };
  }

  private decompose(transform: THREE.Matrix4) {
    const e = transform.elements;
    const p = 1000;
    const ap = 100000;
    const dxx = GeomsFbUtils.round(e[0], p);
    const dxy = GeomsFbUtils.round(e[1], p);
    const dxz = GeomsFbUtils.round(e[2], p);
    const dyx = GeomsFbUtils.round(e[4], ap);
    const dyy = GeomsFbUtils.round(e[5], ap);
    const dyz = GeomsFbUtils.round(e[6], ap);
    const px = GeomsFbUtils.round(e[12], ap);
    const py = GeomsFbUtils.round(e[13], ap);
    const pz = GeomsFbUtils.round(e[14], ap);
    return { dxx, dxy, dxz, dyx, dyy, dyz, px, py, pz };
  }
}
