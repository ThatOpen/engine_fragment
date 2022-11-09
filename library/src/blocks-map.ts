import { Material } from "three";
import {
  IFragmentGeometry,
  IFragment,
  IndicesMap,
  VertexGroup,
} from "./base-types";

export class BlocksMap {
  indices: IndicesMap;

  constructor(fragment: IFragment) {
    this.indices = BlocksMap.initializeBlocks(fragment);
    this.generateGeometryIndexMap(fragment);
  }

  private generateGeometryIndexMap(fragment: IFragment) {
    const geometry = fragment.mesh.geometry;
    for (const group of geometry.groups) {
      this.fillBlocksMapWithGroupInfo(group, geometry);
    }
  }

  getSubsetID(modelID: number, material?: Material, customID = "DEFAULT") {
    const baseID = modelID;
    const materialID = material ? material.uuid : "DEFAULT";
    return `${baseID} - ${materialID} - ${customID}`;
  }

  // Use this only for destroying the current IFCLoader instance
  dispose() {
    (this.indices as any) = null;
  }

  private static initializeBlocks(fragment: IFragment) {
    const geometry = fragment.mesh.geometry;
    const startIndices = geometry.index.array as Uint32Array;
    return {
      indexCache: startIndices.slice(0, geometry.index.array.length),
      map: new Map(),
    };
  }

  private fillBlocksMapWithGroupInfo(
    group: VertexGroup,
    geometry: IFragmentGeometry
  ) {
    let prevBlockID = -1;

    const materialIndex = group.materialIndex as number;
    const materialStart = group.start;
    const materialEnd = materialStart + group.count - 1;

    let objectStart = -1;
    let objectEnd = -1;

    for (let i = materialStart; i <= materialEnd; i++) {
      const index = geometry.index.array[i];
      const blockID = geometry.attributes.blockID.array[index];

      // First iteration
      if (prevBlockID === -1) {
        prevBlockID = blockID;
        objectStart = i;
      }

      // It's the end of the material, which also means end of the object
      const isEndOfMaterial = i === materialEnd;
      if (isEndOfMaterial) {
        const store = this.getMaterialStore(blockID, materialIndex);
        store.push(objectStart, materialEnd);
        break;
      }

      // Still going through the same object
      if (prevBlockID === blockID) continue;

      // New object starts; save previous object

      // Store previous object
      const store = this.getMaterialStore(prevBlockID, materialIndex);
      objectEnd = i - 1;
      store.push(objectStart, objectEnd);

      // Get ready to process next object
      prevBlockID = blockID;
      objectStart = i;
    }
  }

  private getMaterialStore(id: number, matIndex: number) {
    // If this object wasn't store before, add it to the map
    if (this.indices.map.get(id) === undefined) {
      this.indices.map.set(id, {});
    }
    const storedIfcItem = this.indices.map.get(id);
    if (storedIfcItem === undefined)
      throw new Error("Geometry map generation error");

    // If this material wasn't stored for this object before, add it to the object
    if (storedIfcItem[matIndex] === undefined) {
      storedIfcItem[matIndex] = [];
    }
    return storedIfcItem[matIndex];
  }
}
