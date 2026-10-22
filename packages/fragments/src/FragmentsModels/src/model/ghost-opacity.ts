/**
 * The ghost's opacity, one value for every classic material. A ghosted surface
 * keeps this fraction of its pixels (the screen-door of ghost-emission.ts,
 * shell-layer-nodes.ts and the LOD lines). Each material makes its own uniform
 * (three's `UniformsUtils.merge` clones them), so every one is recorded here,
 * weakly, and set when the value changes.
 */

interface Held {
  value: number;
}
interface WeakHold {
  deref(): Held | undefined;
}

const WeakRefCtor = (globalThis as any).WeakRef as
  | (new (target: Held) => WeakHold)
  | undefined;
const live = new Set<WeakHold | Held>();

/** The default: a ghosted surface keeps 28 % of its pixels. */
export const CLASSIC_GHOST_OPACITY = 0.28;
let current = CLASSIC_GHOST_OPACITY;

/** The fraction of a ghosted surface's pixels kept, 0 to 1 (0.28 by default). */
export function classicGhostOpacity() {
  return current;
}

/**
 * Records a material's ghost-opacity uniform (a `{ value }` or a TSL uniform
 * node) and gives it the current value.
 */
export function trackGhostOpacity<T extends Held>(uniform: T): T {
  uniform.value = current;
  live.add(WeakRefCtor ? new WeakRefCtor(uniform) : uniform);
  return uniform;
}

/** Sets the ghost opacity of every material, made or to be made. */
export function setClassicGhostOpacity(alpha: number) {
  current = alpha;
  for (const held of live) {
    const uniform = "deref" in held ? held.deref() : held;
    if (uniform) uniform.value = alpha;
    else live.delete(held);
  }
}
