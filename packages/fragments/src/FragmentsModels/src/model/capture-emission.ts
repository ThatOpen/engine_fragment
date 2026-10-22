import * as THREE from "three";

/**
 * Single-pass capture emission for SHELL (`MeshLambertMaterial`) surfaces.
 *
 * A deferred renderer wants to capture, in ONE scene draw, the shaded surface
 * colour plus the auxiliary geometry attributes its screen-space passes need
 * (view normal, faceId). Instead of re-drawing the scene with an override
 * material, the real lit material emits those extras to additional MRT
 * attachments, gated behind a `CAPTURE_EMISSION` define so ordinary rendering
 * is byte-for-byte untouched.
 *
 * MRT attachment contract (the consumer binds a render target shaped like this):
 *
 *   location 0 : the material's own shaded colour (left untouched)
 *   location 1 : RG  octahedral-encoded view-space normal, signed [-1, 1]
 *   location 2 : RGB faceId (the per-vertex `color` attribute, already 0..1)
 *                with A = 0 as a sentinel byte
 *
 * faceId rides the geometry's `color` attribute, which `getFaceIds` fills with
 * `THREE.Color` components already in 0..1 — so it is emitted verbatim, no
 * /255. `color` is read here only when emitting; the material keeps
 * `vertexColors` off, so the displayed colour is unaffected.
 *
 * Toggling the define recompiles at most once per state; a custom program cache
 * key keeps both variants in three's program cache, so flipping emission on and
 * off does not recompile every frame — only swaps the cached program.
 */

const VERTEX_HEADER = /* glsl */ `
#ifdef CAPTURE_EMISSION
  #ifndef USE_COLOR
  attribute vec3 color; // packed faceId, already in 0..1 (see getFaceIds)
  #endif
  varying vec3 vCaptureFaceId;
  uniform vec2 captureTargetPixels;
#endif
`;

/**
 * The size, in pixels, of the target the capture is drawn into, shared by every
 * SHELL material. Zero turns the half-pixel dilation off (see
 * {@link setCapturePixels}).
 */
const captureTargetPixels = { value: new THREE.Vector2(0, 0) };

/**
 * Tells the capture how big a pixel is, so that nothing drawn into it can be
 * thinner than one. Call it with the capture target's size before each capture;
 * `(0, 0)` switches the dilation off.
 */
export function setCapturePixels(width: number, height: number) {
  captureTargetPixels.value.set(width, height);
}

const VERTEX_ANCHOR = "#include <begin_vertex>";

const VERTEX_INJECT = /* glsl */ `
#include <begin_vertex>
#ifdef CAPTURE_EMISSION
  vCaptureFaceId = color;
#endif
`;

// Applied after the clip-space position exists, so we can nudge its depth.
const VERTEX_DEPTH_ANCHOR = "#include <project_vertex>";

const VERTEX_DEPTH_INJECT = /* glsl */ `
#include <project_vertex>
#ifdef CAPTURE_EMISSION
  // Deterministic per-faceId depth bias. Coplanar faces that share a material
  // (common in brep solids) would otherwise z-fight, and since the deferred
  // contour is derived from faceId, the winner flips frame to frame and the edges
  // shimmer. Hashing the id to a tiny, stable clip-z offset gives each id a fixed
  // winner so the edges hold still.
  //
  // CRITICAL: this offset is constant in NDC depth (the w scale cancels after the
  // perspective divide), so it must stay BELOW the real NDC depth gap between
  // genuinely separated surfaces — otherwise distant geometry (where real gaps
  // shrink) gets its order flipped and surfaces bleed through each other. The old
  // 2e-4 exceeded the gap of a 0.3 m separation at ~100 m (~3e-5). With the
  // float32 (reversed-Z) depth buffer the buffer resolves far below this, so a
  // much smaller bias still breaks exact-coplanar ties without flipping real
  // separations.
  float captureIdHash =
    fract(sin(dot(color, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  // SEMANTIC coplanar priority. The converter packs a priority BAND into bits
  // 22-23 of the faceId (which rides the color attribute); those bits land in
  // bits 6-7 of the red byte. A higher band biases toward the camera so it wins the
  // depth tie against a coplanar neighbour of a lower band (e.g. slab over wall).
  // The band step (8e-6) is 4x the hash tiebreak so bands dominate, yet stays
  // below the ~3e-5 NDC gap of a 0.3 m separation at 100 m, so genuinely-separated
  // surfaces never flip. The hash remains the WITHIN-band tiebreaker.
  float rByte = floor(color.r * 255.0 + 0.5);
  float band = floor(rByte / 64.0); // bits 6-7 of red -> 0..3
  gl_Position.z += (-band * 8.0e-6 + (captureIdHash - 0.5) * 2.0e-6) * gl_Position.w;

  // NOTHING THINNER THAN A PIXEL. A triangle is only drawn where it covers a
  // pixel centre, so a part narrower than a pixel on screen — a railing's rail, a
  // mullion, a thin plate seen from afar — is drawn or skipped whole depending on
  // where it falls against the pixel grid, and its contour goes with it. Which
  // rails of a railing showed changed with every zoom step. Every vertex is pushed
  // half a pixel along its normal as the screen sees it, scaled by how edge-on its
  // face is: a face turned to the camera does not move, and the faces seen edge-on
  // at a part's sides open into half-pixel strips, so the part covers at least one
  // whole pixel wherever it lands. Screen x/y only: depth is untouched.
  if (captureTargetPixels.x > 0.0) {
    vec2 side = vec2(projectionMatrix[0][0], projectionMatrix[1][1]) *
      transformedNormal.xy * captureTargetPixels * 0.5;
    float along = length(side);
    if (along > 1.0e-6) {
      float edgeOn = length(transformedNormal.xy) / max(length(transformedNormal), 1.0e-6);
      gl_Position.xy += (side / along) * edgeOn / captureTargetPixels * gl_Position.w;
    }
  }
#endif
`;

