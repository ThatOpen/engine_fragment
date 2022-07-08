import { BufferAttribute, BufferGeometry } from 'three';
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils';

export class GeometryUtils {
  static merge(geometriesByMaterial: BufferGeometry[][], splitByBlocks = false) {
    const geometriesByMat: BufferGeometry[] = [];
    const sizes: number[] = [];
    for (const geometries of geometriesByMaterial) {
      const merged = this.mergeGeomsOfSameMaterial(geometries, splitByBlocks);
      geometriesByMat.push(merged);
      sizes.push(merged.index!.count);
    }

    const geometry = mergeBufferGeometries(geometriesByMat);
    this.setupMaterialGroups(sizes, geometry);
    this.cleanUp(geometriesByMat);
    return geometry;
  }

  private static cleanUp(geometries: BufferGeometry[]) {
    geometries.forEach((geometry) => geometry.dispose());
    geometries.length = 0;
  }

  private static setupMaterialGroups(sizes: number[], geometry: BufferGeometry) {
    let vertexCounter = 0;
    let counter = 0;
    for (const size of sizes) {
      const group = { start: vertexCounter, count: size, materialIndex: counter++ };
      geometry.groups.push(group);
      vertexCounter += size;
    }
  }

  private static mergeGeomsOfSameMaterial(geometries: BufferGeometry[], splitByBlocks: boolean) {
    this.checkAllGeometriesAreIndexed(geometries);
    if (splitByBlocks) {
      this.splitByBlocks(geometries);
    }
    const merged = mergeBufferGeometries(geometries);
    this.cleanUp(geometries);
    return merged;
  }

  private static splitByBlocks(geometries: BufferGeometry[]) {
    let i = 0;
    for (const geometry of geometries) {
      const size = geometry.attributes.position.count;
      const array = new Uint8Array(size).fill(i++);
      geometry.setAttribute('blockID', new BufferAttribute(array, 1));
    }
  }

  private static checkAllGeometriesAreIndexed(geometries: BufferGeometry[]) {
    for (const geometry of geometries) {
      if (!geometry.index) {
        throw new Error('All geometries must be indexed!');
      }
    }
  }
}
