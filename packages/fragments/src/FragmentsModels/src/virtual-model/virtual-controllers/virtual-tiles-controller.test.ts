import { describe, expect, test } from "vitest";
import * as THREE from "three";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Pako from "pako";
import { VirtualFragmentsModel } from "../virtual-fragments-model";
import { CameraUtils } from "../../utils/geometry/camera-utils";
import { CurrentLod } from "../../model/model-types";

/**
 * Regression test for https://github.com/ThatOpen/engine_fragment/issues/287
 * (fixed by #288): `VirtualTilesController.setSample()` forwarded
 * `high === 0` as `updateTile()`'s `visible` argument instead of the real
 * `vis` value it had just correctly stored via `this._samples.setVisible
 * (id, vis)`. Since `high` (highlight state) is 0 for virtually every
 * non-highlighted sample, `high === 0` is true almost unconditionally -
 * the tile's actually-rendered visibility buffer ends up decoupled from
 * `setVisible()`/`toggleVisible()`'s real intent.
 *
 * `setSample()` is reached from `updateMesh()`'s `current === past` fast
 * path (a sample whose LOD classification is unchanged since the last
 * tick) - confirmed reliably reproducible in the wild on a large model
 * (18,382 samples / 12,338 items), rare enough on small models that it
 * went unnoticed. Reproducing the exact real-world sequence that lands a
 * sample on that fast path turned out to depend on worker/event-loop
 * timing (concurrent `update()` calls interleaving with a `setVisible()`
 * RPC) that a synchronous, in-process test cannot recreate - traced
 * exhaustively against the real code (single toggles, rapid re-toggles,
 * overlapping batches, multi-sample-per-item geometry) without finding a
 * synchronous call sequence that reaches the fast path with a stale
 * value, across both a single-representation and a multi-representation
 * synthetic fixture. Stated honestly rather than glossed over - see the
 * synthetic fixture below and PR discussion for the full investigation.
 *
 * This test instead pins the fixed line directly, the same way
 * `view-manager.test.ts` pins its own guard in isolation: calling
 * `setSample()` - reached here via the private `updateMesh`/
 * `updateSampleIfSeen` fast path, engineered directly rather than hoping
 * a particular call sequence lands on it - with the exact
 * (`vis=false`, `high=0`) combination that silently passed under the bug,
 * and asserting on the SAME buffer the bug corrupts (`tile.visibilities`,
 * read the same way `MultiBufferData.getBufferData` exposes it
 * internally) rather than on `getVisible()`, which only reflects
 * `ItemConfigController`'s bookkeeping - correct even under the bug,
 * which is exactly why the symptom is invisible to a `getVisible()`-only
 * assertion.
 */

const FRAG = fileURLToPath(
  new URL("../../../../../../../resources/frags/synthetic_large_grid.frag", import.meta.url),
);

const viewFor = (cameraFrustum: THREE.Frustum) => ({
  cameraFrustum,
  cameraPosition: new THREE.Vector3(0, 1, 10),
  fov: 60,
  orthogonalDimension: 0.01,
  viewSize: 10000,
  graphicThreshold: Number.MAX_SAFE_INTEGER,
  graphicQuality: 0.5,
  clippingPlanes: [],
  modelPlacement: new THREE.Matrix4(),
  meshThreshold: Number.MAX_SAFE_INTEGER,
});

/** Reads the tile-buffer bit that actually controls whether `sampleId`
 * renders - the exact value `setSample()`'s buggy line corrupted. */
const tileVisibilityFor = (model: VirtualFragmentsModel, sampleId: number) => {
  const tiles = (model.tiles as any)._tiles as Map<number, any>;
  for (const tile of tiles.values()) {
    const location = tile.sampleLocation.get(sampleId);
    if (location !== undefined) {
      return (tile.visibilities as any).getBufferData(location).data as boolean;
    }
  }
  return undefined;
};

const loadStabilized = async () => {
  const connection: any = { fetch: async () => {}, fetchMeshCompute: () => {} };
  const inflated = Pako.inflate(readFileSync(FRAG));
  const data = inflated.buffer.slice(
    inflated.byteOffset,
    inflated.byteOffset + inflated.byteLength,
  );
  const model = new VirtualFragmentsModel("m", data, connection, {
    multithreading: { meshConnectionThreshold: 0, meshConnectionRate: 0 },
  });
  await model.setupData();
  model.refreshView(viewFor(CameraUtils.containing(model.getFullBBox())));
  // Run to completion once so every sample has a real, settled
  // CurrentLod.GEOMETRY classification (matching how setSample() is
  // actually reached in production: a sample already visible on screen).
  for (let i = 0; i < 500; i++) model.update(performance.now());
  return model;
};

describe("VirtualTilesController.setSample (issue #287 / PR #288)", () => {
  test("hiding a non-highlighted, currently-visible sample updates the tile's real visibility buffer", async () => {
    const model = await loadStabilized();
    try {
      expect(tileVisibilityFor(model, 0)).toBe(true);

      // The exact call setSample() makes internally when updateSampleIfSeen()
      // routes a visibility-only change through the current===past fast
      // path: a non-highlighted (high=0) sample being hidden (vis=false).
      // Under the bug, `high === 0` (true) was forwarded as `visible`
      // instead of `vis` (false) - the tile buffer would incorrectly stay
      // `true`.
      (model.tiles as any).setSample(0, false, 0, CurrentLod.GEOMETRY);

      expect(tileVisibilityFor(model, 0)).toBe(false);
    } finally {
      model.dispose();
    }
  });

  test("re-showing a non-highlighted, currently-hidden sample updates the tile's real visibility buffer", async () => {
    const model = await loadStabilized();
    try {
      (model.tiles as any).setSample(0, false, 0, CurrentLod.GEOMETRY);
      expect(tileVisibilityFor(model, 0)).toBe(false);

      (model.tiles as any).setSample(0, true, 0, CurrentLod.GEOMETRY);
      expect(tileVisibilityFor(model, 0)).toBe(true);
    } finally {
      model.dispose();
    }
  });

  test("a highlighted sample's own visibility is unaffected by the highlight state", async () => {
    const model = await loadStabilized();
    try {
      // high != 0 here - `high === 0` is false, so this specific
      // combination happened to forward the right value even under the
      // bug (high===0 evaluating to false matches vis=false). Included to
      // document precisely which combination the bug affected (high=0,
      // the overwhelmingly common non-highlighted case) versus which it
      // didn't, not because this case needs the fix to pass.
      (model.tiles as any).setSample(0, false, 3, CurrentLod.GEOMETRY);
      expect(tileVisibilityFor(model, 0)).toBe(false);
    } finally {
      model.dispose();
    }
  });
});
