import * as THREE from "three";
import { LineMaterialParameters } from "three/examples/jsm/lines/LineMaterial.js";

/**
 * The LOD ribbon material for pages where `three` resolves to three.webgpu:
 * the TSL twin of `LodMaterial` + `LodShaders`, formula for formula where WGSL
 * allows. Same instanced screen-space quad expansion from
 * `itemFirst`/`itemLast`, same `itemFilter` hide test, same perspective
 * near-plane cut, same base/highlight colour mix (with the per-instance
 * `itemHighlightColor`, #230).
 *
 * `LodMaterial` cannot even be constructed there: it builds its uniforms with
 * `THREE.UniformsUtils` / `THREE.UniformsLib`, which three.webgpu does not
 * export. `MaterialManager` picks this class instead when it sees
 * `THREE.WebGPURenderer`.
 *
 * Divergences, on purpose:
 * - No CAPTURE_EMISSION: that MRT path belongs to the WebGL deferred
 *   renderer. Under WebGPU the postproduction's pass MRT applies to this
 *   material through `outputNode` (see below).
 * - No clipping planes on LOD ribbons: the full `vertexNode` override bypasses
 *   the node material's positionView-derived clipping. LOD lines are a
 *   far-distance representation, where section planes matter least.
 *
 * It exposes the same surface the rest of the library mutates on
 * `LodMaterial`: `uniforms.<name>.value`, the lodColor / lodOpacity / lodSize /
 * highlightColor / highlightOpacity accessors and the `isLodMaterial` /
 * `isLineMaterial` flags.
 */
// Under classic three NodeMaterial does not exist, and a static
// `class extends` of it would crash this MODULE on import, which the lod
// barrel makes every WebGL page pay. The placeholder base keeps the module
// loadable everywhere; the class is only ever CONSTRUCTED under three.webgpu
// (MaterialManager checks first).
const NodeMaterialBase: any = (THREE as any).NodeMaterial ?? class {};

export class LodNodeMaterial extends NodeMaterialBase {
  readonly isLodMaterial = true;

  readonly isLineMaterial = true;

  readonly isLodNodeMaterial = true;

  declare uniforms: {
    lodColor: { value: THREE.Color };
    lodSize: { value: THREE.Vector2 };
    lodOpacity: { value: number };
    highlightColor: { value: THREE.Color };
    highlightOpacity: { value: number };
  };

  get lodSize(): THREE.Vector2 {
    return this.uniforms.lodSize.value;
  }

  set lodSize(value: THREE.Vector2) {
    this.uniforms.lodSize.value.copy(value);
  }

  get lodColor(): THREE.Color {
    return this.uniforms.lodColor.value;
  }

  set lodColor(color: THREE.Color) {
    this.uniforms.lodColor.value = color;
  }

  get lodOpacity(): number {
    return this.uniforms.lodOpacity.value;
  }

  set lodOpacity(value: number) {
    this.uniforms.lodOpacity.value = value;
  }

  get highlightColor(): THREE.Color {
    return this.uniforms.highlightColor.value;
  }

  set highlightColor(color: THREE.Color) {
    this.uniforms.highlightColor.value = color;
  }

  get highlightOpacity(): number {
    return this.uniforms.highlightOpacity.value;
  }

  set highlightOpacity(value: number) {
    this.uniforms.highlightOpacity.value = value;
  }

