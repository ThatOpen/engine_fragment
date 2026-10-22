import * as THREE from "three";
import { LineMaterialParameters } from "three/examples/jsm/lines/LineMaterial.js";
import {
  ObjectClass,
  MaterialDefinition,
  CurrentLod,
  BIMMesh,
  BIMMaterial,
  MaterialData,
} from "./model-types";
import { CRC } from "../utils";
import { LodMaterial, LodNodeMaterial } from "../lod";
import { DataMap } from "../../../Utils";
import {
  installCaptureEmission,
  setCaptureEmission,
  setCapturePixels,
} from "./capture-emission";
import { targetAwareMRT } from "./target-aware-mrt";

/**
 * Whether `three` resolves to three.webgpu on this page (the app aliases
 * `three` to `three/webgpu`). Detected on the namespace, never by importing
 * `three/webgpu` or `three/tsl`, so WebGL pages do not load the WebGPU graph.
 */
const isWebGPUBuild = () =>
  typeof (THREE as any).WebGPURenderer === "function";

export class MaterialManager {
  readonly list = new DataMap<number, BIMMaterial>();

  /**
   * When true, SHELL surfaces and LOD lines emit their view normal + faceId to
   * extra MRT attachments alongside their shaded colour (see capture-emission.ts
   * and LodShaders.fragment), so a deferred renderer can capture colour and
   * geometry in a single scene pass. Off by default; ordinary rendering is
   * unaffected, and nothing is installed on any material until it is first
   * turned on.
   */
  private _captureEmission = false;

  private readonly _modelMaterialMapping = new Map<string, Set<number>>();
  private readonly _definitions = new Map<string, MaterialDefinition[]>();
  private readonly _idGenerator = new CRC();
  private readonly white = 0xffffffff;

  static resetColors(definitions: MaterialDefinition[]) {
    for (const definition of definitions) {
      if (!(definition && definition.color)) continue;
      const { color } = definition;
      if (color.isColor) continue;
      const { r, g, b } = color;
      // IFC colors are stored in sRBG color space
      definition.color = new THREE.Color().setRGB(
        r,
        g,
        b,
        THREE.SRGBColorSpace
      );
    }
  }

  /** Whether SHELL / LOD materials are currently emitting capture attachments. */
  get captureEmission() {
    return this._captureEmission;
  }

  /**
   * Turns single-pass capture emission on/off for every live SHELL surface and
   * LOD line material, and for any created afterwards. A deferred renderer
   * enables this before its capture pass so colour + view normal + faceId land
   * in one scene draw.
   *
   * The first time it is turned on, the capture injection is installed on the
   * live SHELL materials (inert again once turned off); until then no material
   * carries it, so an app that never uses a deferred renderer compiles exactly
   * the same programs as before.
   */
  setCaptureEmission(enabled: boolean) {
    if (this._captureEmission === enabled) return;
    this._captureEmission = enabled;
    for (const material of this.list.values()) {
      if (material instanceof THREE.MeshLambertMaterial) {
        if (enabled) installCaptureEmission(material, true);
        else if (material.userData.hasCaptureEmission) {
          setCaptureEmission(material, false);
        }
      } else if (material instanceof LodMaterial) {
        this.setLodCaptureEmission(material, enabled);
      }
    }
  }

  /**
   * The size in pixels of the target the next capture draws into, so no
   * surface can come out thinner than a pixel in it (see `setCapturePixels` in
   * capture-emission.ts). `(0, 0)` turns that off.
   */
  setCapturePixels(width: number, height: number) {
    setCapturePixels(width, height);
  }

  dispose(modelId: string) {
    this._definitions.delete(modelId);
    const ids = this._modelMaterialMapping.get(modelId);
    if (!ids) return;
    for (const id of ids) {
      const material = this.list.get(id);
      if (!material) continue;
      material.dispose();
      this.list.delete(id);
    }
    this._modelMaterialMapping.delete(modelId);
  }

  /**
   * Release a model's slot in the per-model definitions and mapping tables
   * without disposing the underlying THREE materials in `list`. Used by
   * `editor.save()` so a fresh model can register under the same modelId
   * while the outgoing model's tiles still render normally.
   */
  releaseModelSlot(modelId: string) {
    this._definitions.delete(modelId);
    this._modelMaterialMapping.delete(modelId);
  }

  get(data: MaterialDefinition, request: any) {
    const { modelId, objectClass, currentLod, templateId } = request;
    if (!(modelId && objectClass !== undefined && currentLod !== undefined)) {
      throw new Error(
        "Fragments: material definition information is missing to create the material."
      );
    }

    this._idGenerator.fromMaterialData({
      modelId,
      objectClass,
      currentLod,
      templateId,
      ...data,
    });

    const { value: id } = this._idGenerator;

    const material = this.getUniqueMaterial(id, data, request);
    return material;
  }

