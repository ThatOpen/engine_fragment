import { VirtualFragmentsModel } from "../virtual-fragments-model";

export class CoordinatesHelper {
  getPositions(model: VirtualFragmentsModel, localIds: number[]) {
    const positions: { x: number; y: number; z: number }[] = [];
    const itemIds = model.properties.getItemIdsFromLocalIds(localIds);
    for (const id of itemIds) {
      const transform = model.tiles.meshes.globalTransforms(id);
      if (!transform) {
        continue;
      }
      const position = transform.position()!;
      const x = position.x();
      const y = position.y();
      const z = position.z();
      positions.push({ x, y, z });
    }
    return positions;
  }

  getCoordinates(model: VirtualFragmentsModel): number[] {
    const meshes = model.data.meshes()!;
    const coords = meshes.coordinates()!;
    const position = coords.position()!;
    const xDir = coords.xDirection()!;
    const yDir = coords.yDirection()!;
    const x = position.x();
    const y = position.y();
    const z = position.z();
    const xx = xDir.x();
    const xy = xDir.y();
    const xz = xDir.z();
    const yx = yDir.x();
    const yy = yDir.y();
    const yz = yDir.z();
    // prettier-ignore
    return [
        x, y, z, 
        xx, xy, xz, 
        yx, yy, yz
    ];
  }
}
