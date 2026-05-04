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

  /**
   * Label offset from line's tip, negative values will offset label onto line.
   * When using negative values that may exceed the axis line,
   * you may want to set the label's material `side` to `THREE.DoubleSide`.
   * @default 0.5
   */
  offset: number;
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
       * const font = await new Promise<Font>((resolve, reject) =>
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

  private _gridMaterial: THREE.LineBasicMaterial = new THREE.LineDashedMaterial(
    {
      color: 0xffffff,
      linewidth: 5,
      depthTest: false,
      dashSize: 1,
      gapSize: 0.3,
    },
  );

  private _labelMaterial: THREE.Material = new THREE.MeshPhongMaterial({
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
    let labelsNeedRepositioning = false;

    if (labels?.show) {
      const incomingConfig: FlatLabelConfig = {
        size: 0.2,
        direction: "ltr",
        curveSegments: 12,
        offset: 0.5,
        ...labels.config,
        font: labels.font,
      };

      if (
        !!this._labelConfig &&
        this._labelConfig.offset !== incomingConfig.offset
      ) {
        this._labelConfig.offset = incomingConfig.offset;
        labelsNeedRepositioning = true;
      }

      const isEqual =
        !!this._labelConfig &&
        this._labelConfig.font === incomingConfig.font &&
        this._labelConfig.size === incomingConfig.size &&
        this._labelConfig.direction === incomingConfig.direction &&
        this._labelConfig.curveSegments === incomingConfig.curveSegments;

      if (!isEqual) {
        labelsNeedUpdate = true;
        this._labelConfig = incomingConfig;
      }
    } else if (this._labelConfig) {
      labelsNeedUpdate = true;
      delete this._labelConfig;
    }

    if (!this._grids.children.length) {
      await this.constructGrids();
      labelsNeedUpdate = true;
    }

    const axisGroups: THREE.Group[] = [];

    if (labelsNeedUpdate) {
      const staleCache = [...this._labelMap];
      this._labelMap.clear();

      const pairs: [THREE.Group, [THREE.Object3D, THREE.Object3D]][] = [];

      this._grids.traverse((object) => {
        if (object.userData.kind === "label") {
          // remove stale labels
          const label = object as THREE.Mesh;
          label.removeFromParent();
        } else if (this._labelConfig && object.userData.kind === "axis") {
          const gridAxisGroup = object as THREE.Group;
          const { tag, axis } = gridAxisGroup.userData;
          const labels = this.createGridLabels({
            tag,
            axis,
            config: this._labelConfig,
          });
          pairs.push([gridAxisGroup, labels]);
          axisGroups.push(gridAxisGroup);
        }
      });

      for (const [group, labels] of pairs) {
        group.add(...labels);
      }

      for (const [, geometry] of staleCache) {
        geometry.dispose();
      }
    } else if (labelsNeedRepositioning) {
      this._grids.traverse((object) => {
        if (object.userData.kind === "axis") {
          const gridAxisGroup = object as THREE.Group;
          axisGroups.push(gridAxisGroup);
        }
      });
    }

    for (const group of axisGroups) {
      // safeguard against consumer mutations
      const [line, label0, label1] = group.children as [
        THREE.Line | undefined,
        THREE.Mesh | undefined,
        THREE.Mesh | undefined,
      ];
      const position = line?.geometry.getAttribute("position").array;
      if (!position) continue;
      const [m0, m1] = this.getGridLabelMatrices(
        position,
        this._labelConfig?.offset ?? 0.5,
      );
      if (label0) {
        label0.matrix.copy(m0);
        label0.matrix.decompose(
          label0.position,
          label0.quaternion,
          label0.scale,
        );
      }
      if (label1) {
        label1.matrix.copy(m1);
        label1.matrix.decompose(
          label1.position,
          label1.quaternion,
          label1.scale,
        );
      }
    }

    return this._grids;
  }

  /**
   * The shared line material used for every grid axis. Mutating its
   * properties (color, opacity, dash sizes, etc.) updates all rendered grid
   * lines without needing to traverse the returned `Object3D`. Replace it
   * with a different material via `setGridMaterial` if you need a different
   * material class.
   */
  getGridMaterial(): THREE.LineBasicMaterial {
    return this._gridMaterial;
  }

  /**
   * Replace the shared grid material. Walks already-constructed lines and
   * reassigns their `.material`, then disposes the previous material to
   * release GPU resources.
   */
  setGridMaterial(material: THREE.LineBasicMaterial): void {
    const prev = this._gridMaterial;
    this._gridMaterial = material;
    this._grids.traverse((child) => {
      if (child instanceof THREE.Line) {
        child.material = material;
      }
    });
    if (prev !== material) prev.dispose();
  }

  /**
   * The shared material used for every grid axis label. Mutating its
   * properties (color, opacity, dash sizes, etc.) updates all rendered grid
   * labels without needing to traverse the returned `Object3D`. Replace it
   * with a different material via `setGridMaterial` if you need a different
   * material class.
   */
  getLabelMaterial(): THREE.Material {
    return this._labelMaterial;
  }

  /**
   * Replace the shared label material. Walks already-constructed labels and
   * reassigns their `.material`, then disposes the previous material to
   * release GPU resources.
   */
  setLabelMaterial(material: THREE.Material): void {
    const prev = this._labelMaterial;
    this._labelMaterial = material;
    this._grids.traverse((child) => {
      if (child.userData.kind === "label") {
        (child as THREE.Mesh).material = material;
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
      axisLine.computeLineDistances();
      axisLine.userData.tag = tag;
      axisLine.userData.kind = "line";
      axisLine.userData.axis = axis;
      axisLine.renderOrder = 1;

      const axisGroup = new THREE.Group();
      axisGroup.userData.tag = tag;
      axisGroup.userData.kind = "axis";
      axisGroup.userData.axis = axis;
      axisGroup.renderOrder = 1;

      axisGroup.add(axisLine);
      grid.add(axisGroup);
    }
  }

  createGridLabels({
    tag,
    axis,
    config,
  }: {
    tag: string;
    axis: string;
    config: FlatLabelConfig;
  }): [THREE.Mesh, THREE.Mesh] {
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
    mesh0.userData.kind = "label";
    mesh0.userData.tag = tag;
    mesh0.userData.axis = axis;
    mesh0.userData.index = 0;
    mesh0.renderOrder = 1;

    const mesh1 = new THREE.Mesh(geometry, this._labelMaterial);
    mesh1.userData.kind = "label";
    mesh1.userData.tag = tag;
    mesh1.userData.axis = axis;
    mesh1.userData.index = 1;
    mesh1.renderOrder = 1;

    return [mesh0, mesh1];
  }

  getGridLabelMatrices(position: THREE.TypedArray, offsetScalar: number) {
    const a = new THREE.Vector3().fromArray(position.slice(0, 3));
    const b = new THREE.Vector3().fromArray(position.slice(-3));
    const offset = new THREE.Vector3()
      .subVectors(b, a)
      .normalize()
      .multiplyScalar(offsetScalar);
    const aPos = a.clone().sub(offset);
    const bPos = b.clone().add(offset);
    const z = new THREE.Vector3(0, 0, 1);
    const m0 = new THREE.Matrix4().setPosition(aPos).lookAt(aPos, b, z);
    const m1 = new THREE.Matrix4().setPosition(bPos).lookAt(bPos, a, z);
    return [m0, m1];
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
    this._labelMaterial.dispose();
    this._labelMaterial = undefined as any;
    delete this._labelConfig;
    this._labelMap.forEach((geometry) => geometry.dispose());
    this._labelMap.clear();
  }
}
