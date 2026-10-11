import { describe, expect, test } from "vitest";
import * as THREE from "three";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Pako from "pako";
import { VirtualFragmentsModel } from "../virtual-fragments-model";
import { ModelUid, TileRequestClass } from "../../model/model-types";

// Issue #300: under continuous view refreshes (a moving camera) the tile
// pass never completed. FINISH keeps meaning "the view you last sent is
// complete", so it is not emitted for a view that is superseded before its
// pass ends. What must not starve is the work: every view change used to
// rewind the sweep to the largest samples, so while the camera moved the
// smaller ones were never revisited and everything arrived at once on
// release.

const FRAG = fileURLToPath(
  new URL("../../../../../../../resources/frags/school_arq.frag", import.meta.url),
);

// A pass takes this many ticks, so refreshes land while it is in progress.
const TICKS_PER_PASS = 10;

const setup = async () => {
  const connection: any = { fetch: async () => {}, fetchMeshCompute: () => {} };
  const inflated = Pako.inflate(readFileSync(FRAG));
  const data = inflated.buffer.slice(
    inflated.byteOffset,
    inflated.byteOffset + inflated.byteLength,
  );
  const model = new VirtualFragmentsModel(1 as ModelUid, data, connection, {
    multithreading: { meshConnectionThreshold: 0, meshConnectionRate: 0 },
  });
  await model.setupData();
  const tiles = model.tiles as any;
  const samples = tiles._sampleAmount as number;
  tiles._params.updateTime = 0;
  tiles._params.updateSamples = Math.ceil(samples / TICKS_PER_PASS);

  const stats = { finishes: 0 };
  const process = tiles._meshConnection.process.bind(tiles._meshConnection);
  tiles._meshConnection.process = (request: any) => {
    if (request.tileRequestClass === TileRequestClass.FINISH) stats.finishes++;
    return process(request);
  };
  let visiting = false;
  const visited = new Uint8Array(samples);
  const updateMesh = tiles.updateMesh.bind(tiles);
  tiles.updateMesh = (sample: number) => {
    if (visiting) visited[sample] = 1;
    return updateMesh(sample);
  };

  const box = tiles._boxes.fullBox as THREE.Box3;
  const center = box.getCenter(new THREE.Vector3());
  const diagonal = box.getSize(new THREE.Vector3()).length();
  const viewAt = (angle: number, distance = 1) => {
    const position = center
      .clone()
      .add(
        new THREE.Vector3(Math.cos(angle), 0.6, Math.sin(angle)).multiplyScalar(
          diagonal * distance,
        ),
      );
    const camera = new THREE.PerspectiveCamera(60, 1.5, 0.01, 1e7);
    camera.position.copy(position);
    camera.lookAt(center);
    camera.updateMatrixWorld();
    return {
      cameraFrustum: new THREE.Frustum().setFromProjectionMatrix(
        new THREE.Matrix4().multiplyMatrices(
          camera.projectionMatrix,
          camera.matrixWorldInverse,
        ),
      ),
      cameraPosition: position,
      fov: 60,
      viewSize: 1512,
      graphicThreshold: 1e9,
      meshThreshold: 1e9,
      graphicQuality: 2,
      clippingPlanes: [],
      modelPlacement: new THREE.Matrix4(),
    };
  };
  const tick = (n = 1) => {
    for (let i = 0; i < n; i++) model.update(performance.now());
  };
  // Samples whose tile state disagrees with a fresh evaluation against the
  // view the controller holds now. Zero means the latest view is complete.
  const staleSamples = () => {
    let stale = 0;
    for (let s = 0; s < samples; s++) {
      if (tiles._sampleLodState[s] !== tiles.fetchLodLevel(s)) stale++;
    }
    return stale;
  };
  const watchVisits = (on: boolean) => {
    visiting = on;
    if (on) visited.fill(0);
  };
  const visitedCount = () => visited.reduce((a, b) => a + b, 0);
  return {
    model,
    tiles,
    samples,
    stats,
    viewAt,
    tick,
    staleSamples,
    watchVisits,
    visitedCount,
  };
};

