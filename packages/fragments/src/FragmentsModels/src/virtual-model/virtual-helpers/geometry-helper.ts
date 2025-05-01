import { CurrentLod, MeshData } from "../../model/model-types";
import { VirtualFragmentsModel } from "../virtual-fragments-model";

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
}
