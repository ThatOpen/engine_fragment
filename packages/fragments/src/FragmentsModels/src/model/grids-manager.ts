import * as THREE from "three";
import { FragmentsModel } from "./fragments-model";
import { GridData } from "./model-types";

export class GridsManager {
  private model: FragmentsModel;

  private _grids = new THREE.Group();

  private _gridMaterial = new THREE.LineDashedMaterial({
    color: 0xffffff,
    linewidth: 5,
    depthTest: false,
    dashSize: 1,
    gapSize: 0.3,
  });

  constructor(model: FragmentsModel) {
    this.model = model;
  }

  async getGrids() {
    if (!this._grids.children.length) {
      await this.constructGrids();
    }
    return this._grids;
  }

  private async constructGrids() {
    const result = (await this.model.threads.invoke(
      this.model.modelId,
      "getGrids",
    )) as GridData[];

    const tempMatrix = new THREE.Matrix4();

    for (const gridData of result) {
      const grid = new THREE.Group();
      this._grids.add(grid);
      grid.userData.id = gridData.id;
      tempMatrix.fromArray(gridData.transform);
      grid.applyMatrix4(tempMatrix);
      this.getGridAxis(gridData, grid, "uAxes");
      this.getGridAxis(gridData, grid, "vAxes");
      this.getGridAxis(gridData, grid, "wAxes");
      this._grids.add(grid);
    }
  }

  private getGridAxis(
    gridData: GridData,
    grid: THREE.Group<THREE.Object3DEventMap>,
    axis: "uAxes" | "vAxes" | "wAxes",
  ) {
    for (const { curve, tag } of gridData[axis]) {
      const [x1, y1, x2, y2] = curve;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array([x1, y1, 0, x2, y2, 0]), 3),
      );
      const axisLine = new THREE.Line(geometry, this._gridMaterial);
      axisLine.userData.tag = tag;
      axisLine.computeLineDistances();
      axisLine.renderOrder = 1;
      grid.add(axisLine);
    }
  }

  dispose() {
    this._grids.removeFromParent();
    for (const grid of this._grids.children) {
      const line = grid as THREE.Mesh;
      line.geometry.dispose();
      line.geometry = undefined as any;
      line.material = undefined as any;
    }
    this._gridMaterial.dispose();
    this._gridMaterial = undefined as any;
  }
}
