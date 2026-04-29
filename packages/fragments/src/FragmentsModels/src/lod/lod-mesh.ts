import * as THREE from "three";
import { LodMaterial } from "./lod-material";
import { LODGeometry } from "./lod-geometry";
import { LodHelper } from "./lod-helper";

export class LODMesh extends THREE.Mesh {
  declare geometry: LODGeometry;
  declare material: LodMaterial[];

  constructor(geometry: LODGeometry, material: LodMaterial[]) {
    super(geometry, material);
    this.geometry = geometry;
    this.material = material;
    LodHelper.setupLodMeshResize(this);
  }
}
