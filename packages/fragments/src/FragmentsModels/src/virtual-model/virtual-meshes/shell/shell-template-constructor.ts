import { AnyTileBasicData, TileBasicData } from "../types";
import { limitOf2Bytes, ObjectClass } from "../../../model/model-types";
// @ts-ignore
import { earcut } from "../../../utils/geometry/earcut";
import {
  BigShellHole,
  BigShellProfile,
  Shell,
  ShellHole,
  ShellProfile,
  ShellType,
} from "../../../../../Schema";
import { ShellUtils } from "./shell-utils";

export class ShellTemplateConstructor {
  private _shellHole = new ShellHole();
  private _bigShellHole = new BigShellHole();
  holePoints = 0;
  profilePoints = 0;
  triangleAmount = 0;
  indexCount = 0;
  meshes: AnyTileBasicData = [];
  private _shellProfile = new ShellProfile();
  private _bigShellProfile = new BigShellProfile();

  newMeshTemplate(shell: Shell) {
    const isEmpty = this.getIsEmpty(shell);
    if (isEmpty) {
      return { objectClass: ObjectClass.SHELL };
    }
    this.reset(true);
    this.processShell(shell);
    return this.getResult();
  }

  private manageDataLeft() {
    const isDataLeft = this.getIsDataLeft();
    if (isDataLeft) {
      this.setMesh();
    }
  }

  private getIsEmpty(shell: Shell) {
    const length = ShellUtils.getProfilesLength(shell);
    return length === 0;
  }

  private processShellHoles(shell: Shell, id: number) {
    let shellHolesExist = false;
    const count = ShellUtils.getHolesLength(shell);
    const hole = this.getTempHole(shell);
    for (let i = 0; i < count; i++) {
      ShellUtils.getHole(shell, i, hole);
      const profileId = hole.profileId();
      if (profileId !== id) continue;
      this.updateBuffers(shell, shellHolesExist);
      shellHolesExist = true;
    }

    this.manageFoundHoles(shell, shellHolesExist);
  }

  private newMesh() {
    return {
      objectClass: ObjectClass.SHELL,
      indexCount: this.triangleAmount * 3,
      positionCount: (this.holePoints + this.profilePoints) * 3,
      normalCount: (this.holePoints + this.profilePoints) * 3,
    } as TileBasicData;
  }

  private reset(evenMeshes: boolean) {
    this.holePoints = 0;
    this.profilePoints = 0;
    this.triangleAmount = 0;
    if (evenMeshes) {
      this.meshes = undefined as any;
    }
  }

  private getIsDataLeft() {
    const areTriangles = this.triangleAmount > 0;
    const areHoles = this.holePoints > 0;
    const areProfiles = this.profilePoints > 0;
    return areTriangles || areHoles || areProfiles;
  }

  private processShell(shell: Shell) {
    const count = ShellUtils.getProfilesLength(shell);
    const profile = this.getTempProfile(shell);
    for (let id = 0; id < count; id++) {
      ShellUtils.getProfile(shell, id, profile);
      this.indexCount = profile.indicesLength();
      this.profilePoints += this.indexCount;
      this.processShellHoles(shell, id);
      this.manageMemory();
    }
    this.manageDataLeft();
  }

  private manageFoundHoles(shell: Shell, shellHolesExist: boolean) {
    const profile = this.getTempProfile(shell);
    const indicesAmount = profile.indicesLength();

    if (shellHolesExist) {
      this.triangleAmount += indicesAmount;
      return;
    }

    if (indicesAmount > 2) {
      this.triangleAmount += indicesAmount - 2;
    }
  }

  private getResult() {
    const meshes = this.meshes as TileBasicData;
    this.meshes = undefined as any;
    return meshes;
  }

  private manageMemory() {
    const memory = this.holePoints + this.profilePoints + this.indexCount;
    const memoryOverflow = memory > limitOf2Bytes;
    if (memoryOverflow) {
      this.setMesh();
    }
  }

  private updateBuffers(shell: Shell, shellHolesExist: boolean) {
    const hole = this.getTempHole(shell);
    this.holePoints += hole.indicesLength();
    this.triangleAmount += hole.indicesLength();
    if (shellHolesExist) {
      this.triangleAmount += 2;
    }
  }

  private setMesh() {
    const mesh = this.newMesh();
    if (!this.meshes) {
      this.meshes = mesh;
    } else if (Array.isArray(this.meshes)) {
      this.meshes.push(mesh);
    } else {
      this.meshes = [this.meshes, mesh];
    }
    this.reset(false);
  }

  private getTempProfile(shell: Shell) {
    if (shell.type() === ShellType.BIG) {
      return this._bigShellProfile;
    }
    return this._shellProfile;
  }

  private getTempHole(shell: Shell) {
    if (shell.type() === ShellType.BIG) {
      return this._bigShellHole;
    }
    return this._shellHole;
  }
}
