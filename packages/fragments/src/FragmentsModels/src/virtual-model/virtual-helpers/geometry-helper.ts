import { CurrentLod, MeshData } from "../../model/model-types";
import { VirtualFragmentsModel } from "../virtual-fragments-model";

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export class GeometryHelper {
  getGeometriesLength(model: VirtualFragmentsModel) {
    return model.data.meshes()!.globalTransformsLength();
  }

  getGeometry(model: VirtualFragmentsModel, itemIndex: number): MeshData[] {
    const sampleIds = model.boxes.sampleOf(itemIndex);
    const result: MeshData[] = [];
    if (!sampleIds) return result;

    for (const sampleId of sampleIds) {
      const sample = model.tiles.fetchSample(sampleId, CurrentLod.GEOMETRY);
      const geometries = Array.isArray(sample.geometries)
        ? sample.geometries
        : [sample.geometries];

      for (const geometry of geometries) {
        result.push({
          transform: sample.transform.clone(),
          indices: geometry.indexBuffer,
          positions: geometry.positionBuffer,
          normals: geometry.normalBuffer,
        });
      }
    }

    return result;
  }

  getVolume(model: VirtualFragmentsModel, id: number) {
    let volume = 0;
    const p1: Vector3 = { x: 0, y: 0, z: 0 };
    const p2: Vector3 = { x: 0, y: 0, z: 0 };
    const p3: Vector3 = { x: 0, y: 0, z: 0 };

    const geometries = this.getGeometry(model, id);
    for (const { indices, positions } of geometries) {
      if (!(indices && positions)) continue;
      for (let i = 0; i < indices.length - 2; i += 3) {
        const i1 = indices[i] * 3;
        const i2 = indices[i + 1] * 3;
        const i3 = indices[i + 2] * 3;
        p1.x = positions[i1];
        p1.y = positions[i1 + 1];
        p1.z = positions[i1 + 2];
        p2.x = positions[i2];
        p2.y = positions[i2 + 1];
        p2.z = positions[i2 + 2];
        p3.x = positions[i3];
        p3.y = positions[i3 + 1];
        p3.z = positions[i3 + 2];
        volume += this.getSignedVolumeOfTriangle(p1, p2, p3);
      }
    }

    return Math.abs(volume);
  }

  private getSignedVolumeOfTriangle(p1: Vector3, p2: Vector3, p3: Vector3) {
    const v321 = p3.x * p2.y * p1.z;
    const v231 = p2.x * p3.y * p1.z;
    const v312 = p3.x * p1.y * p2.z;
    const v132 = p1.x * p3.y * p2.z;
    const v213 = p2.x * p1.y * p3.z;
    const v123 = p1.x * p2.y * p3.z;
    return (1.0 / 6.0) * (-v321 + v231 + v312 - v132 - v213 + v123);
  }
}
