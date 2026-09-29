import { describe, expect, test } from "vitest";
import * as THREE from "three";
import { MeshManager } from "./mesh-manager";
import { BIMMesh } from "./model-types";

// three r185 (mrdoob/three.js#33746) made `updateWorldMatrix()` honour
// `matrixWorldNeedsUpdate`. A tile writes its own `matrix` with
// `matrixAutoUpdate = false`, so unless it raises the flag, everything built
// on `updateWorldMatrix()` (getWorldPosition, Box3.setFromObject, attach...)
// reads the identity world matrix until the next render (#309).

function streamTileInto(model: THREE.Object3D, matrix: THREE.Matrix4) {
  const meshes = new MeshManager(() => {});
  const tile = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
  ) as unknown as BIMMesh;
  // The exact sequence a CREATE tile request runs.
  (meshes as any).setMeshData(tile, 1, 2, matrix);
  model.add(tile);
  return tile;
}

function placedModel() {
  const scene = new THREE.Scene();
  const model = new THREE.Object3D();
  model.position.set(100, 0, 0);
  scene.add(model);
  // The model has already been rendered once when its tiles stream in.
  scene.updateMatrixWorld();
  return model;
}

describe(`tile world matrix before the next render (three r${THREE.REVISION})`, () => {
  const matrix = new THREE.Matrix4().makeTranslation(10, 0, 0);

  test("equals parent.matrixWorld * matrix after updateWorldMatrix", () => {
    const model = placedModel();
    const tile = streamTileInto(model, matrix);
    tile.updateWorldMatrix(true, false);
    const expected = model.matrixWorld.clone().multiply(matrix);
    expect(tile.matrixWorld.elements).toEqual(expected.elements);
  });

  test("getWorldPosition and Box3.setFromObject see the tile where it is", () => {
    const model = placedModel();
    const tile = streamTileInto(model, matrix);
    const position = tile.getWorldPosition(new THREE.Vector3());
    expect(position.toArray()).toEqual([110, 0, 0]);
    const box = new THREE.Box3().setFromObject(model);
    expect(box.min.toArray()).toEqual([109.5, -0.5, -0.5]);
  });
});
