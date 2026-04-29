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

  /**
   * The shared `LineDashedMaterial` used for every grid axis. Mutating its
   * properties (color, opacity, dash sizes, etc.) updates all rendered grid
   * lines without needing to traverse the returned `Object3D`. Replace it
   * with a different material via `setGridMaterial` if you need a different
   * material class.
   */
  getGridMaterial(): THREE.LineDashedMaterial {
    return this._gridMaterial;
  }

  /**
   * Replace the shared grid material. Walks already-constructed lines and
   * reassigns their `.material`, then disposes the previous material to
   * release GPU resources.
   */
  setGridMaterial(material: THREE.LineDashedMaterial): void {
    const prev = this._gridMaterial;
    this._gridMaterial = material;
    this._grids.traverse((child) => {
      if (child instanceof THREE.Line) {
        child.material = material;
      }
    });
    if (prev !== material) prev.dispose();
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
      grid.userData.kind = "grid";
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
      // Grid axis curves are stored as a flat array of 3D points:
      // [x1, y1, z1, x2, y2, z2, ...]. Some IFC files (BLOXHUB) store axis
      // endpoints as 3D IFCCARTESIANPOINTs even though the axes are planar,
      // so reading 4 values flat (treating points as 2D) silently drops the
      // y of the second point and produces a fan-shaped misplacement.
      const positions = new Float32Array(curve);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      const axisLine = new THREE.Line(geometry, this._gridMaterial);
      axisLine.userData.tag = tag;
      axisLine.userData.kind = "axis";
      axisLine.userData.axis = axis;
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
