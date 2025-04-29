import { CurrentLod, MeshData } from "../../model/model-types";
import { MiscHelper } from "../../utils";
import { VirtualFragmentsModel } from "../virtual-fragments-model";

export class GeometryHelper {
  getGeometriesLength(model: VirtualFragmentsModel) {
    return model.data.meshes()!.globalTransformsLength();
  }

  getGeometry(model: VirtualFragmentsModel, localIds: number[]) {
    const indices = model.properties.getItemIdsFromLocalIds(localIds);

    const result: MeshData[][] = [];
    for (const index of indices) {
      const sampleIds = model.boxes.sampleOf(index);
      if (!sampleIds) {
        result.push([]);
        continue;
      }

      const localResult: MeshData[] = [];

      for (const sampleId of sampleIds) {
        const sample = model.tiles.fetchSample(sampleId, CurrentLod.GEOMETRY);

        MiscHelper.forEach(sample.geometries, (d) => {
          localResult.push({
            transform: sample.transform.clone(),
            indices: d.indexBuffer,
            positions: d.positionBuffer,
            normals: d.normalBuffer,
          } as MeshData);
        });
      }

      result.push(localResult);
    }

    return result;
  }
}
