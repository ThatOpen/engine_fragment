import * as THREE from "three";
import {
  shellLayerNodes,
  fanOutUniforms,
  type ShellLayer,
} from "./shell-layer-nodes";
import { classicGhostOpacity, trackGhostOpacity } from "./ghost-opacity";

/**
 * Scalable ghost / x-ray for SHELL (`MeshLambertMaterial`) surfaces.
 *
 * Ghost state lives in a GPU lookup, with no per-item recolor (which would be
 * O(elements) CPU work and would break batching). The geometry's `id` attribute
 * carries, per vertex, the 4 bytes (big-endian) of `internalItemId + 1` (see
 * virtual-tiles-controller, the same value the GPU picker reads). Internal
 * itemIds are DENSE, so membership is a DIRECT id-indexed state texture:
 * `uGhostState` is R8, one byte per itemId (255 = in the key set), and the
 * shader does `texelFetch(uGhostState, itemId)`. No hash, no per-element CPU
 * mutation.
 *
 * `uGhostInvert` flips membership so the SAME small key set serves both modes:
 *   invert = false: ghost the items IN the set (ghost-selected)
 *   invert = true:  ghost everything NOT in the set (x-ray the rest)
 * The CPU sizes the table to `max(keySet itemId)+1`; an itemId at or over that
 * count is treated as "not in set" in the shader (so invert ghosts it), with no
 * out-of-bounds fetch and no need to know the model's full item count.
 *
 * Look: single-pass flat x-ray that composes with the deferred capture path.
 * Ghosted fragments get a 4x4 Bayer SCREEN-DOOR discard (keeps about
 * `uGhostOpacity` of the pixels) and a DESATURATE. The discard is early
 * (clipping-planes anchor) so dropped pixels skip lighting AND the capture MRT
 * writes; the desaturate is on the diffuse color (color anchor) so it never
 * collides with capture-emission's late inject. The capture flags the kept
 * pixels translucent (see capture-emission.ts) so the deferred AO leaves them
 * out.
 *
 * Gated behind a `GHOST` define; a custom program-cache key keeps both variants
 * cached so toggling does not recompile every frame. Nothing is installed on a
 * material until its model uses the ghost (see MaterialManager), so an app that
 * never ghosts compiles exactly the same programs as before.
 *
 * The key set is internal ITEM ids (not localIds). The CPU converts localId to
 * itemId through the worker before keying. The shader reconstructs
 * `itemId = rawId - 1` from the `id` attribute.
 */

const VERTEX_HEADER = /* glsl */ `
#ifdef GHOST
  // One shared declaration of the attribute for every per-item layer that
  // reads it: two layers each declaring it would not compile. The first
  // header to arrive declares it and the rest stay quiet.
  // (No backticks in this comment: it lives inside a template literal.)
  #ifndef ITEM_ID_ATTRIBUTE_DECLARED
  #define ITEM_ID_ATTRIBUTE_DECLARED
  attribute vec4 id; // 4 bytes of (internalItemId + 1), big-endian
  #endif
  uniform sampler2D uGhostState;
  uniform int uGhostStateWidth;
  uniform int uGhostCount;
  uniform bool uGhostInvert;
  flat varying float vGhostFlag;
#endif
`;

const VERTEX_ANCHOR = "#include <begin_vertex>";

const VERTEX_INJECT = /* glsl */ `
#include <begin_vertex>
#ifdef GHOST
  uint gRaw =
      (uint(id.x + 0.5) << 24)
    | (uint(id.y + 0.5) << 16)
    | (uint(id.z + 0.5) << 8)
    |  uint(id.w + 0.5);
  bool gInSet = false;
  if (gRaw >= 1u) {
    int gItem = int(gRaw - 1u);
    if (gItem < uGhostCount) {
      int gw = max(uGhostStateWidth, 1);
      // R8 state texture: .r is 0 or 1 (255/255). Direct itemId index.
      gInSet = texelFetch(uGhostState, ivec2(gItem % gw, gItem / gw), 0).r > 0.5;
    }
  }
  vGhostFlag = (uGhostInvert ? !gInSet : gInSet) ? 1.0 : 0.0;
#endif
`;

const FRAGMENT_HEADER = /* glsl */ `
#ifdef GHOST
  flat varying float vGhostFlag;
  uniform float uGhostOpacity; // fraction of pixels kept for ghosted surfaces

  // 4x4 Bayer ordered-dither threshold in [0,1) for screen-door transparency.
  float ghostBayer(vec2 fragCoord) {
    int x = int(mod(fragCoord.x, 4.0));
    int y = int(mod(fragCoord.y, 4.0));
    int i = y * 4 + x;
    int m =
      i == 0  ? 0  : i == 1  ? 8  : i == 2  ? 2  : i == 3  ? 10 :
      i == 4  ? 12 : i == 5  ? 4  : i == 6  ? 14 : i == 7  ? 6  :
      i == 8  ? 3  : i == 9  ? 11 : i == 10 ? 1  : i == 11 ? 9  :
      i == 12 ? 15 : i == 13 ? 7  : i == 14 ? 13 : 5;
    return (float(m) + 0.5) / 16.0;
  }
#endif
`;

