import * as THREE from "three";
import { VirtualBoxStructure } from "./virtual-box-structure";
import { Representation, Sample, Model, Meshes } from "../../../Schema";
import { TransformHelper } from "../utils";
import { DataBuffer } from "../model/model-types";

export class VirtualBoxController {
  lookup: VirtualBoxStructure | null = null;

  private readonly _boxSize = 6;
  private readonly _pointSize = 3;
  private readonly _temp: {
    box: THREE.Box3;
    vector: THREE.Vector3;
    transform: THREE.Matrix4;
    sample: Sample;
    representation: Representation;
  };

  private _dimensionsOfSamples: DataBuffer;
  private _samples: number[][] = [];
  private _boxes: DataBuffer;
  private _meshes: Meshes;
  private _box: THREE.Box3;

  get fullBox() {
    return this._box;
  }

  set fullBox(box: THREE.Box3) {
    this._box = box;
  }

  constructor(fragments: Model) {
    this._temp = {
      box: new THREE.Box3(),
      vector: new THREE.Vector3(),
      transform: new THREE.Matrix4(),
      sample: new Sample(),
      representation: new Representation(),
    };

    this._box = new THREE.Box3();

    const meshes = fragments.meshes();

    if (!meshes) {
      throw new Error("Fragments: Malformed fragments data!");
    }

    this._meshes = meshes;
    const sampleCount = meshes.samplesLength();
    this._dimensionsOfSamples = new Float32Array(sampleCount);

    const boxSize = sampleCount * this._boxSize;
    this._boxes = new Float64Array(boxSize);
    this.lookup = this.newLookup();
  }

  sampleOf(id: number): number[] | undefined {
    return this._samples[id];
  }

  get(id: number): THREE.Box3 {
    const minPosition = this.getMinPosition(id);
    const maxPosition = this.getMaxPosition(id);
    this._temp.box.min.fromArray(this._boxes, minPosition);
    this._temp.box.max.fromArray(this._boxes, maxPosition);
    return this._temp.box;
  }

  process(id: number): void {
    this.fetchSampleAndRepresentation(id);
    this.getBox();
    this.addToFullBox();
    const minPosition = this.getMinPosition(id);
    const maxPosition = this.getMaxPosition(id);
    this._temp.box.min.toArray(this._boxes, minPosition);
    this._temp.box.max.toArray(this._boxes, maxPosition);
  }

  getCount() {
    return this._boxes.length / this._boxSize;
  }

  dimensionOf(id: number) {
    const dimension = this._dimensionsOfSamples[id];
    if (!dimension) {
      throw new Error("Fragments: Dimension not found!");
    }
    return dimension;
  }

  private newLookup() {
    const sampleCount = this._meshes.samplesLength();
    const itemsCount = this._meshes.globalTransformsLength();

    // Empty model
    if (sampleCount === 0) {
      return null;
    }

    for (let i = 0; i < sampleCount; i++) {
      this.fetchSampleAndRepresentation(i);
      TransformHelper.getBox(this._temp.representation, this._temp.box);
      const dimension = this._temp.box.getSize(this._temp.vector);
      this._dimensionsOfSamples[i] = dimension.length();
      this.process(i);
    }

    this._samples = new Array(itemsCount);
    for (let i = 0; i < sampleCount; i++) {
      this.storeBox(i);
    }

    if (!this.getCount()) {
      throw new Error("Fragments: Malformed boxes!");
    }

    return new VirtualBoxStructure(this);
  }

  private getBox() {
    TransformHelper.get(this._temp.sample, this._meshes, this._temp.transform);
    TransformHelper.getBox(this._temp.representation, this._temp.box);
    this._temp.box.applyMatrix4(this._temp.transform);
  }

  private fetchSampleAndRepresentation(id: number) {
    this._meshes.samples(id, this._temp.sample);
    const representationId = this._temp.sample.representation();
    this._meshes.representations(representationId, this._temp.representation);
  }

  private getMinPosition(id: number) {
    return id * this._boxSize;
  }

  private storeBox(id: number) {
    this.fetchSampleAndRepresentation(id);
    const sampleId = this._temp.sample.item();
    if (this._samples[sampleId] === undefined) {
      this._samples[sampleId] = [];
    }
    this._samples[sampleId].push(id);
  }

  private getMaxPosition(id: number) {
    return id * this._boxSize + this._pointSize;
  }

  private addToFullBox() {
    this.fullBox.union(this._temp.box);
  }
}
