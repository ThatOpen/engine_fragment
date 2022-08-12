import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { MeshLambertMaterial, Matrix4 } from 'three';
import { GeometryUtils } from 'bim-fragment/dist/geometry-utils';

export class Models {
  loader = new GLTFLoader();

  async getChair() {
    const meshes = await this.getChairModel('../models/chair.glb');
    const geometries = meshes.map((mesh) => [mesh.geometry]);
    const material = this.getLambertMaterials(meshes);

    // All parts of the chair are the same item, so splitByBlock = false
    const geometry = GeometryUtils.merge(geometries);
    return { geometry, material };
  }

  async getWalls() {
    const walls = [
      await this.getWallModel('../models/wall_1.glb'),
      await this.getWallModel('../models/wall_2.glb'),
      await this.getWallModel('../models/wall_3.glb'),
      await this.getWallModel('../models/wall_4.glb')
    ];

    const geometries = [walls.map(wall => wall.geometry)];

    // All walls have the same material
    const color = walls[0].material.color;
    const material = new MeshLambertMaterial({ color });

    // Each wall is a different item, so splitByBlocks = true
    const geometry = GeometryUtils.merge(geometries, true);
    return { geometry, material };
  }

  getLambertMaterials(meshes) {
    return meshes.map(mesh => {
      const mat = mesh.material;
      const lambertMaterial = new MeshLambertMaterial({
        color: mat.color,
        transparent: mat.transparent,
        opacity: mat.opacity
      });
      mat.dispose();
      return lambertMaterial;
    });
  }

  async getChairModel(url) {
    const loaded = await this.loader.loadAsync(url);
    return loaded.scene.children[0].children;
  }

  async getWallModel(url) {
    const loaded = await this.loader.loadAsync(url);
    return loaded.scene.children[0];
  }

  // Create many chair instances
  generateInstances(fragment, count, offset) {
    const rootCount = Math.cbrt(count);
    let counter = 0;
    for (let i = 0; i < rootCount; i++) {
      for (let j = 0; j < rootCount; j++) {
        for (let k = 0; k < rootCount; k++) {

          const matrix = new Matrix4();
          matrix.setPosition(i * offset, j * offset, k * offset);
          const id = `${i}${j}${k}`;
          fragment.setInstance(counter++, {ids: [id], transform: matrix})
        }
      }
    }
  }
}