// Early in the fragment shader: drop ghosted pixels before lighting / capture.
const FRAGMENT_DISCARD_ANCHOR = "#include <clipping_planes_fragment>";
const FRAGMENT_DISCARD_INJECT = /* glsl */ `
#include <clipping_planes_fragment>
#ifdef GHOST
  if (vGhostFlag > 0.5 && ghostBayer(gl_FragCoord.xy) >= uGhostOpacity) discard;
#endif
`;

// Where `diffuseColor` exists: desaturate ghosted surfaces; lighting carries it
// through to the final color (so the late dithering anchor that
// capture-emission uses is never touched).
const FRAGMENT_COLOR_ANCHOR = "#include <color_fragment>";
const FRAGMENT_COLOR_INJECT = /* glsl */ `
#include <color_fragment>
#ifdef GHOST
  if (vGhostFlag > 0.5) {
    float ghostLuma = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(ghostLuma), 0.7) * 0.9;
  }
#endif
`;

const DEFINE = "GHOST";

export interface GhostUniforms {
  uGhostState: { value: THREE.Texture | null };
  uGhostStateWidth: { value: number };
  uGhostCount: { value: number };
  uGhostInvert: { value: boolean };
  uGhostOpacity: { value: number };
}

export function makeGhostUniforms(): GhostUniforms {
  return {
    uGhostState: { value: null },
    uGhostStateWidth: { value: 1 },
    uGhostCount: { value: 0 },
    uGhostInvert: { value: false },
    uGhostOpacity: trackGhostOpacity({ value: classicGhostOpacity() }),
  };
}

function injectGhost(
  shader: THREE.WebGLProgramParametersWithUniforms,
  u: GhostUniforms,
) {
  shader.uniforms.uGhostState = u.uGhostState;
  shader.uniforms.uGhostStateWidth = u.uGhostStateWidth;
  shader.uniforms.uGhostCount = u.uGhostCount;
  shader.uniforms.uGhostInvert = u.uGhostInvert;
  shader.uniforms.uGhostOpacity = u.uGhostOpacity;
  shader.vertexShader =
    VERTEX_HEADER + shader.vertexShader.replace(VERTEX_ANCHOR, VERTEX_INJECT);
  shader.fragmentShader =
    FRAGMENT_HEADER +
    shader.fragmentShader
      .replace(FRAGMENT_DISCARD_ANCHOR, FRAGMENT_DISCARD_INJECT)
      .replace(FRAGMENT_COLOR_ANCHOR, FRAGMENT_COLOR_INJECT);
}

/**
 * Installs the ghost injection on a SHELL material once. The per-material
 * `GhostUniforms` (whose `.value`s the MaterialManager updates) are stored on
 * `material.userData.ghostUniforms`. Chains any pre-existing `onBeforeCompile`
 * / `customProgramCacheKey` so the capture patch is never clobbered, whichever
 * of the two is installed first.
 */
export function installGhostEmission(
  material: THREE.MeshLambertMaterial,
  enabled: boolean,
) {
  if (material.userData.hasGhost) {
    setGhost(material, enabled);
    return;
  }
  material.userData.hasGhost = true;
  material.defines ??= {};

  const uniforms = makeGhostUniforms();
  material.userData.ghostUniforms = uniforms;

  // And the TSL twin, for three.webgpu, where `onBeforeCompile` never runs.
  // Both paths are installed and each renderer reads its own: the node is
  // invisible to WebGL, the GLSL patch is invisible to WebGPU. MaterialManager
  // keeps writing ONE uniforms object, so its writes are fanned out to the
  // node's uniforms here. See shell-layer-nodes.ts.
  const node = shellLayerNodes(material)?.ghost;
  if (node) {
    material.userData.ghostNode = node;
    material.userData.ghostUniforms = fanOutUniforms(
      uniforms,
      node.uniforms as GhostUniforms,
    );
  }

  const previousCompile = material.onBeforeCompile;
  material.onBeforeCompile = function (shader, renderer) {
    previousCompile.call(this, shader, renderer);
    injectGhost(shader, uniforms);
  };

  const previousKey = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = function () {
    const on = (this.defines as any)?.[DEFINE] !== undefined ? "1" : "0";
    return `${previousKey()}|ghost:${on}`;
  };

  // Inert until the define is set: flipping it (setGhost) is what queues the
  // recompile, so installing on a live material costs nothing by itself.
  setGhost(material, enabled);
}

/** Flips one material's ghost define and queues the recompile/swap. */
export function setGhost(
  material: THREE.MeshLambertMaterial,
  enabled: boolean,
) {
  (material.userData.ghostNode as ShellLayer<unknown> | undefined)?.setEnabled(
    enabled,
  );
  const defines = (material.defines ??= {});
  const enabledNow = defines[DEFINE] !== undefined;
  if (enabledNow === enabled) return;
  if (enabled) defines[DEFINE] = "";
  else delete defines[DEFINE];
  material.needsUpdate = true;
}
