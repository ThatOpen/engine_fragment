import * as THREE from "three";
import { ProfileSection } from "web-ifc";
import * as WEBIFC from "web-ifc";

export enum ProfileType {
  "H" = 0,
  "C" = 1,
  "Z" = 2,
  "T" = 3,
  "L" = 4,
}

export type ProfileData = {
  type?: ProfileType;
  width?: number;
  depth?: number;
  thickness?: number;
  flangeThickness?: number;
  hasFillet?: boolean;
  filletRadius?: number;
  radius?: number;
  slope?: number;
  circleSegments?: 20;
  placement?: THREE.Matrix4;
};

export class Profile {
  core: ProfileSection;

  static map = new Map<string, ProfileType>([
    ["H", ProfileType.H],
    ["C", ProfileType.C],
    ["Z", ProfileType.Z],
    ["T", ProfileType.T],
    ["L", ProfileType.L],
  ]);

  constructor(api: WEBIFC.IfcAPI) {
    this.core = api.CreateProfile() as ProfileSection;
  }

  get(api: WEBIFC.IfcAPI, data: ProfileData) {
    const type = data.type ?? 0;
    const width = data.width ?? 0.2;
    const depth = data.depth ?? 0.2;
    const thickness = data.thickness ?? 0.002;
    const flangeThickness = data.flangeThickness ?? 0.002;
    const hasFillet = data.hasFillet ?? false;
    const filletRadius = data.filletRadius ?? 0.001;
    const radius = data.radius ?? 0.01;
    const slope = data.slope ?? 0.001;
    const circleSegments = data.circleSegments ?? 20;

    const formattedPlacement = new api.wasmModule.DoubleVector(); // Flat vector

    const mat = data.placement ?? new THREE.Matrix4().identity();
    for (const element of mat.elements) {
      formattedPlacement.push_back(element);
    }

    const core = this.core as WEBIFC.ProfileSection;
    core.SetValues(
      type,
      width,
      depth,
      thickness,
      flangeThickness,
      hasFillet,
      filletRadius,
      radius,
      slope,
      circleSegments,
      // @ts-ignore
      formattedPlacement,
    );

    return core.GetBuffers();
  }
}
