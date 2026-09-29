import { describe, expect, test } from "vitest";
import * as THREE from "three";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Pako from "pako";
import { VirtualFragmentsModel } from "../virtual-fragments-model";
import { ModelUid, TileRequestClass } from "../../model/model-types";

// Issue #300: a view refresh that differs from the previous one (a moving
// camera) restarts the tile pass, which zeroes its progress and drops any
// queued FINISH. Under continuous refreshes the pass never completes and no
// FINISH is ever emitted, however much budget the worker is given in total.
//
// This is a reproduction only. What FINISH should mean once it can be
// emitted mid-pass is a design decision (see the issue), so the moving-camera
// case is pinned with `test.fails`: it documents today's behaviour and will
// flag, by starting to pass, whichever change fixes it.

const FRAG = fileURLToPath(
  new URL("../../../../../../../resources/frags/school_arq.frag", import.meta.url),
);

const run = async (moving: boolean, passesOfBudget: number) => {
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

  // A pass takes 10 ticks, so a refresh arrives while it is in progress.
  const ticksPerPass = 10;
  tiles._params.updateTime = 0;
  tiles._params.updateSamples = Math.ceil(samples / ticksPerPass);

  let finishes = 0;
  let restarts = 0;
  const process = tiles._meshConnection.process.bind(tiles._meshConnection);
  tiles._meshConnection.process = (request: any) => {
    if (request.tileRequestClass === TileRequestClass.FINISH) finishes++;
    return process(request);
  };
  const restart = tiles.restart.bind(tiles);
  tiles.restart = () => {
    restarts++;
    return restart();
  };

  const box = tiles._boxes.fullBox as THREE.Box3;
  const center = box.getCenter(new THREE.Vector3());
  const diagonal = box.getSize(new THREE.Vector3()).length();
  const viewAt = (t: number) => {
    const angle = moving ? t * 0.01 : 0;
    const position = center
      .clone()
      .add(
        new THREE.Vector3(Math.cos(angle), 0.6, Math.sin(angle)).multiplyScalar(
          diagonal,
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

  // One cycle = what FragmentsModels.update() drives: refresh, then a tick.
  const cycles = ticksPerPass * passesOfBudget;
  for (let t = 0; t < cycles; t++) {
    model.refreshView(viewAt(t));
    model.update(performance.now());
  }
  const stats = {
    samples,
    cycles,
    finishes,
    restarts,
    changedSamples: tiles._changedSamples as number,
  };
  console.log(`#300 ${moving ? "moving" : "stationary"}:`, JSON.stringify(stats));
  model.dispose();
  return stats;
};

describe("tile FINISH under continuous view refreshes (issue #300)", () => {
  test("control: a stationary camera completes the pass and emits FINISH", async () => {
    const stats = await run(false, 4);
    expect(stats.finishes).toBeGreaterThanOrEqual(1);
  }, 60000);

  test.fails(
    "a moving camera with four passes' worth of budget still gets a FINISH",
    async () => {
      const stats = await run(true, 4);
      expect(stats.finishes).toBeGreaterThanOrEqual(1);
    },
    60000,
  );
});
