import * as FB from "flatbuffers";
import * as TFB from "../../Schema";
import * as ET from "./edit-types";
import { copyFloatVector } from "./misc-functions";

export function createShell(builder: FB.Builder, shell: ET.RawShell) {
  const shellType = shell.type;

  const profiles: number[] = [];
  const holes: number[] = [];
  const bigProfiles: number[] = [];
  const bigHoles: number[] = [];

  // Meshes.shells.points
  const pointsLength = shell.points.length;
  TFB.Shell.startPointsVector(builder, pointsLength);
  for (let i = 0; i < pointsLength; i++) {
    const j = pointsLength - 1 - i;
    const currentPoint = shell.points[j];
    TFB.FloatVector.createFloatVector(
      builder,
      currentPoint[0],
      currentPoint[1],
      currentPoint[2],
    );
  }
  const pointsOffset = builder.endVector();

  // Meshes.shells.profiles
  for (const [, current] of shell.profiles) {
    const indicesOffset = TFB.ShellProfile.createIndicesVector(
      builder,
      current,
    );
    const profileOffset = TFB.ShellProfile.createShellProfile(
      builder,
      indicesOffset,
    );
    profiles.push(profileOffset);
  }

  const shellProfilesOffset = TFB.Shell.createProfilesVector(builder, profiles);

  // Meshes.shells.holes
  for (const [profileId, currents] of shell.holes) {
    for (const current of currents) {
      const indicesOffset = TFB.ShellHole.createIndicesVector(builder, current);
      const holeOffset = TFB.ShellHole.createShellHole(
        builder,
        indicesOffset,
        profileId,
      );
      holes.push(holeOffset);
    }
  }

  const shellHolesOffset = TFB.Shell.createHolesVector(builder, holes);

  // Meshes.shells.bigProfiles
  for (const [, current] of shell.bigProfiles) {
    const bigIndicesOffset = TFB.BigShellProfile.createIndicesVector(
      builder,
      current,
    );
    const bigProfileOffset = TFB.BigShellProfile.createBigShellProfile(
      builder,
      bigIndicesOffset,
    );
    bigProfiles.push(bigProfileOffset);
  }

  const bigShellProfilesOffset = TFB.Shell.createBigProfilesVector(
    builder,
    bigProfiles,
  );

  // Meshes.shells.bigHoles
  for (const [profileId, currents] of shell.bigHoles) {
    for (const current of currents) {
      const bigIndicesOffset = TFB.BigShellHole.createIndicesVector(
        builder,
        current,
      );
      const bigHoleOffset = TFB.BigShellHole.createBigShellHole(
        builder,
        bigIndicesOffset,
        profileId,
      );
      bigHoles.push(bigHoleOffset);
    }
  }

  const bigShellHolesOffset = TFB.Shell.createBigHolesVector(builder, bigHoles);

  const shellFaceIdsOffset = TFB.Shell.createProfilesFaceIdsVector(
    builder,
    shell.profilesFaceIds,
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
  return shellOffset;
}

export function copyShell(builder: FB.Builder, shell: TFB.Shell) {
  const shellType = shell.type();

  const profiles: number[] = [];
  const holes: number[] = [];
  const bigProfiles: number[] = [];
  const bigHoles: number[] = [];

  // Meshes.shells.points
  const pointsLength = shell.pointsLength();
  TFB.Shell.startPointsVector(builder, pointsLength);
  for (let i = 0; i < pointsLength; i++) {
    const j = pointsLength - 1 - i;
    const currentPoint = shell.points(j) as TFB.FloatVector;
    copyFloatVector(builder, currentPoint);
  }
  const pointsOffset = builder.endVector();

  // Meshes.shells.profiles
  const profilesLength = shell.profilesLength();
  for (let i = 0; i < profilesLength; i++) {
    const current = shell.profiles(i) as TFB.ShellProfile;
    const indices = current.indicesArray() as Uint16Array;
    const indicesOffset = TFB.ShellProfile.createIndicesVector(
      builder,
      indices,
    );
    const profileOffset = TFB.ShellProfile.createShellProfile(
      builder,
      indicesOffset,
    );
    profiles.push(profileOffset);
  }

  const shellProfilesOffset = TFB.Shell.createProfilesVector(builder, profiles);

  // Meshes.shells.holes
  const holesLength = shell.holesLength();
  for (let i = 0; i < holesLength; i++) {
    const current = shell.holes(i) as TFB.ShellHole;
    const indices = current.indicesArray() as Uint16Array;
    const profileId = current.profileId();
    const indicesOffset = TFB.ShellHole.createIndicesVector(builder, indices);
    const holeOffset = TFB.ShellHole.createShellHole(
      builder,
      indicesOffset,
      profileId,
    );
    holes.push(holeOffset);
  }

  const shellHolesOffset = TFB.Shell.createHolesVector(builder, holes);

  // Meshes.shells.bigProfiles
  const bigProfilesLength = shell.bigProfilesLength();
  for (let i = 0; i < bigProfilesLength; i++) {
    const current = shell.bigProfiles(i) as TFB.BigShellProfile;
    const indices = current.indicesArray() as Uint32Array;
    const indicesOffset = TFB.BigShellProfile.createIndicesVector(
      builder,
      indices,
    );
    const bigProfileOffset = TFB.BigShellProfile.createBigShellProfile(
      builder,
      indicesOffset,
    );
    bigProfiles.push(bigProfileOffset);
  }

  const bigShellProfilesOffset = TFB.Shell.createBigProfilesVector(
    builder,
    bigProfiles,
  );

  // Meshes.shells.bigHoles
  const bigHolesLength = shell.bigHolesLength();
  for (let i = 0; i < bigHolesLength; i++) {
    const current = shell.bigHoles(i) as TFB.BigShellHole;
    const indices = current.indicesArray() as Uint32Array;
    const profileId = current.profileId();
    const indicesOffset = TFB.BigShellHole.createIndicesVector(
      builder,
      indices,
    );
    const bigHoleOffset = TFB.BigShellHole.createBigShellHole(
      builder,
      indicesOffset,
      profileId,
    );
    bigHoles.push(bigHoleOffset);
  }

  const bigShellHolesOffset = TFB.Shell.createBigHolesVector(builder, bigHoles);

  const shellFaceIdsOffset = TFB.Shell.createProfilesFaceIdsVector(
    builder,
    shell.profilesFaceIdsArray() || [],
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
  return shellOffset;
}
