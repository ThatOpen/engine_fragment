import * as WEBIFC from "web-ifc";
import * as THREE from "three";

export type BooleanOperationData = {
  type: "DIFFERENCE" | "UNION";
  target: THREE.Mesh;
  operands: THREE.Mesh[];
};

export class BooleanOperation {
  core: WEBIFC.BooleanOperator;

  constructor(api: WEBIFC.IfcAPI) {
    this.core = api.CreateBooleanOperator() as WEBIFC.BooleanOperator;
  }

  get(api: WEBIFC.IfcAPI, data: BooleanOperationData) {
    const targetGeom = data.target.geometry;
    const firstData: number[] = [];
    const pos = targetGeom.attributes.position.array;
    const index = targetGeom.index!.array;

    const tempVector = new THREE.Vector3();

    for (let i = 0; i < index.length - 2; i += 3) {
      const i1 = index[i];
      const i2 = index[i + 1];
      const i3 = index[i + 2];
      tempVector.set(pos[i1 * 3], pos[i1 * 3 + 1], pos[i1 * 3 + 2]);
      tempVector.applyMatrix4(data.target.matrixWorld);
      firstData.push(tempVector.x);
      firstData.push(tempVector.y);
      firstData.push(tempVector.z);

      tempVector.set(pos[i2 * 3], pos[i2 * 3 + 1], pos[i2 * 3 + 2]);
      tempVector.applyMatrix4(data.target.matrixWorld);
      firstData.push(tempVector.x);
      firstData.push(tempVector.y);
      firstData.push(tempVector.z);

      tempVector.set(pos[i3 * 3], pos[i3 * 3 + 1], pos[i3 * 3 + 2]);
      tempVector.applyMatrix4(data.target.matrixWorld);
      firstData.push(tempVector.x);
      firstData.push(tempVector.y);
      firstData.push(tempVector.z);
    }


    const secondData = [];

    for (const operand of data.operands) {
      const oDataEntry: number[] = [];
      const oIndex = operand.geometry.index!.array;
      const oPos = operand.geometry.attributes.position.array;

      for (let i = 0; i < oIndex.length - 2; i += 3) {
        const i1 = index[i];
        const i2 = index[i + 1];
        const i3 = index[i + 2];

        tempVector.set(oPos[i1 * 3], oPos[i1 * 3 + 1], oPos[i1 * 3 + 2]);
        tempVector.applyMatrix4(operand.matrixWorld);
        oDataEntry.push(tempVector.x);
        oDataEntry.push(tempVector.y);
        oDataEntry.push(tempVector.z);

        tempVector.set(oPos[i2 * 3], oPos[i2 * 3 + 1], oPos[i2 * 3 + 2]);
        tempVector.applyMatrix4(operand.matrixWorld);
        oDataEntry.push(tempVector.x);
        oDataEntry.push(tempVector.y);
        oDataEntry.push(tempVector.z);

        tempVector.set(oPos[i3 * 3], oPos[i3 * 3 + 1], oPos[i3 * 3 + 2]);
        tempVector.applyMatrix4(operand.matrixWorld);
        oDataEntry.push(tempVector.x);
        oDataEntry.push(tempVector.y);
        oDataEntry.push(tempVector.z);
      }
      secondData.push(oDataEntry);
    }

    this.core.clear();

    const solidPoints = new api.wasmModule.DoubleVector(); // Flat vector

    for (const p of firstData) {
      solidPoints.push_back(p);
    }

    this.core.SetValues(solidPoints, data.type);

    for (const s of secondData) {
      const secondPoints = new api.wasmModule.DoubleVector(); // Flat vector
      for (const p of s) {
        secondPoints.push_back(p);
      }
      this.core.SetSecond(secondPoints);
    }

    return this.core.GetBuffers();
  }
}