  constructor(parameters: LineMaterialParameters) {
    super();

    const T = (THREE as any).TSL;
    const {
      uniform,
      attribute,
      positionGeometry,
      modelViewMatrix,
      cameraProjectionMatrix,
      varying,
      float,
      vec2,
      vec4,
      select,
      mix,
      normalize,
      Fn,
      If,
    } = T;

    const { color, opacity, transparent, ...rest } = parameters as any;
    this.transparent = transparent ?? false;
    Object.assign(this, rest);

    const uniforms = {
      lodColor: uniform(new THREE.Color(color)),
      lodSize: uniform(new THREE.Vector2(1, 1)),
      lodOpacity: uniform(opacity ?? 1),
      highlightColor: uniform(new THREE.Color(1, 1, 1)),
      highlightOpacity: uniform(1),
    };
    (this as any).uniforms = uniforms;

    // Same constant as `lodWidth` in LodShaders.vertex.
    const lodWidth = float(2);

    const itemFilter = attribute("itemFilter", "float");
    const itemFirst = attribute("itemFirst", "vec3");
    const itemLast = attribute("itemLast", "vec3");

    // The per-instance highlight colour only exists once a coloured highlight
    // has been applied (LodHelper.setLodHighlightColors). Where the geometry
    // has none, fall back to the `highlightColor` uniform (white by default,
    // what that attribute is initialised to) instead of reading a missing
    // attribute, which three reports with a warning per build.
    const highlightSource = Fn((builder: any) =>
      builder?.geometry?.hasAttribute?.("itemHighlightColor")
        ? attribute("itemHighlightColor", "vec3")
        : uniforms.highlightColor,
    )();

    const vHighlight = varying(
      select(itemFilter.greaterThan(1.5), float(1), float(0)),
    );
    const vHighlightColor = varying(highlightSource);

    (this as any).vertexNode = Fn(() => {
      const result = vec4(0, 0, 0, 0).toVar();

      If(itemFilter.notEqual(0), () => {
        const first = modelViewMatrix.mul(vec4(itemFirst, 1)).toVar();
        const last = modelViewMatrix.mul(vec4(itemLast, 1)).toVar();

        // cutLodLine(first, second): second.xyz = mix(first.xyz, second.xyz, f)
        // with the near estimate -(proj[3][2] / proj[2][2]) / 2.
        const cut = (a: any, b: any) => {
          const p22 = cameraProjectionMatrix.element(2).element(2);
          const p32 = cameraProjectionMatrix.element(3).element(2);
          const approx = p32.div(p22).negate().div(2);
          const factor = approx.sub(a.z).div(b.z.sub(a.z));
          b.xyz.assign(mix(a.xyz, b.xyz, factor));
        };

        const perspective = cameraProjectionMatrix
          .element(2)
          .element(3)
          .equal(-1);
        const firstCut = perspective
          .and(first.z.lessThan(0))
          .and(last.z.greaterThanEqual(0));
        const lastCut = perspective
          .and(last.z.lessThan(0))
          .and(first.z.greaterThanEqual(0));
        If(firstCut, () => {
          cut(first, last);
        }).ElseIf(lastCut, () => {
          cut(last, first);
        });

        const firstClip = cameraProjectionMatrix.mul(first).toVar();
        const lastClip = cameraProjectionMatrix.mul(last).toVar();
        const firstNdc = firstClip.xyz.div(firstClip.w);
        const lastNdc = lastClip.xyz.div(lastClip.w);

        const lodRatio = uniforms.lodSize.x.div(uniforms.lodSize.y);
        const orientation = lastNdc.xy.sub(firstNdc.xy).toVar();
        orientation.x.mulAssign(lodRatio);
        orientation.assign(normalize(orientation));

        const distance = vec2(orientation.y, orientation.x.negate()).toVar();
        orientation.x.divAssign(lodRatio);
        distance.x.divAssign(lodRatio);

        If(positionGeometry.x.lessThan(0), () => {
          distance.assign(distance.negate());
        });
        If(positionGeometry.y.lessThan(0), () => {
          distance.addAssign(orientation.negate());
        }).ElseIf(positionGeometry.y.greaterThan(1), () => {
          distance.addAssign(orientation);
        });

        distance.mulAssign(lodWidth);
        distance.divAssign(uniforms.lodSize.y);

        const isFirst = positionGeometry.y.lessThan(0.5);
        const lodPosition = select(isFirst, firstClip, lastClip).toVar();
        lodPosition.xy.addAssign(distance.mul(lodPosition.w));
        result.assign(lodPosition);
      });

      return result;
    })();

    // `outputNode`, not `fragmentNode`: three skips a render target's MRT for a
    // material with a `fragmentNode`, so inside a pass with extra attachments
    // (a WebGPU postproduction's face / normal channels) the pipeline would
    // have no output for them and WebGPU would reject it. With `outputNode`
    // the pass MRT applies.
    (this as any).outputNode = Fn(() => {
      const base = mix(uniforms.lodColor, vHighlightColor, vHighlight);
      const alpha = mix(
        uniforms.lodOpacity,
        uniforms.highlightOpacity,
        vHighlight,
      );
      return vec4(base, alpha);
    })();
  }
}