  /**
   * Appends material definitions for a model. `firstId`, when given, is the
   * id the worker assigned to `materials[0]`; definitions at or above it are
   * ones the worker has reclaimed (see #299) and are replaced.
   */
  addDefinitions(
    modelID: string,
    materials: MaterialDefinition[],
    firstId?: number,
  ) {
    const definitions = this._definitions.get(modelID);
    if (definitions) {
      if (firstId !== undefined && firstId < definitions.length) {
        definitions.length = firstId;
      }
      definitions.push(...materials);
    } else {
      this._definitions.set(modelID, materials);
    }
  }

  createHighlights(mesh: BIMMesh, request: any) {
    const {
      tileData: { highlightData, highlightIds },
      modelId,
      material: index,
    } = request;

    const { geometry } = mesh;
    const materials = (mesh.material as THREE.Material[]).slice(0, 2);
    const localMap = new Map<number, number>();

    const materialDefinitions = this._definitions.get(modelId);
    if (!materialDefinitions) return materials;

    for (let i = 0; i < highlightData.position.length; i++) {
      const highlightIndex = highlightIds[i];
      this.processHighlight(
        localMap,
        highlightIndex,
        materialDefinitions,
        index,
        request,
        materials
      );
      const first = highlightData.position[i];
      const value = highlightData.size[i];
      const isWhite = value === this.white;
      const size = isWhite ? Infinity : value;
      geometry.addGroup(first, size, localMap.get(highlightIds[i])!);
    }

    return materials;
  }

  getHighlightProps(
    highlightIndex: number,
    originalIndex: number,
    modelId: string,
  ) {
    const materialDefinitions = this._definitions.get(modelId);
    if (!materialDefinitions) return undefined;
    const originalDefinition = materialDefinitions[originalIndex];
    const newDefinition = materialDefinitions[highlightIndex];
    if (!newDefinition || !originalDefinition) return undefined;
    const {
      preserveOriginalMaterial,
      _explicitProps,
      ...highlightDefinition
    } = newDefinition;
    const combined: MaterialDefinition = { ...originalDefinition };
    if (preserveOriginalMaterial) {
      for (const prop of _explicitProps ?? []) {
        if ((highlightDefinition as any)[prop] !== undefined) {
          (combined as any)[prop] = (highlightDefinition as any)[prop];
        }
      }
    } else {
      Object.assign(combined, highlightDefinition);
    }
    return combined;
  }

  getFromRequest(request: any) {
    const { material: index, modelId } = request;
    const modelMaterials = this._definitions.get(modelId);
    const definition = modelMaterials?.[index];
    if (!definition) {
      throw new Error(`Fragments: Missing mesh material for index ${index}`);
    }
    const material = this.get(definition, request);
    return material;
  }

  private newLODMaterial(data: MaterialData, request: any) {
    const { data: definition } = data;
    const color = new THREE.Color(definition.color);
    if (request.currentLod === CurrentLod.WIRES) {
      color.multiplyScalar(0.85);
    }

    const parameters: LineMaterialParameters = {
      color,
      ...this.getParameters(definition),
    };

    // Under three.webgpu the GLSL LodMaterial cannot even construct its
    // parameters (UniformsUtils / UniformsLib do not exist there); its TSL twin
    // takes over with the same mutable surface. See lod-node-material.ts.
    const material = isWebGPUBuild()
      ? (new LodNodeMaterial(parameters) as unknown as LodMaterial)
      : new LodMaterial(parameters);
    material.userData = { customId: definition.customId };
    // Match the current session: if capture is already on, a LOD material
    // created afterwards (a tile loaded later) must emit too.
    if (this._captureEmission) this.setLodCaptureEmission(material, true);
    return material;
  }

  /**
   * Flips a LOD line material's capture-emission define. The GLSL is always
   * present but inert (LodShaders.fragment, gated on CAPTURE_EMISSION); the
   * define decides whether the extra MRT outputs are written. A LOD material
   * owns its shader source, so the toggle is a plain define swap.
   */
  private setLodCaptureEmission(material: LodMaterial, enabled: boolean) {
    // The capture MRT belongs to the WebGL deferred renderer; the TSL twin has
    // none (under WebGPU a postproduction's pass MRT applies instead).
    if ((material as any).isLodNodeMaterial) return;
    // The flag a deferred renderer reads to know which materials emit. Set
    // the first time capture reaches this material, like the SHELL install.
    if (enabled) material.userData.hasCaptureEmission = true;
    const defines = (material.defines ??= {});
    const enabledNow = defines.CAPTURE_EMISSION !== undefined;
    if (enabledNow === enabled) return;
    if (enabled) {
      defines.CAPTURE_EMISSION = "";
    } else {
      delete defines.CAPTURE_EMISSION;
    }
    material.needsUpdate = true;
  }

