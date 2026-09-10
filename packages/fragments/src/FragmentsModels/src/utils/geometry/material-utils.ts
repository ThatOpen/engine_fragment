import { RenderedFaces } from "../../../../Schema";
import { MaterialDefinition } from "../../model/model-types";

export class MaterialUtils {
  static isSame(a: MaterialDefinition, b: MaterialDefinition) {
    return this.getKey(a) === this.getKey(b);
  }

  /** Returns a stable key including rendering and inheritance semantics. */
  static getKey(material: MaterialDefinition) {
    const { color, _explicitProps, ...properties } = material;
    // Missing properties on preserved highlights inherit from the base material.
    // They must stay distinct from explicitly supplied default values.
    if (!material.preserveOriginalMaterial) {
      properties.opacity ??= 1;
      properties.renderedFaces ??= RenderedFaces.ONE;
    }
    return JSON.stringify([
      color && [color.r, color.g, color.b, color.isColor === true],
      [...new Set(_explicitProps ?? [])].sort(),
      Object.entries(properties)
        .filter(([, value]) => value !== undefined)
        .sort(([a], [b]) => a.localeCompare(b)),
    ]);
  }
}
