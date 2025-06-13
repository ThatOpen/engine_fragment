import * as THREE from "three";
import { Points } from "./points";
import { Edge } from "./edge";
import { Faces } from "./faces";
import { Profiles } from "./profiles";
import { getAABB } from "./bbox";
import { Plane } from "./plane";
import * as TFB from "../../../../../Schema";

export type ShellData = {
  type: TFB.RepresentationClass.SHELL;
  profiles: Map<number, number[]>;
  holes: Map<number, number[][]>;
  points: number[][];
  bbox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
};

function getRawShellData(
  index: Uint32Array,
  position: Float32Array,
  bbox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  },
) {
  const pointsMap = new Map<string, number[]>();
  const profiles = new Map<number, number[]>();

  const getPointIndex = (x: number, y: number, z: number) => {
    const key = `${x},${y},${z}`;
    if (pointsMap.has(key)) {
      return pointsMap.get(key)![0];
    }
    const index = pointsMap.size;
    pointsMap.set(key, [index, x, y, z]);
    return index;
  };

  for (let i = 0; i < index.length - 2; i += 3) {
    const v1Index = index[i];
    const v2Index = index[i + 1];
    const v3Index = index[i + 2];

    const p1x = position[v1Index * 3];
    const p1y = position[v1Index * 3 + 1];
    const p1z = position[v1Index * 3 + 2];

    const p2x = position[v2Index * 3];
    const p2y = position[v2Index * 3 + 1];
    const p2z = position[v2Index * 3 + 2];

    const p3x = position[v3Index * 3];
    const p3y = position[v3Index * 3 + 1];
    const p3z = position[v3Index * 3 + 2];

    const i1 = getPointIndex(p1x, p1y, p1z);
    const i2 = getPointIndex(p2x, p2y, p2z);
    const i3 = getPointIndex(p3x, p3y, p3z);

    profiles.set(profiles.size, [i1, i2, i3]);
  }

  const points: number[][] = [];
  for (const [, [, x, y, z]] of pointsMap) {
    points.push([x, y, z]);
  }

  const result: ShellData = {
    bbox,
    type: TFB.RepresentationClass.SHELL,
    profiles,
    holes: new Map(),
    points,
  };

  return result;
}

export function getShellData(geometry: {
  position: Float32Array;
  normals: Float32Array;
  index: Uint32Array;
  raw: boolean;
}): ShellData {
  const { position, normals, index, raw } = geometry;

  // TODO: Test to see if this is the correct threshold
  // if not applied, some geometries take too long to process
  const threshold = 3000;

  const precision = 1000000;
  const normalPrecision = 10000000;
  const planePrecision = 1000;

  const vertexCount = position.length / 3;
  const tooBigToShell = vertexCount > threshold;

  const bbox = getAABB(position);

  if (raw || tooBigToShell) {
    // Just generate a profile per triangle
    // useful for big irregular surfaces like terrains
    // console.log("Too big to Shell");

    return getRawShellData(index, position, bbox);
  }

  // We need to generate unique points, profiles and holes
  // - Get the faces (adjacend coplanar triangles)
  // - Get the profiles (edges that are not shared by two triangles of the same face)
  // - The profile is the biggest one; the rest are holes

  const tempPlane = new THREE.Plane();
  const tempNormal = new THREE.Vector3();
  const tempPoint = new THREE.Vector3();

  // 1. Group triangles in planes

  const coplanarTriangles = new Map<string, Plane>();

  for (let i = 0; i < index.length - 2; i += 3) {
    const v1Index = index[i];

    tempNormal.set(
      normals[v1Index * 3],
      normals[v1Index * 3 + 1],
      normals[v1Index * 3 + 2],
    );

    tempPoint.set(
      position[v1Index * 3],
      position[v1Index * 3 + 1],
      position[v1Index * 3 + 2],
    );

    tempPlane.setFromNormalAndCoplanarPoint(tempNormal, tempPoint);

    const plane = new Plane(tempPlane, planePrecision, normalPrecision);

    if (!coplanarTriangles.has(plane.id)) {
      coplanarTriangles.set(plane.id, plane);
    }

    coplanarTriangles.get(plane.id)!.faces.push(i);
  }

  // console.log(coplanarTriangles);

  // 2. Group coplanar triangles in faces, deduplicate vertices and get open edges

  const points = new Points(precision);
  const faces = new Faces();

  for (const [, plane] of coplanarTriangles) {
    for (const triangleIndex of plane.faces) {
      const v1Index = index[triangleIndex];
      const v2Index = index[triangleIndex + 1];
      const v3Index = index[triangleIndex + 2];

      if (!points.isValidTriangle(position, v1Index, v2Index, v3Index)) {
        // console.log("Invalid triangle");
        continue;
      }

      const p1 = points.create(position, v1Index);
      const p2 = points.create(position, v2Index);
      const p3 = points.create(position, v3Index);

      const e1 = new Edge(p1, p2);
      const e2 = new Edge(p2, p3);
      const e3 = new Edge(p3, p1);

      const triangle = [e1, e2, e3];
      faces.add(triangle, plane);
    }
  }
  // faces.list = new Map([[0, faces.list.get(0)!]]);

  // 3. Get all the profiles

  const profiles = new Map<number, number[]>();
  const holes = new Map<number, number[][]>();
  let faceCounter = 0;

  for (const [, face] of faces.list) {
    const profile = new Profiles(face.plane);
    const openEdges = face.getOpenEdges();

    for (const edge of openEdges) {
      profile.add(edge);
    }

    const resultProfiles = profile.getProfiles();

    profiles.set(faceCounter, resultProfiles?.profile || []);
    holes.set(faceCounter, resultProfiles?.holes || []);
    faceCounter++;
  }

  const result: ShellData = {
    bbox,
    type: TFB.RepresentationClass.SHELL,
    profiles,
    holes,
    points: points.get(),
  };

  // for(const point of result.points) {
  //   point[0] = point[0] * 1000;
  //   point[1] = point[1] * 1000;
  //   point[2] = point[2] * 1000;
  // }

  // console.log(result);

  return result;
}
