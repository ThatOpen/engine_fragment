import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import {
  BufferGeometry,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  MeshPhysicalMaterial,
  Object3D
} from 'three';
import { Fragment } from './fragment';
import { ExportedFragment, Items } from './base-types';
import { GeometryUtils } from './geometry-utils';

export class FragmentLoader {
  private loader = new GLTFLoader();

  async load(geometryURL: string, dataURL: string) {
    const loadedGeom = await this.loader.loadAsync(geometryURL);
    const sceneRoot = loadedGeom.scene.children[0];
    const hasChildren = !!sceneRoot.children.length;
    const meshes = (hasChildren ? sceneRoot.children : [loadedGeom.scene.children[0]]) as Mesh[];
    const geometry = await GeometryUtils.mergeGltfMeshes(meshes);
    const materials = this.getMaterials(meshes);
    const items = await this.getItems(dataURL);
    return this.getFragment(geometry, materials, items);
  }

  private getFragment(geometry: BufferGeometry, materials: MeshLambertMaterial[], items: any[]) {
    const fragment = new Fragment(geometry, materials, items.length);

    for (let i = 0; i < items.length; i++) {
      fragment.setInstance(i, items[i]);
    }

    return fragment;
  }

  private async getItems(url: string) {
    const dataResponse = await fetch(url);
    const data = await dataResponse.json();
    return this.getInstances(data);
  }

  private getInstances(data: ExportedFragment) {
    let idCounter = 0;
    const items: Items[] = [];
    const blockCount = data.matrices.length === 16 ? data.ids.length : 1;

    for (let matrixIndex = 0; matrixIndex < data.matrices.length - 15; matrixIndex += 16) {
      const matrixArray = [];

      for (let j = 0; j < 16; j++) {
        matrixArray.push(data.matrices[j + matrixIndex]);
      }

      const transform = new Matrix4().fromArray(matrixArray);
      const start = idCounter * blockCount;
      const ids = data.ids.slice(start, start + blockCount);
      idCounter++;
      items.push({ ids, transform });
    }

    return items;
  }

  private getMaterials(meshes: Object3D[]) {
    return meshes.map((child) => {
      const mesh = child as Mesh;
      const material = mesh.material as MeshPhysicalMaterial;
      return new MeshLambertMaterial({
        color: material.color,
        opacity: material.opacity,
        transparent: material.transparent
      });
    });
  }
}
