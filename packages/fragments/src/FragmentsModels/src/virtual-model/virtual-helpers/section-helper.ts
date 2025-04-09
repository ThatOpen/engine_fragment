import * as THREE from "three";
import { VirtualFragmentsModel } from "../virtual-fragments-model";
import { CurrentLod } from "../../model/model-types";
import { MiscHelper, SectionGenerator } from "../../utils";

export class SectionHelper {
  private _sectionGenerator = new SectionGenerator();

  async getSection(model: VirtualFragmentsModel, plane: THREE.Plane) {
    // TODO: Accept item IDs to traverse in the args

    this._sectionGenerator.plane = plane;

    // Traverse all items of the model to get all intersecting geometries

    // @ts-ignore
    const start = performance.now();
    const itemsLength = model.properties.getItemsCount();
    const visitedGeometries = new Map<number, THREE.BufferGeometry[]>();

    const meshes: THREE.Mesh[] = [];

    for (let itemID = 0; itemID < itemsLength; itemID++) {
      const sampleIds = model.boxes.sampleOf(itemID);
      if (!sampleIds) continue;
      for (const sampleId of sampleIds) {
        // Fast check if the plane intersects this geometry instance
        const boundingBox = model.boxes.get(sampleId);
        if (!plane.intersectsBox(boundingBox)) {
          continue;
        }

        // It intersects, so let's compute the edges and fills

        // TODO: Allow user to select which categories to include
        const localIDIndex = model.tiles.meshes.meshesItems(itemID)!;
        const category = model.data.categories(localIDIndex);
        if (category === "IFCSPACE") {
          continue;
        }

        const sample = model.tiles.meshes.samples(sampleId);
        if (!sample) continue;
        const definitionID = sample.representation();

        if (!visitedGeometries.has(definitionID)) {
          // This geometry hasn't been processed yet, so let's process it

          const geometries: THREE.BufferGeometry[] = [];

          const sampleGeom = model.tiles.fetchSample(
            sampleId,
            CurrentLod.GEOMETRY,
          );

          MiscHelper.forEach(sampleGeom.geometries, (geometryData) => {
            if (!geometryData.indexBuffer || !geometryData.positionBuffer) {
              return;
            }
            const geometry = new THREE.BufferGeometry();
            geometry.setIndex(Array.from(geometryData.indexBuffer));
            geometry.setAttribute(
              "position",
              new THREE.BufferAttribute(geometryData.positionBuffer, 3),
            );
            geometries.push(geometry);
          });

          visitedGeometries.set(definitionID, geometries);
        }

        const geometries = visitedGeometries.get(definitionID);
        if (!geometries) continue;

        for (const geometry of geometries) {
          const mesh = new THREE.Mesh(geometry);
          const transform = model.tiles.getSampleTransform(sampleId);
          mesh.applyMatrix4(transform);
          mesh.updateWorldMatrix(true, true);
          meshes.push(mesh);
        }
      }
    }

    // Now that we have all intersecting meshes, compute the edges and fills

    // TODO: Increase this as needed?
    const buffer = new Float32Array(600000);
    const posAttr = new THREE.BufferAttribute(buffer, 3, false);

    // meshes.length = 0;
    // meshes.push(new Mesh(new BoxGeometry(1, 1, 1)));

    const { index, indexes } = this._sectionGenerator.createEdges({
      meshes,
      posAttr,
    });
    const fillsIndices = this._sectionGenerator.createFills(buffer, indexes);

    // console.log(performance.now() - start);

    // Clean up
    for (const [, geometries] of visitedGeometries) {
      for (const geometry of geometries) {
        geometry.dispose();
      }
    }

    const result = {
      buffer,
      index,
      fillsIndices,
    };
    return result;
  }
}
