import { BufferAttribute, BufferGeometry, Mesh } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";

export class GeometryUtils {
  static merge(
    geometriesByMaterial: BufferGeometry[][],
    splitByBlocks = false
  ) {
    const geometriesByMat: BufferGeometry[] = [];
    const sizes: number[] = [];
    for (const geometries of geometriesByMaterial) {
      const merged = this.mergeGeomsOfSameMaterial(geometries, splitByBlocks);
      geometriesByMat.push(merged);
      sizes.push(merged.index!.count);
    }

    const geometry = mergeGeometries(geometriesByMat);
    this.setupMaterialGroups(sizes, geometry);
    this.cleanUp(geometriesByMat);
    return geometry;
  }

  // When Three.js exports to glTF, it generates one separate mesh per material. All meshes
  // share the same BufferAttributes and have different indices
  static async mergeGltfMeshes(meshes: Mesh[]) {
    const geometry = new BufferGeometry();
    const attributes = meshes[0].geometry.attributes;
    this.getMeshesAttributes(geometry, attributes);
    this.getMeshesIndices(geometry, meshes);
    return geometry;
  }

  private static getMeshesAttributes(
    geometry: BufferGeometry,
    attributes: any
  ) {
    // Three.js GLTFExporter exports custom BufferAttributes as underscore lowercase
    // eslint-disable-next-line no-underscore-dangle
    geometry.setAttribute("blockID", attributes._blockid);
    geometry.setAttribute("position", attributes.position);
    geometry.setAttribute("normal", attributes.normal);
    geometry.groups = [];
  }

  private static getMeshesIndices(geometry: BufferGeometry, meshes: Mesh[]) {
    const counter = { index: 0, material: 0 };
    const indices: number[] = [];
    for (const mesh of meshes) {
      const index = mesh.geometry.index!;
      this.getIndicesOfMesh(index, indices);
      this.getMeshGroup(geometry, counter, index);
      this.cleanUpMesh(mesh);
    }
    geometry.setIndex(indices);
  }

  private static getMeshGroup(
    geometry: BufferGeometry,
    counter: any,
    index: BufferAttribute
  ) {
    geometry.groups.push({
      start: counter.index,
      count: index.count,
      materialIndex: counter.material++,
    });
    counter.index += index.count;
  }

  private static cleanUpMesh(mesh: Mesh) {
    mesh.geometry.setIndex([]);
    mesh.geometry.attributes = {};
    mesh.geometry.dispose();
  }

  private static getIndicesOfMesh(index: BufferAttribute, indices: number[]) {
    for (const number of index.array as Uint32Array) {
      indices.push(number);
    }
  }

  private static cleanUp(geometries: BufferGeometry[]) {
    geometries.forEach((geometry) => geometry.dispose());
    geometries.length = 0;
  }

  private static setupMaterialGroups(
    sizes: number[],
    geometry: BufferGeometry
  ) {
    let vertexCounter = 0;
    let counter = 0;
    for (const size of sizes) {
      const group = {
        start: vertexCounter,
        count: size,
        materialIndex: counter++,
      };
      geometry.groups.push(group);
      vertexCounter += size;
    }
  }

  private static mergeGeomsOfSameMaterial(
    geometries: BufferGeometry[],
    splitByBlocks: boolean
  ) {
    this.checkAllGeometriesAreIndexed(geometries);
    if (splitByBlocks) {
      this.splitByBlocks(geometries);
    }
    const merged = mergeGeometries(geometries);
    this.cleanUp(geometries);
    return merged;
  }

  private static splitByBlocks(geometries: BufferGeometry[]) {
    let i = 0;
    for (const geometry of geometries) {
      const size = geometry.attributes.position.count;
      // TODO: Substitute blockID attribute by block id map
      const array = new Uint16Array(size).fill(i++);
      geometry.setAttribute("blockID", new BufferAttribute(array, 1));
    }
  }

  private static checkAllGeometriesAreIndexed(geometries: BufferGeometry[]) {
    for (const geometry of geometries) {
      if (!geometry.index) {
        throw new Error("All geometries must be indexed!");
      }
    }
  }
}
