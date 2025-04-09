import { CurrentLod, MeshData } from "../../model/model-types";
import { MiscHelper } from "../../utils";
import { VirtualFragmentsModel } from "../virtual-fragments-model";

export class GeometryHelper {
  getGeometriesLength(model: VirtualFragmentsModel) {
    return model.data.meshes()!.globalTransformsLength();
  }

  getGeometry(model: VirtualFragmentsModel, item: number): MeshData[] {
    const [itemIndex] = model.properties.getItemIdsFromLocalIds([item]);
    const sampleIds = model.boxes.sampleOf(itemIndex);
    const result: MeshData[] = [];
    if (!sampleIds) return result;

    for (const sampleId of sampleIds) {
      const sample = model.tiles.fetchSample(sampleId, CurrentLod.GEOMETRY);

      MiscHelper.forEach(sample.geometries, (d) => {
        result.push({
          transform: sample.transform.clone(),
          indices: d.indexBuffer,
          positions: d.positionBuffer,
          normals: d.normalBuffer,
        } as MeshData);
      });
    }
    return result;
  }
}