describe("tile FINISH under continuous view refreshes (issue #300)", () => {
  test("control: a stationary camera completes the pass and emits FINISH", async () => {
    const t = await setup();
    for (let i = 0; i < TICKS_PER_PASS * 4; i++) {
      t.model.refreshView(t.viewAt(0));
      t.tick();
    }
    expect(t.stats.finishes).toBeGreaterThanOrEqual(1);
    expect(t.staleSamples()).toBe(0);
    t.model.dispose();
  }, 60000);

  test("a moving camera keeps sweeping every sample, and FINISH follows promptly once it stops", async () => {
    const t = await setup();
    // Settle once, as a loaded model would be before the user orbits.
    t.model.refreshView(t.viewAt(0));
    t.tick(TICKS_PER_PASS);
    expect(t.stats.finishes).toBe(1);

    // Orbit 3 degrees per refresh with 3 ticks between refreshes: every
    // refresh crosses the sweep's rewind thresholds, and a pass spans
    // more than three refreshes.
    const step = (3 * Math.PI) / 180;
    const refreshes = 40;
    t.watchVisits(true);
    for (let r = 1; r <= refreshes; r++) {
      t.model.refreshView(t.viewAt(step * r));
      t.tick(3);
    }
    t.watchVisits(false);
    // Every sample was re-evaluated during the orbit (it was 30% before).
    expect(t.visitedCount()).toBe(t.samples);
    // No view lasted a full pass, so none was complete: no FINISH.
    expect(t.stats.finishes).toBe(1);

    // The camera rests on the last view: its pass completes within one
    // pass of ticks from that view's refresh, and it is exact.
    let ticks = 3;
    while (t.stats.finishes === 1 && ticks < TICKS_PER_PASS * 3) {
      t.tick();
      ticks++;
    }
    expect(t.stats.finishes).toBe(2);
    expect(ticks).toBeLessThanOrEqual(TICKS_PER_PASS + 1);
    expect(t.staleSamples()).toBe(0);
    t.model.dispose();
  }, 60000);

  test("FINISH is the last request of its pass: no tile request follows it", async () => {
    // Main resolves `update(true)` when FINISH lands. Tile requests the
    // worker sends after it sit in the queue until the next timed update,
    // so they reach the screen ~100 ms after the awaiter was released.
    const t = await setup();
    // A whole pass in one tick, as in the browser for a small model: the
    // tick that completes the pass is the one that sends all its updates.
    t.tiles._params.updateSamples = t.samples;
    const sent: number[] = [];
    const process = t.tiles._meshConnection.process.bind(t.tiles._meshConnection);
    t.tiles._meshConnection.process = (request: any) => {
      sent.push(request.tileRequestClass);
      return process(request);
    };
    let requestsInFinishTicks = 0;
    const views = [t.viewAt(0), t.viewAt(0.8, 0.3), t.viewAt(2), t.viewAt(3, 0.5)];
    for (const view of views) {
      t.model.refreshView(view);
      sent.length = 0;
      let finishes = 0;
      for (let i = 0; i < TICKS_PER_PASS * 3; i++) {
        const before = sent.length;
        t.tick();
        if (!finishes && sent.includes(TileRequestClass.FINISH)) {
          requestsInFinishTicks += sent.length - before - 1;
        }
        finishes = sent.filter((c) => c === TileRequestClass.FINISH).length;
      }
      expect(finishes).toBe(1);
      const finishAt = sent.indexOf(TileRequestClass.FINISH);
      expect(sent.slice(finishAt + 1)).toEqual([]);
    }
    // The ticks that completed the passes did send tile work, so the
    // ordering above was actually exercised.
    expect(requestsInFinishTicks).toBeGreaterThan(0);
    t.model.dispose();
  }, 60000);

  test("FINISH is not emitted for a pass whose view was superseded", async () => {
    const t = await setup();
    t.model.refreshView(t.viewAt(0));
    t.tick(TICKS_PER_PASS);
    expect(t.stats.finishes).toBe(1);

    // View A runs most of its pass, then view B supersedes it.
    t.model.refreshView(t.viewAt(0.5));
    t.tick(TICKS_PER_PASS - 1);
    expect(t.stats.finishes).toBe(1);
    // B is a close-up, so many samples change LOD or leave the frustum.
    t.model.refreshView(t.viewAt(1, 0.2));
    // The ticks that would have completed A's pass must not FINISH: the
    // geometry is not yet complete for B, the view last sent.
    t.tick(TICKS_PER_PASS - 1);
    expect(t.stats.finishes).toBe(1);
    expect(t.staleSamples()).toBeGreaterThan(0);
    // B's own pass completes: FINISH, once, and B's view is fully applied.
    t.tick(1);
    expect(t.stats.finishes).toBe(2);
    expect(t.staleSamples()).toBe(0);
    t.tick(2);
    expect(t.stats.finishes).toBe(2);

    // A big view change after a completed lap still rewinds the sweep to
    // the largest samples first.
    t.model.refreshView(t.viewAt(2.5));
    expect(t.tiles._currentSample).toBe(0);
    t.model.dispose();
  }, 60000);
});
