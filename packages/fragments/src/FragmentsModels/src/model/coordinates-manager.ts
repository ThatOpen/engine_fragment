import * as THREE from "three";
import { FragmentsModel } from "./fragments-model";

export class CoordinatesManager {
  private _coordinationMatrices = new Map<string, THREE.Matrix4>();

  async getCoordinationMatrix(model: FragmentsModel) {
    let matrix = this._coordinationMatrices.get(model.modelId);
    if (matrix) {
      return matrix;
    }

    matrix = new THREE.Matrix4();
    this._coordinationMatrices.set(model.modelId, matrix);

    const [x, y, z, xx, xy, xz, yx, yy, yz] = await this.getCoordinates(model);

    const xDir = new THREE.Vector3(xx, xy, xz);
    const yDir = new THREE.Vector3(yx, yy, yz);
    const zDir = new THREE.Vector3().crossVectors(xDir, yDir);

    matrix.set(
      xx,
      yx,
      zDir.x,
      x,
      xy,
      yy,
      zDir.y,
      y,
      xz,
      yz,
      zDir.z,
      z,
      0,
      0,
      0,
      1,
    );

    return matrix;
  }

  async getCoordinates(model: FragmentsModel) {
    const id = model.modelId;
    return model.threads.invoke(id, "getCoordinates") as Promise<number[]>;
  }

  async getPositions(model: FragmentsModel, localIds?: number[]) {
    const args = [localIds];
    const localPositions = await model.threads.invoke(
      model.modelId,
      "getPositions",
      args,
    );
    return this.getAbsolutePositions(localPositions, model);
  }

  private getAbsolutePositions(
    result: { x: number; y: number; z: number }[],
    model: FragmentsModel,
  ) {
    const positions: THREE.Vector3[] = [];
    for (const position of result) {
      const { x, y, z } = position;
      const vector = new THREE.Vector3(x, y, z);
      vector.applyMatrix4(model.object.matrixWorld);
      positions.push(vector);
    }
    return positions;
  }
}
