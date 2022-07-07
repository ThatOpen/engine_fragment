import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import { Mesh, MeshLambertMaterial, BufferAttribute } from 'three';
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils';

export class Models {
  loader = new GLTFLoader();

  async getChair() {
    const chairScene = await this.loader.loadAsync('../models/chair.glb');
    const meshes = chairScene.scene.children[0].children;
    return this.mergeGeometries(meshes);
  }

  async getWalls() {
    const wall1 = await this.getWall('../models/wall_1.glb');
    const wall2 = await this.getWall('../models/wall_2.glb');
    const wall3 = await this.getWall('../models/wall_3.glb');
    const wall4 = await this.getWall('../models/wall_4.glb');

    const walls = [wall1, wall2, wall3, wall4];

    const previousMat = wall1.material;
    const material = new MeshLambertMaterial({color: previousMat});

    let i = 0;
    for(const wall of walls) {
      const size = wall.geometry.attributes.position.count;
      const array = new Uint8Array(size).fill(i++);
      wall.geometry.setAttribute('blockID', new BufferAttribute(array, 1));
    }

    const geometries = walls.map(wall => wall.geometry);
    const geometry = mergeBufferGeometries(geometries);

    return { geometry, material };
  }



  mergeGeometries(meshes) {
    const geometries = meshes.map(mesh => mesh.geometry);
    const sizes = meshes.map(mesh => mesh.geometry.index.count);

    const material = meshes.map(mesh => {
      const mat = mesh.material;
      const result = new MeshLambertMaterial({
        color: mat.color,
        transparent: mat.transparent,
        opacity: mat.opacity
      });
      mat.dispose();
      return result;
    });

    const geometry = mergeBufferGeometries(geometries);
    geometries.forEach(geometry => geometry.dispose());

    let vertexCounter = 0;
    let counter = 0;
    for (let size of sizes) {
      const group = {start: vertexCounter, count: size, materialIndex: counter++};
      geometry.groups.push(group);
      vertexCounter += size;
    }
    return {material, geometry};
  }

  async getWall(url) {
    const loaded = await this.loader.loadAsync(url);
    return loaded.scene.children[0];
  }

}