const FRAGMENT_HEADER = /* glsl */ `
#ifdef CAPTURE_EMISSION
  varying vec3 vCaptureFaceId;
  layout(location = 1) out vec2 gCaptureNormal;
  layout(location = 2) out vec4 gCaptureFaceId;

  // Octahedral encode (Cigolle et al. 2014). signNotZero, not sign(): sign(0)
  // would return 0 and corrupt the fold at the diagonal seams.
  vec2 captureSignNotZero(vec2 v) {
    return vec2(v.x >= 0.0 ? 1.0 : -1.0, v.y >= 0.0 ? 1.0 : -1.0);
  }

  vec2 captureOctEncode(vec3 n) {
    n /= (abs(n.x) + abs(n.y) + abs(n.z));
    return n.z >= 0.0 ? n.xy : (1.0 - abs(n.yx)) * captureSignNotZero(n.xy);
  }
#endif
`;

// Last include in the lit fragment shader; the view-space `normal` set by
// <normal_fragment_begin> is still in scope this late.
const FRAGMENT_ANCHOR = "#include <dithering_fragment>";

const FRAGMENT_INJECT = /* glsl */ `
#include <dithering_fragment>
#ifdef CAPTURE_EMISSION
  gCaptureNormal = captureOctEncode(normalize(normal));
  // Alpha is a role/sentinel byte. Flag translucent surfaces (opacity < 1) so
  // the deferred ambient occlusion can leave them out: a flagged surface neither
  // receives occlusion nor casts it onto opaque neighbours.
  float captureRole = opacity < 1.0 ? 1.0 : 0.0;
  #ifdef GHOST
    // Ghost (x-ray) fades through a Bayer SCREEN-DOOR discard at full opacity
    // (see ghost-emission.ts), so the KEPT pixels of a ghosted surface would
    // otherwise read as opaque and cast/receive AO, blotching the isolated
    // element. Flag them translucent so the deferred AO leaves them out, as it
    // does glass. Gated by GHOST + vGhostFlag, so solid rendering is untouched.
    if (vGhostFlag > 0.5) captureRole = 1.0;
  #endif
  gCaptureFaceId = vec4(vCaptureFaceId, captureRole);
#endif
`;

const DEFINE = "CAPTURE_EMISSION";

/** Injects the capture-emission GLSL into a built-in material's shader. */
function injectCaptureEmission(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.uniforms.captureTargetPixels = captureTargetPixels;
  shader.vertexShader =
    VERTEX_HEADER +
    shader.vertexShader
      .replace(VERTEX_ANCHOR, VERTEX_INJECT)
      .replace(VERTEX_DEPTH_ANCHOR, VERTEX_DEPTH_INJECT);
  shader.fragmentShader =
    FRAGMENT_HEADER +
    shader.fragmentShader.replace(FRAGMENT_ANCHOR, FRAGMENT_INJECT);
}

/**
 * Installs the emission injection on a SHELL material once (MaterialManager
 * does it the first time capture is turned on, or at creation while it is on).
 * From then on the GLSL is always present but inert; the `CAPTURE_EMISSION` define (toggled by
 * {@link setCaptureEmission}) decides whether it runs. The injection chains any
 * pre-existing `onBeforeCompile`/`customProgramCacheKey` so we never clobber
 * other patches.
 */
export function installCaptureEmission(
  material: THREE.MeshLambertMaterial,
  enabled: boolean,
) {
  if (material.userData.hasCaptureEmission) {
    setCaptureEmission(material, enabled);
    return;
  }
  material.userData.hasCaptureEmission = true;
  material.defines ??= {};

  const previousCompile = material.onBeforeCompile;
  material.onBeforeCompile = function (shader, renderer) {
    previousCompile.call(this, shader, renderer);
    injectCaptureEmission(shader);
  };

  const previousKey = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = function () {
    const on = (this.defines as any)?.[DEFINE] !== undefined ? "1" : "0";
    return `${previousKey()}|capture:${on}`;
  };

  setCaptureEmission(material, enabled);
}

/** Flips a single material's emission define and queues the recompile/swap. */
export function setCaptureEmission(
  material: THREE.MeshLambertMaterial,
  enabled: boolean,
) {
  const defines = (material.defines ??= {});
  const enabledNow = defines[DEFINE] !== undefined;
  if (enabledNow === enabled) return;
  if (enabled) {
    defines[DEFINE] = "";
  } else {
    delete defines[DEFINE];
  }
  material.needsUpdate = true;
}
