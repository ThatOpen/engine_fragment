import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { FragmentsModel } from "./fragments-model";
import { AlignmentData } from "./model-types";
import { GeometryClass } from "../../../Schema";

export class AlignmentsManager {
  private model: FragmentsModel;

  private _endpointsMaterials = {
    interior: new THREE.PointsMaterial({
      color: 0xeeeeee,
      size: 8,
      sizeAttenuation: false,
      depthTest: false,
    }),
    exterior: new THREE.PointsMaterial({
      color: 0xffffff,
      size: 16,
      sizeAttenuation: false,
      depthTest: false,
    }),
  };

  // Each alignment is a THREE.Group of THREE.Line2 (curves) and THREE.Points (endpoints)
  private _alignments = new THREE.Group();

  private _alignmentMaterials: Record<GeometryClass, LineMaterial> = {
    [GeometryClass.NONE]: new LineMaterial({
      color: 0xffffff,
      linewidth: 5,
      depthTest: false,
    }),
    [GeometryClass.LINES]: new LineMaterial({
      color: 0xff00ff,
      linewidth: 5,
      depthTest: false,
    }),
    [GeometryClass.CLOTHOID]: new LineMaterial({
      color: 0xff0000,
      linewidth: 5,
      depthTest: false,
    }),
    [GeometryClass.ELLIPSE_ARC]: new LineMaterial({
      color: 0x00ffff,
      linewidth: 5,
      depthTest: false,
    }),
    [GeometryClass.PARABOLA]: new LineMaterial({
      color: 0x0000ff,
      linewidth: 5,
      depthTest: false,
    }),
  };

  constructor(model: FragmentsModel) {
    this.model = model;
  }

  async getAlignments() {
    if (!this._alignments.children.length) {
      await this.constructAlignments();
    }
    return this._alignments;
  }

  async getAlignmentStyles() {
    return { ...this._alignmentMaterials, ...this._endpointsMaterials };
  }

  private async constructAlignments() {
    const result = (await this.model.threads.invoke(
      this.model.modelId,
      "getAlignments",
    )) as AlignmentData[];

    // Construct the curves
    for (const alignmentData of result) {
      const absolute = alignmentData.absolute;

      const iPoints: number[] = [];
      const epoints: number[] = [];

      const alignment = new THREE.Group();
      this._alignments.add(alignment);

      let previousPoint: number[] | null = null;

      const firstPoints = absolute[0].points;
      const lastPoints = absolute[absolute.length - 1].points;
      epoints.push(firstPoints[0], firstPoints[1], firstPoints[2]);
      epoints.push(
        lastPoints[lastPoints.length - 3],
        lastPoints[lastPoints.length - 2],
        lastPoints[lastPoints.length - 1],
      );

      // console.log(epoints);

      for (const curve of absolute) {
        let points = curve.points;

        // Temp, to ensure continuity
        if (previousPoint) {
          points = new Float32Array([...previousPoint, ...points]);
        }
        previousPoint = [
          curve.points[curve.points.length - 3],
          curve.points[curve.points.length - 2],
          curve.points[curve.points.length - 1],
        ];

        iPoints.push(points[0], points[1], points[2]);
        iPoints.push(
          points[points.length - 3],
          points[points.length - 2],
          points[points.length - 1],
        );

        const geometry = new LineGeometry();
        geometry.setPositions(points);
        const material = this._alignmentMaterials[curve.type];
        const line = new Line2(geometry, material);
        alignment.add(line);
        line.renderOrder = 1;
        // Otherwise we can't retrieve the points later (e.g. for raycasting)
        line.userData.points = points;
      }

      const { interior, exterior } = this._endpointsMaterials;
      this.constructPoints(iPoints, interior, alignment);
      this.constructPoints(epoints, exterior, alignment);
    }
  }

  private constructPoints(
    pointsArray: number[],
    material: THREE.PointsMaterial,
    alignment: THREE.Group,
  ) {
    const points = new THREE.Points();
    const pointsGeom = new THREE.BufferGeometry();
    const pointsBuffer = new Float32Array(pointsArray);
    const pointsAttr = new THREE.BufferAttribute(pointsBuffer, 3);
    pointsGeom.setAttribute("position", pointsAttr);
    points.geometry = pointsGeom;
    points.material = material;
    alignment.add(points);
    points.renderOrder = 2;
    // console.log(points);
  }

  dispose() {
    this._alignments.removeFromParent();
    for (const alignment of this._alignments.children) {
      const line = alignment as THREE.Mesh;
      line.geometry.dispose();
      line.geometry = undefined as any;
      line.material = undefined as any;
    }
    for (const material of Object.values(this._alignmentMaterials)) {
      material.dispose();
    }
    this._alignmentMaterials = {} as any;
  }
}
