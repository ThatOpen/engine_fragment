import * as THREE from "three";
import { Font } from "three/examples/jsm/Addons.js";
import { FragmentsModel } from "./fragments-model";
import { GridData } from "./model-types";

interface FontConfig {
  /**
   * @see {@link Font.generateShapes}
   * @default 0.2
   */
  size: number;

  /**
   * @see {@link Font.generateShapes}
   * @default "ltr"
   */
  direction: "ltr" | "rtl" | "tb";

  /**
   * Number of segments per shape. Expects a `Integer`.
   * @see {@link THREE.ShapeGeometry}
   * @default 12
   */
  curveSegments: number;
}

interface FlatLabelConfig extends FontConfig {
  font: Font;
}

type LabelConfig =
  | {
      show: true;

      /**
       * Three {@link Font} instance
       *
       * Convert font file to json: https://gero3.github.io/facetype.js/
       *
       * @example
       * import { Font, FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
       *
       * const font: Font = await new Promise((resolve, reject) =>
       *   new FontLoader().load(
       *     new URL("./assets/font.json", import.meta.url).href,
       *     resolve,
       *     undefined,
       *     reject
       *   )
       * );
       */
      font: Font;

      config?: Partial<FontConfig>;
    }
  | { show?: false };

export interface GridsConfig {
  labels?: LabelConfig;
}

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

  private _labelMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    flatShading: true,
    side: THREE.FrontSide,
    depthTest: false,
  });

  private _labelConfig?: FlatLabelConfig;
  private _labelMap = new Map<string, THREE.BufferGeometry>();

  constructor(model: FragmentsModel) {
    this.model = model;
  }

  async getGrids({ labels }: GridsConfig = {}) {
    let labelsNeedUpdate = false;
    if (labels?.show) {
      const a = this._labelConfig;
      const b: FlatLabelConfig = {
        size: 0.2,
        direction: "ltr",
        curveSegments: 12,
        ...labels.config,
        font: labels.font,
      };
      const isEqual =
        a &&
        a.font === b.font &&
        a.size === b.size &&
        a.direction === b.direction &&
        a.curveSegments === b.curveSegments;
      if (!isEqual) {
        labelsNeedUpdate = true;
        this._labelConfig = b;
      }
    } else if (this._labelConfig) {
      labelsNeedUpdate = true;
      delete this._labelConfig;
    }

    if (!this._grids.children.length) {
      await this.constructGrids();
      labelsNeedUpdate = true;
    }

    if (labelsNeedUpdate) {
      this._labelMap.forEach((geometry) => geometry.dispose());
      this._labelMap.clear();
      this._grids.traverse((object) => {
        if (object.userData.kind === "label") {
          // remove stale labels
          object.removeFromParent();
        } else if (this._labelConfig && object.userData.kind === "axis") {
          const gridAxis = object as THREE.Line;
          this.appendGridLabels(gridAxis, this._labelConfig);
        }
      });
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

  appendGridLabels(gridAxis: THREE.Line, config: FlatLabelConfig) {
    const { tag, axis } = gridAxis.userData;
    const position = gridAxis.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;

    let geometry = this._labelMap.get(tag);
    if (!geometry) {
      const { font, size, direction, curveSegments } = config;
      const shapes = font.generateShapes(tag, size, direction);
      geometry = new THREE.ShapeGeometry(shapes, curveSegments);
      geometry.computeBoundingBox();
      geometry.center();
      geometry.computeBoundingSphere();
      this._labelMap.set(tag, geometry);
    }

    const mesh0 = new THREE.Mesh(geometry, this._labelMaterial);
    const mesh1 = new THREE.Mesh(geometry, this._labelMaterial);

    const a = new THREE.Vector3().fromArray(position.array.slice(0, 3));
    const b = new THREE.Vector3().fromArray(position.array.slice(-3));
    const offset = new THREE.Vector3()
      .subVectors(b, a)
      .normalize()
      .multiplyScalar(0.5);
    const aPos = a.clone().sub(offset);
    const bPos = b.clone().add(offset);
    const z = new THREE.Vector3(0, 0, 1);
    const m0 = new THREE.Matrix4().setPosition(aPos).lookAt(aPos, a, z);
    const m1 = new THREE.Matrix4().setPosition(bPos).lookAt(bPos, b, z);

    mesh0.applyMatrix4(m0);
    mesh1.applyMatrix4(m1);

    mesh0.userData.kind = "label";
    mesh0.userData.tag = tag;
    mesh0.userData.axis = axis;
    mesh0.userData.index = 0;
    mesh0.renderOrder = 1;

    mesh1.userData.kind = "label";
    mesh1.userData.tag = tag;
    mesh1.userData.axis = axis;
    mesh1.userData.index = 1;
    mesh1.renderOrder = 1;

    gridAxis.parent!.add(mesh0, mesh1);
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
    this._labelMap.forEach((geometry) => geometry.dispose());
    this._labelMap.clear();
  }
}
