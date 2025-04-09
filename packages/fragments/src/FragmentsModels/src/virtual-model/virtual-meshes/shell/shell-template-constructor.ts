import { AnyTileBasicData, TileBasicData } from "../types";
import { limitOf2Bytes, ObjectClass } from "../../../model/model-types";
// @ts-ignore
import { earcut } from "../../../utils/geometry/earcut";
import { Shell, ShellHole, ShellProfile } from "../../../../../Schema";

export class ShellTemplateConstructor {
  shellHole = new ShellHole();
  shellProfile = new ShellProfile();
  holePoints = 0;
  profilePoints = 0;
  triangleAmount = 0;
  indexCount = 0;
  meshes: AnyTileBasicData = [];

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
    return shell.profilesLength() === 0;
  }

  private processShellHoles(shell: Shell, id: number) {
    let shellHolesExist = false;
    const count = shell.holesLength();
    for (let i = 0; i < count; i++) {
      shell.holes(i, this.shellHole);
      const profileId = this.shellHole.profileId();
      if (profileId !== id) continue;
      this.updateBuffers(shellHolesExist);
      shellHolesExist = true;
    }

    this.manageFoundHoles(shellHolesExist);
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
    const count = shell.profilesLength();
    for (let id = 0; id < count; id++) {
      shell.profiles(id, this.shellProfile);
      this.indexCount = this.shellProfile.indicesLength();
      this.profilePoints += this.indexCount;
      this.processShellHoles(shell, id);
      this.manageMemory();
    }
    this.manageDataLeft();
  }

  private manageFoundHoles(shellHolesExist: boolean) {
    const indicesAmount = this.shellProfile.indicesLength();

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

  private updateBuffers(shellHolesExist: boolean) {
    this.holePoints += this.shellHole.indicesLength();
    this.triangleAmount += this.shellHole.indicesLength();
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
}
