import * as THREE from "three";
import * as TFB from "../../Schema";
import { Points } from "./points";
import { Faces } from "./faces";
import { Profiles } from "./profiles";
import { Edge } from "./edge";
import { Plane } from "./plane";
import {
  RawCircleExtrusion,
  RawRepresentation,
  RawShell,
  RawTransformData,
} from "../edit";

export type ShellData = {
  type: TFB.RepresentationClass.SHELL;
  profiles: Map<number, number[]>;
  holes: Map<number, number[][]>;
  points: number[][];
  profilesFaceIds: number[];
  bbox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
};

export type GeometryProcessSettings = {
  // Geometries larger than this threshold will be processed as raw data
  // a good value seem to be 3000
  threshold: number;
  precision: number;
  normalPrecision: number;
  planePrecision: number;
};

export class GeomsFbUtils {
  // It's 65535, but we leave some margin
  static ushortMaxValue = 65000;

  static round(value: number, precission: number) {
    return Math.round(value * precission) / precission;
  }

  static getAABB(vertices: Float32Array | number[]) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];
      const z = vertices[i + 2];

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }

    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
    };
  }

  static transformFromMatrix(
    matrix: THREE.Matrix4,
    transform: RawTransformData = {
      position: [0, 0, 0],
      xDirection: [1, 0, 0],
      yDirection: [0, 1, 0],
    },
  ) {
    const posX = matrix.elements[12];
    const posY = matrix.elements[13];
    const posZ = matrix.elements[14];
    const xDirX = matrix.elements[0];
    const xDirY = matrix.elements[1];
    const xDirZ = matrix.elements[2];
    const yDirX = matrix.elements[4];
    const yDirY = matrix.elements[5];
    const yDirZ = matrix.elements[6];
    transform.position[0] = posX;
    transform.position[1] = posY;
    transform.position[2] = posZ;
    transform.xDirection[0] = xDirX;
    transform.xDirection[1] = xDirY;
    transform.xDirection[2] = xDirZ;
    transform.yDirection[0] = yDirX;
    transform.yDirection[1] = yDirY;
    transform.yDirection[2] = yDirZ;
    return transform;
  }

  static matrixFromTransform(transform: RawTransformData) {
    const localTransform = new THREE.Matrix4();
    const [px, py, pz] = transform.position;
    const [xx, xy, xz] = transform.xDirection;
    const [yx, yy, yz] = transform.yDirection;
    const vx = new THREE.Vector3(xx, xy, xz);
    const vy = new THREE.Vector3(yx, yy, yz);
    const { x: zx, y: zy, z: zz } = vx.cross(vy);

    // prettier-ignore
    localTransform.fromArray([
        xx, xy, xz, 0,
        yx, yy, yz, 0,
        zx, zy, zz, 0,
        px, py, pz, 1
      ]);
    return localTransform;
  }

  static bboxFromCircleExtrusion(data: RawCircleExtrusion) {
    const bbox = new THREE.Box3();
    const points: THREE.Vector3[] = [];
    for (const axis of data.axes) {
      for (const wire of axis.wires) {
        for (let i = 0; i < wire.length - 2; i += 3) {
          const x = wire[i];
          const y = wire[i + 1];
          const z = wire[i + 2];
          points.push(new THREE.Vector3(x, y, z));
        }
      }
    }
    bbox.setFromPoints(points);
    const minX = bbox.min.x;
    const minY = bbox.min.y;
    const minZ = bbox.min.z;
    const maxX = bbox.max.x;
    const maxY = bbox.max.y;
    const maxZ = bbox.max.z;

    return [minX, minY, minZ, maxX, maxY, maxZ];
  }

  static representationFromGeometry(
    newRepresentation: THREE.BufferGeometry<THREE.NormalBufferAttributes>,
    repr: RawRepresentation = {
      bbox: [0, 0, 0, 0, 0, 0],
      representationClass: TFB.RepresentationClass.SHELL,
      geometry: {
        points: [],
        type: TFB.ShellType.NONE,
        profiles: new Map(),
        holes: new Map(),
        bigHoles: new Map(),
        bigProfiles: new Map(),
        profilesFaceIds: [],
      },
    },
    settings: GeometryProcessSettings = {
      threshold: 3000,
      precision: 1000000,
      normalPrecision: 10000000,
      planePrecision: 1000,
    },
  ) {
    const positionAttr = newRepresentation.getAttribute("position")!;
    const position = positionAttr.array as Float32Array;
    const normalsAttr = newRepresentation.getAttribute("normal")!;
    const normals = normalsAttr.array as Float32Array;
    const indexAttr = newRepresentation.index!;
    const index = indexAttr.array as Uint32Array;

    const newShell = GeomsFbUtils.getShellData({
      position,
      normals,
      index,
      raw: false,
      settings,
    });

    const { min, max } = newShell.bbox;
    repr.bbox = [min.x, min.y, min.z, max.x, max.y, max.z];

    if (repr.representationClass === TFB.RepresentationClass.CIRCLE_EXTRUSION) {
      throw new Error("Circle extrusions can't be represented as shells");
    }

    const shellData = repr.geometry! as RawShell;

    const points = newShell.points;
    const isBigShell = points.length > GeomsFbUtils.ushortMaxValue;
    shellData.type = isBigShell ? TFB.ShellType.BIG : TFB.ShellType.NONE;

    shellData.points = points;
    shellData.profilesFaceIds = newShell.profilesFaceIds;

    if (isBigShell) {
      shellData.profiles = new Map();
      shellData.holes = new Map();
      shellData.bigHoles = newShell.holes;
      shellData.bigProfiles = newShell.profiles;
    } else {
      shellData.profiles = newShell.profiles;
      shellData.holes = newShell.holes;
      shellData.bigHoles = new Map();
      shellData.bigProfiles = new Map();
    }

    return repr;
  }

  static getRawShellData(
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
      profilesFaceIds: [],
    };

    // Quick hack: consider all the faces smooth, because these are usually terrains and low poly surfaces
    for (let i = 0; i < profiles.size; i++) {
      result.profilesFaceIds.push(0);
    }

    return result;
  }

  static getShellData(geometry: {
    position: Float32Array;
    normals: Float32Array;
    index: Uint32Array;
    raw: boolean;
    settings: GeometryProcessSettings;
  }): ShellData {
    const { position, normals, index, raw, settings } = geometry;

    const { threshold, precision, normalPrecision, planePrecision } = settings;

    const vertexCount = position.length / 3;
    const tooBigToShell = vertexCount > threshold;

    const bbox = this.getAABB(position);

    if (
      bbox.min.x === 0 &&
      bbox.min.y === 0 &&
      bbox.min.z === 0 &&
      bbox.max.x === 0 &&
      bbox.max.y === 0 &&
      bbox.max.z === 0
    ) {
      throw new Error("Bbox is not valid");
    }

    if (raw || tooBigToShell) {
      // Just generate a profile per triangle
      // useful for big irregular surfaces like terrains
      // console.log("Too big to Shell");

      return this.getRawShellData(index, position, bbox);
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

      if (openEdges.length === 0) {
        // TODO: Something went wrong with geometry generation. Just return raw data
        console.log("No open edges found. Using raw geometry.");
        return this.getRawShellData(index, position, bbox);
      }

      for (const edge of openEdges) {
        profile.add(edge);
      }

      const resultProfiles = profile.getProfiles();

      profiles.set(faceCounter, resultProfiles?.profile || []);
      holes.set(faceCounter, resultProfiles?.holes || []);
      faceCounter++;
    }

    let profileCounter = 0;
    const profileIndexMap = new Map<number, number>();
    const filteredProfiles = new Map<number, number[]>();
    for (const [id, profile] of profiles) {
      if (profile.length) {
        profileIndexMap.set(id, profileCounter);
        filteredProfiles.set(profileCounter, profile);
        profileCounter++;
      }
    }

    // To prevent empty holes
    const filteredHoles = new Map<number, number[][]>();
    for (const [id, hole] of holes) {
      if (hole.length) {
        const newHoleId = profileIndexMap.get(id)!;
        filteredHoles.set(newHoleId, hole);
      }
    }

    const result: ShellData = {
      bbox,
      type: TFB.RepresentationClass.SHELL,
      profiles: filteredProfiles,
      holes: filteredHoles,
      points: points.get(),
      profilesFaceIds: [],
    };

    this.computeShellFaceIds(result);

    // for(const point of result.points) {
    //   point[0] = point[0] * 1000;
    //   point[1] = point[1] * 1000;
    //   point[2] = point[2] * 1000;
    // }

    // console.log(result);

    return result;
  }

  private static computeShellFaceIds(shell: ShellData) {
    // TODO: Make this optional (e.g. for faster ifc processing?)
    // TODO:  Make this a parameter
    const threshold = 0.4;
    const faceIdPerProfile = new Map<number, number>();
    let nextFaceId = 0;

    // To generate an id per profile
    // for (const [id] of shell.profiles) {
    //   faceIdPerProfile.set(id, nextFaceId++);
    // }
    // return;

    // 1. generate edge - profilePair map

    // [edgeId, [profileIndex]]
    // edgeId is a number composed by joining two point indices with a decimal point
    const edgeFacePair = new Map<number, number[]>();
    const edgesPerProfile = new Map<number, number[]>();
    const profilesNormal = new Map<number, number[]>();

    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    const p3 = new THREE.Vector3();
    const n = new THREE.Vector3();
    const tempTriangle = new THREE.Triangle();

    const profilesLength = shell.profiles.size;
    for (let i = 0; i < profilesLength; i++) {
      const profile = shell.profiles.get(i)!;
      const indicesLength = profile.length;

      // Save edge
      for (let j = 0; j < indicesLength; j++) {
        const p1Index = profile[j];
        const isLast = j === indicesLength - 1;
        const p2Index = isLast ? profile[0] : profile[j + 1];
        // Ensure that the edge 6.4 is the same as 4.6
        const minIndex = Math.min(p1Index, p2Index);
        const maxIndex = Math.max(p1Index, p2Index);
        const edgeId = minIndex + this.makeDecimal(maxIndex);

        // Save this edge per profile
        if (!edgesPerProfile.has(i)) {
          edgesPerProfile.set(i, [edgeId]);
        } else {
          edgesPerProfile.get(i)!.push(edgeId);
        }

        // Save this profile per edge
        if (!edgeFacePair.has(edgeId)) {
          edgeFacePair.set(edgeId, [i]);
        } else {
          edgeFacePair.get(edgeId)!.push(i);
        }
      }

      // Save normal
      let index1 = 0;
      let index2 = 1;
      let index3 = 2;
      while (index3 < indicesLength) {
        const p1Index = profile[index1];
        const p2Index = profile[index2];
        const p3Index = profile[index3];

        p1.set(
          shell.points[p1Index][0],
          shell.points[p1Index][1],
          shell.points[p1Index][2],
        );
        p2.set(
          shell.points[p2Index][0],
          shell.points[p2Index][1],
          shell.points[p2Index][2],
        );
        p3.set(
          shell.points[p3Index][0],
          shell.points[p3Index][1],
          shell.points[p3Index][2],
        );

        tempTriangle.set(p1, p2, p3);
        tempTriangle.getNormal(n);

        // Check if triangle is valid e.g. not degenerate
        // if degenerate, try another triangle
        if (n.x !== 0 || n.y !== 0 || n.z !== 0) {
          break;
        }

        index1++;
        index2++;
        index3++;
      }

      profilesNormal.set(i, [n.x, n.y, n.z]);
    }

    // 2. for each face, determine if it's hard or not

    for (const [profile, edges] of edgesPerProfile) {
      // Get this profile data

      let faceId = faceIdPerProfile.get(profile);
      if (faceId === undefined) {
        faceId = nextFaceId++;
        faceIdPerProfile.set(profile, faceId);
      }

      const [nx1, ny1, nz1] = profilesNormal.get(profile)!;

      // For each profile connected to this profile
      for (const edge of edges) {
        const facePair = edgeFacePair.get(edge)!;
        for (const currentProfile of facePair) {
          if (currentProfile === profile) continue; // Same profile

          // Get the other profile normal
          const [nx2, ny2, nz2] = profilesNormal.get(currentProfile)!;
          // We use absolute to prevent problems with incorrect (inverted) normals
          const dot = Math.abs(nx1 * nx2 + ny1 * ny2 + nz1 * nz2);
          const isHard = dot < threshold;

          if (faceIdPerProfile.has(currentProfile)) {
            // This face was processed before
            // Check if it belongs to the same face as the face we are currently processing
            //  If it does, substitute that face id with the current face id for the whole map
            // That way, we merge coplanar face groups that are found late
            if (!isHard) {
              const currentFaceId = faceIdPerProfile.get(currentProfile)!;
              // Is this too slow?
              for (const [key, value] of faceIdPerProfile) {
                if (value === currentFaceId) {
                  faceIdPerProfile.set(key, faceId);
                }
              }
            }
          } else {
            // It's the first time we see this face
            // If it's smooth, use same id; otherwise, generate a new id
            const newFaceId = isHard ? nextFaceId++ : faceId;
            faceIdPerProfile.set(currentProfile, newFaceId);
          }
        }
      }
    }

    for (let i = 0; i < shell.profiles.size; i++) {
      if (!faceIdPerProfile.has(i)) {
        throw new Error(`Face id not found for profile ${i}`);
      }
    }

    const sortedKeys = Array.from(faceIdPerProfile.keys()).sort(
      (a, b) => a - b,
    );

    for (const key of sortedKeys) {
      const faceId = faceIdPerProfile.get(key)!;
      shell.profilesFaceIds.push(faceId);
    }
  }

  private static makeDecimal(value: number) {
    let num = 1;
    while (num <= value) {
      num *= 10;
    }
    return value / num;
  }
}
