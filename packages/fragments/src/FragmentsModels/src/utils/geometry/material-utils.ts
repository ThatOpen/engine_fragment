import * as THREE from "three";
import { RenderedFaces } from "../../../../Schema";
import { MaterialDefinition } from "../../model/model-types";

export class MaterialUtils {
  static isSame(a: MaterialDefinition, b: MaterialDefinition) {
    const isSameColor = this.checkSameColor(a.color, b.color);
    const isSameOpacity = this.checkSame(a.opacity, b.opacity, 1.0);
    const facesA = a.renderedFaces;
    const facesB = b.renderedFaces;
    const isSameFaces = this.checkSame(facesA, facesB, RenderedFaces.ONE);
    return isSameColor && isSameOpacity && isSameFaces;
  }

  private static checkSame(a: any, b: any, fallback: any): boolean {
    if (a === b) {
      return true;
    }

    if (a === fallback && b === undefined) {
      return true;
    }

    if (a === undefined && b === fallback) {
      return true;
    }

    return false;
  }

  private static checkSameColor(a: THREE.Color, b: THREE.Color) {
    if (a === b) {
      return true;
    }

    if (a === undefined || b === undefined) {
      return false;
    }

    const { r: ar, g: ag, b: ab } = a;
    const { r: br, g: bg, b: bb } = b;

    if (ar === br && ag === bg && ab === bb) {
      return true;
    }

    return false;
  }
}
