import * as THREE from "three";
import { FragmentsModel } from "./fragments-model";

export class CoordinatesManager {
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
