import * as THREE from "three";
import { LODGeometry, LODMesh } from "../lod";
import { LodHelper } from "../lod/lod-helper";
import { BIMMesh, CurrentLod } from "./model-types";
import { MaterialManager } from "./material-manager";

export class LODManager {
  private _materials: MaterialManager;
  // TODO: Deduplicate with other white values
  private readonly white = 0xffffffff;

  constructor(materials: MaterialManager) {
    this._materials = materials;
  }

  createMesh(geometry: THREE.BufferGeometry, request: any) {
    const material = this._materials.getFromRequest(request);
    if (!("isLodMaterial" in material && material.isLodMaterial)) {
      throw new Error("Fragments: material is not an instance of LodMaterial.");
    }

    const { positions } = request;
    if (!positions) {
      throw new Error(
        "Fragments: no positions provided to create the LOD mesh.",
      );
    }

    const lodGeometry = new LODGeometry();
    const deleteEvent = this.deleteAttributeEvent(geometry);
    LodHelper.setLodBuffer(lodGeometry, positions, deleteEvent);
    const mesh = new LODMesh(lodGeometry, [material]);
    return mesh;
  }

  updateVisibility(mesh: LODMesh, status: any) {
    const { geometry } = mesh;
    const { visibilityData, highlightData } = status;
    LodHelper.setLodVisibility(geometry, visibilityData);
    if (highlightData) {
      LodHelper.setLodHighlight(geometry, highlightData);
    }
    geometry.addGroup(0, Infinity, 0);
  }

  applyHighlight(mesh: LODMesh, request: any) {
    const {
      tileData: { highlightIds, highlightData },
      modelId,
      material: index,
    } = request;

    if (!highlightData || !highlightIds) return;

    const material = mesh.material[0];

    // Resolve each highlighted item's color (parallel to highlightData chunks)
    // and write them into a per-instance attribute, instead of collapsing every
    // item to highlightIds[0] on a single uniform. Opacity stays a single value
    // (taken from the first definition, as before) since #230 is about color.
    const colors: (THREE.Color | undefined)[] = [];
    let opacity = material.highlightOpacity;
    let transparent = material.transparent;
    let opacitySet = false;

    for (let i = 0; i < highlightIds.length; ++i) {
      const definition = this._materials.getHighlightProps(
        highlightIds[i],
        index,
        modelId,
      );
      if (!definition) {
        colors.push(undefined);
        continue;
      }
      colors.push(
        definition.color ? new THREE.Color(definition.color) : undefined,
      );
      if (!opacitySet) {
        opacity = definition.opacity;
        opacitySet = true;
      }
      transparent = definition.opacity < 1 || transparent;
    }

    LodHelper.setLodHighlightColors(mesh.geometry, highlightData, colors);
    material.highlightOpacity = opacity;
    material.transparent = transparent;
  }

  processMesh(mesh: BIMMesh, request: any) {
    const { geometry } = mesh;
    const {
      tileData: { visibilityData },
      currentLod,
    } = request;
    if (currentLod === CurrentLod.WIRES && mesh instanceof LODMesh) {
      this.updateVisibility(mesh, request.tileData);
    } else if (visibilityData && visibilityData.position.length > 0) {
      for (let i = 0; i < visibilityData.position.length; ++i) {
        const isWhite = visibilityData.size[i] === this.white;
        const position = visibilityData.position[i];
        const value = isWhite ? Infinity : visibilityData.size[i];
        geometry.addGroup(position, value, 0);
      }
    }
  }

  private deleteAttributeEvent(_geometry: THREE.BufferGeometry) {
    function callback(this: any) {
      delete this.array;
    }
    return callback;
  }
}
