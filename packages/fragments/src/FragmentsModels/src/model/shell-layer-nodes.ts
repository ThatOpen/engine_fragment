import * as THREE from "three";
import { classicGhostOpacity, trackGhostOpacity } from "./ghost-opacity";

/**
 * The TSL twin of the per-item ghost layer a SHELL material carries, for pages
 * where `three` resolves to three.webgpu.
 *
 * WHY IT HAS TO EXIST. The ghost patches GLSL through `onBeforeCompile`. Under
 * three.webgpu the shell's `MeshLambertMaterial` is turned into a node twin with
 * `fromMaterial`, which copies PROPERTIES and not compiled shader text, so the
 * GLSL patch does nothing there. A node property set on the plain material does
 * survive the conversion (the face `mrtNode` already rides it), so that is the
 * way in.
 *
 * A LAYER THAT IS OFF IS NOT IN THE SHADER AT ALL, the twin of the GLSL define.
 * A uniform switch would compile the ghost's discard into every shell for good,
 * and a pipeline that can discard loses early depth testing whether or not it
 * ever does. three rebuilds the node twin whenever the material's version moves,
 * so recomposing with `needsUpdate` costs the same recompile a define does, and
 * the composed nodes are cached so toggling back reuses them.
 *
 * WHAT IT REPRODUCES. The geometry's `id` attribute carries, per vertex, the four
 * bytes of `internalItemId + 1`; the ghost owns an R8 table indexed directly by
 * item id, and an item at or past the table's count is "no entry". The lookup
 * runs in the VERTEX stage (`vertexStage`), as the GLSL's flat varying does:
 * every vertex of a triangle belongs to one item. Ghosted surfaces are
 * desaturated (`colorNode`) and screen-doored with a 4x4 Bayer mask
 * (`maskNode`). The shadow pass keeps everything (`maskShadowNode`, where the
 * three version has it), as the GLSL never discarded there either.
 *
 * The id is rebuilt with arithmetic, not bit shifts: the bytes arrive as 0..255
 * floats and a float carries integers exactly to 2^24.
 *
 * Only the ghost layer lives here today; the structure (one composer per
 * material, one cached node set per combination of layers) is kept so other
 * per-item layers can join it without fighting over `colorNode`.
 */

type Value<T> = { value: T };

export interface GhostNodeUniforms {
  uGhostState: Value<THREE.Texture | null>;
  uGhostStateWidth: Value<number>;
  uGhostCount: Value<number>;
  uGhostInvert: Value<boolean>;
  uGhostOpacity: Value<number>;
}

export interface ShellLayer<U> {
  /** Reads and writes exactly like the GLSL uniforms, so `MaterialManager` does not know the build. */
  uniforms: U;
  /** The twin of the layer's GLSL define. */
  setEnabled: (enabled: boolean) => void;
}

export interface ShellLayerNodes {
  ghost: ShellLayer<GhostNodeUniforms>;
  /** Re-applies the composed nodes. */
  refresh: () => void;
}

/** The TSL namespace, or nothing at all when this is the WebGL build. */
const layerTsl = () => {
  const tsl = (THREE as any).TSL;
  const canRun =
    typeof (THREE as any).WebGPURenderer === "function" &&
    tsl &&
    typeof tsl.Fn === "function" &&
    typeof tsl.textureLoad === "function" &&
    typeof tsl.vertexStage === "function";
  return canRun ? tsl : null;
};

/** A one-texel table to point a texture node at until a real one arrives. */
const standIn = (format: THREE.PixelFormat, bytes: number[]) => {
  const texture = new THREE.DataTexture(new Uint8Array(bytes), 1, 1, format);
  texture.needsUpdate = true;
  return texture;
};

/** A `{ value }` accessor over a TSL uniform node, optionally translating the stored shape. */
function accessor<T>(
  node: any,
  read = (v: any) => v as T,
  write = (v: T) => v as any,
): Value<T> {
  return {
    get value() {
      return read(node.value);
    },
    set value(given: T) {
      node.value = write(given);
    },
  };
}

/**
 * The layers of one shell material, created on first use and cached on the
 * material. `null` under the WebGL build, where the GLSL patches do the work.
 */