  /**
   * Under three.webgpu, hands the faceId to a WebGPU postproduction through
   * the material's MRT. The 24-bit faceId already rides the geometry's `color`
   * attribute (it is what the WebGL capture reads). A WebGPU scene pass that
   * declares a `face` channel gets it from here, because three merges a
   * material's `mrtNode` over the pass MRT; WebGL ignores the property.
   *
   * `targetAwareMRT` only writes the channels the current target has, so the
   * same material still compiles in targets with no `face` texture (a plain
   * render target, a shadow pass). Alpha 0: a translucent shell blends the id
   * by it and leaves the id of the surface behind in place, as the WebGL
   * capture does for its translucent phase; an opaque shell writes it as is.
   */
  private setupFaceMrt(material: THREE.MeshLambertMaterial) {
    const tsl = (THREE as any).TSL;
    if (!tsl?.output || !(THREE as any).MRTNode) return;
    (material as any).mrtNode = targetAwareMRT({
      output: tsl.output,
      face: tsl.vec4(tsl.attribute("color", "vec3"), 0),
    });
  }

  private getParameters(data: MaterialDefinition) {
    const { opacity, transparent } = data;
    const isTranslucent = opacity < 1;
    const parameters: THREE.MaterialParameters = {
      opacity,
      transparent: transparent || isTranslucent,
      clipIntersection: false,
    };
    return parameters;
  }

  private new(data: MaterialDefinition, request: any) {
    const { objectClass, templateId } = request;
    let material: BIMMaterial;

    if (objectClass === ObjectClass.SHELL) {
      const lambert = new THREE.MeshLambertMaterial({
        color: data.color,
        transparent: data.opacity < 1,
        opacity: data.opacity,
        userData: { customId: data.customId, localId: data.localId },
        depthTest: data.depthTest ?? true,
        depthWrite: data.depthWrite ?? true,
        polygonOffset:
          (data.polygonOffsetFactor ?? 0) !== 0 ||
          (data.polygonOffsetUnits ?? 0) !== 0,
        polygonOffsetFactor: data.polygonOffsetFactor ?? 0,
        polygonOffsetUnits: data.polygonOffsetUnits ?? 0,
        side: data.renderedFaces === 1 ? THREE.DoubleSide : THREE.FrontSide,
      });
      // A material created while a deferred renderer is capturing (a tile
      // loaded mid-session) must emit too. Otherwise nothing is installed:
      // setCaptureEmission(true) installs it on the live materials.
      if (this._captureEmission) installCaptureEmission(lambert, true);
      if (isWebGPUBuild()) this.setupFaceMrt(lambert);
      material = lambert;
    } else if (objectClass === ObjectClass.LINE) {
      material = this.newLODMaterial(
        { data, instancing: templateId !== undefined },
        request
      );
    } else {
      throw new Error("Fragments: Unsupported object class");
    }

    return material;
  }

  private addMaterialToModel(modelId: string, id: number) {
    let modelMaterials = this._modelMaterialMapping.get(modelId);
    if (!modelMaterials) {
      modelMaterials = new Set();
      this._modelMaterialMapping.set(modelId, modelMaterials);
    }
    modelMaterials.add(id);
  }

  private processHighlight(
    localMap: Map<number, number>,
    highlightIndex: any,
    materialDefinitions: MaterialDefinition[],
    index: any,
    request: any,
    materials: THREE.Material[]
  ) {
    if (!localMap.has(highlightIndex)) {
      const originalDefinition = materialDefinitions[index];
      const newDefinition = materialDefinitions[highlightIndex];
      if (!newDefinition) {
        // Definitions arrive at once, tile updates wait in the requests
        // queue. An update emitted before a resetHighlight() can be
        // processed after the worker reclaimed its highlight ids (#299)
        // and `addDefinitions` dropped them, so the id resolves to nothing
        // (#318). The highlight it refers to was reset: draw the range with
        // the tile's own material until the update that replaces it arrives.
        localMap.set(highlightIndex, 0);
        return;
      }
      const { preserveOriginalMaterial, _explicitProps, ...highlightDefinition } = newDefinition;
      const combinedDefinition: MaterialDefinition = { ...originalDefinition };
      if (preserveOriginalMaterial) {
        for (const prop of _explicitProps ?? []) {
          if ((highlightDefinition as any)[prop] !== undefined) {
            (combinedDefinition as any)[prop] = (highlightDefinition as any)[prop];
          }
        }
      } else {
        Object.assign(combinedDefinition, highlightDefinition);
      }
      const material = this.get(combinedDefinition, request);
      materials.push(material);
      localMap.set(highlightIndex, materials.length - 1);
    }
  }

  private getUniqueMaterial(
    id: number,
    data: MaterialDefinition,
    request: any
  ) {
    const modelId = request.modelId;
    const material = this.list.get(id);
    if (material) return material;
    const newMaterial = this.new(data, request);
    this.list.set(id, newMaterial);
    this.addMaterialToModel(modelId, id);
    return this.list.get(id)!;
  }
}
