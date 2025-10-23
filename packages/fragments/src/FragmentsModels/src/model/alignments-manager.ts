import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { FragmentsModel } from "./fragments-model";
import {
  AlignmentCurveType,
  AlignmentCurve,
  AlignmentData,
} from "./model-types";

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
  private _absoluteAlignments = new THREE.Group();
  private _horizontalAlignments = new THREE.Group();
  private _verticalAlignments = new THREE.Group();

  private _alignmentMaterials = new Map<AlignmentCurveType, LineMaterial>([
    [
      AlignmentCurveType.NONE,
      new LineMaterial({
        color: 0xffffff,
        linewidth: 5,
        depthTest: false,
      }),
    ],
    [
      AlignmentCurveType.LINES,
      new LineMaterial({
        color: 0xff00ff,
        linewidth: 5,
        depthTest: false,
      }),
    ],
    [
      AlignmentCurveType.CLOTHOID,
      new LineMaterial({
        color: 0xff0000,
        linewidth: 5,
        depthTest: false,
      }),
    ],
    [
      AlignmentCurveType.ELLIPSE_ARC,
      new LineMaterial({
        color: 0x00ffff,
        linewidth: 5,
        depthTest: false,
      }),
    ],
    [
      AlignmentCurveType.PARABOLA,
      new LineMaterial({
        color: 0x0000ff,
        linewidth: 5,
        depthTest: false,
      }),
    ],
  ]);

  constructor(model: FragmentsModel) {
    this.model = model;
  }

  async getAlignments() {
    if (!this._absoluteAlignments.children.length) {
      await this.constructAlignments();
    }
    return this._absoluteAlignments;
  }

  async getHorizontalAlignments() {
    if (!this._horizontalAlignments.children.length) {
      await this.constructAlignments();
    }
    return this._horizontalAlignments;
  }

  async getVerticalAlignments() {
    if (!this._verticalAlignments.children.length) {
      await this.constructAlignments();
    }
    return this._verticalAlignments;
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
      this.constructLine(alignmentData.absolute, this._absoluteAlignments);
      this.constructLine(alignmentData.horizontal, this._horizontalAlignments);
      this.constructLine(alignmentData.vertical, this._verticalAlignments);
    }
  }

  private constructLine(data: AlignmentCurve[], parent: THREE.Group) {
    if (!data.length) {
      return;
    }

    const iPoints: number[] = [];
    const ePoints: number[] = [];

    const alignment = new THREE.Group();
    parent.add(alignment);

    const firstPoints = data[0].points;
    const lastPoints = data[data.length - 1].points;
    ePoints.push(lastPoints[0], lastPoints[1], lastPoints[2]);
    ePoints.push(
      firstPoints[firstPoints.length - 3],
      firstPoints[firstPoints.length - 2],
      firstPoints[firstPoints.length - 1],
    );

    for (const curve of data) {
      const points = curve.points;

      iPoints.push(points[0], points[1], points[2]);
      iPoints.push(
        points[points.length - 3],
        points[points.length - 2],
        points[points.length - 1],
      );

      const geometry = new LineGeometry();
      geometry.setPositions(points);
      const material = this._alignmentMaterials.get(curve.type);
      const line = new Line2(geometry, material);
      alignment.add(line);
      line.renderOrder = 1;
      // Otherwise we can't retrieve the points later (e.g. for raycasting)
      line.userData.points = points;
    }

    const { interior, exterior } = this._endpointsMaterials;
    this.constructPoints(iPoints, interior, alignment);
    this.constructPoints(ePoints, exterior, alignment);
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
    this._absoluteAlignments.removeFromParent();
    for (const alignment of this._absoluteAlignments.children) {
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