export function shellLayerNodes(
  material: THREE.MeshLambertMaterial,
): ShellLayerNodes | null {
  const cached = material.userData.shellLayerNodes as
    | ShellLayerNodes
    | undefined;
  if (cached) return cached;
  const tsl = layerTsl();
  if (!tsl) return null;

  const {
    Fn,
    If,
    bool,
    attribute,
    uniform,
    texture,
    textureLoad,
    ivec2,
    float,
    vec3,
    vec4,
    materialColor,
    screenCoordinate,
    mix,
    dot,
    select,
    vertexStage,
  } = tsl;

  /** The item this vertex belongs to, and whether it has one. */
  const itemOf = () => {
    const id = attribute("id", "vec4");
    const raw = id.x
      .mul(16777216)
      .add(id.y.mul(65536))
      .add(id.z.mul(256))
      .add(id.w)
      .add(0.5)
      .floor();
    return { raw, item: raw.sub(1).toInt() };
  };

  /** One texel of an id-indexed table, or zero when the item is past it. Vertex stage only. */
  const lookup = (table: any, width: any, count: any) =>
    Fn(() => {
      const { raw, item } = itemOf();
      const texel = vec4(0, 0, 0, 0).toVar();
      If(raw.greaterThanEqual(1).and(item.lessThan(count.toInt())), () => {
        const columns = width.max(1).toInt();
        texel.assign(
          textureLoad(table, ivec2(item.mod(columns), item.div(columns))),
        );
      });
      return texel;
    })();

  // Ghost
  const ghostBlank = standIn(THREE.RedFormat, [0]);
  const ghostState = texture(ghostBlank);
  const ghostWidth = uniform(1);
  const ghostCount = uniform(0);
  const ghostInvert = uniform(0);
  const ghostOpacity = trackGhostOpacity(uniform(classicGhostOpacity()));
  const ghostFlag = vertexStage(
    Fn(() => {
      const inSet = select(
        lookup(ghostState, ghostWidth, ghostCount).r.greaterThan(0.5),
        float(1),
        float(0),
      );
      return select(ghostInvert.greaterThan(0.5), float(1).sub(inSet), inSet);
    })(),
  );
  /** 4x4 Bayer threshold in [0,1), the same order as the GLSL table. */
  const bayer = Fn(() => {
    const where = screenCoordinate.xy;
    const index = where.y.mod(4).toInt().mul(4).add(where.x.mod(4).toInt());
    const order = float(0).toVar();
    const table = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let slot = 0; slot < table.length; slot++) {
      order.assign(select(index.equal(slot), float(table[slot]), order));
    }
    return order.add(0.5).div(16);
  });

  const on = { ghost: false };
  const composed = new Map<
    string,
    { colour: any; mask: any; shadowMask: any }
  >();
  const keepAll = bool(true);

  const compose = () => {
    const key = `${on.ghost ? 1 : 0}`;
    let nodes = composed.get(key);
    if (!nodes) {
      const colour = on.ghost
        ? Fn(() => {
            const base = materialColor.toVar();
            If(ghostFlag.greaterThan(0.5), () => {
              const luma = dot(base, vec3(0.299, 0.587, 0.114));
              base.assign(mix(base, vec3(luma, luma, luma), 0.7).mul(0.9));
            });
            return base;
          })()
        : null;
      // The screen-door is a MASK, not a `Discard` inside the colour:
      // discarding from `colorNode` left the desaturation working and the
      // screen-door absent; `maskNode` is the material's own discard hook.
      const mask = on.ghost
        ? Fn(() =>
            ghostFlag.lessThan(0.5).or(bayer().lessThan(ghostOpacity)),
          )()
        : null;
      nodes = { colour, mask, shadowMask: on.ghost ? keepAll : null };
      composed.set(key, nodes);
    }
    const m = material as any;
    if (m.colorNode === nodes.colour && m.maskNode === nodes.mask) return;
    m.colorNode = nodes.colour;
    m.maskNode = nodes.mask;
    m.maskShadowNode = nodes.shadowMask;
    material.needsUpdate = true;
  };

  const switcher = (layer: keyof typeof on) => (enabled: boolean) => {
    if (on[layer] === enabled) return;
    on[layer] = enabled;
    compose();
  };

  const layers: ShellLayerNodes = {
    ghost: {
      uniforms: {
        uGhostState: accessor<THREE.Texture | null>(
          ghostState,
          undefined,
          (t) => t ?? ghostBlank,
        ),
        uGhostStateWidth: accessor<number>(ghostWidth),
        uGhostCount: accessor<number>(ghostCount),
        // A float rather than a bool in the shader: a number is the one shape
        // every TSL release agrees on.
        uGhostInvert: accessor<boolean>(
          ghostInvert,
          (v) => v > 0.5,
          (b) => (b ? 1 : 0),
        ),
        uGhostOpacity: accessor<number>(ghostOpacity),
      },
      setEnabled: switcher("ghost"),
    },
    refresh: compose,
  };
  material.userData.shellLayerNodes = layers;
  return layers;
}

/**
 * Every write lands in the GLSL uniforms and in the node's, so whichever
 * renderer draws the material sees it. The two objects have the same keys by
 * construction.
 */
export function fanOutUniforms<U extends { [K in keyof U]: Value<any> }>(
  glsl: U,
  node: U,
): U {
  const out = {} as U;
  for (const key of Object.keys(glsl) as (keyof U)[]) {
    Object.defineProperty(out, key, {
      enumerable: true,
      value: {
        get value() {
          return glsl[key].value;
        },
        set value(given: any) {
          glsl[key].value = given;
          node[key].value = given;
        },
      },
    });
  }
  return out;
}
