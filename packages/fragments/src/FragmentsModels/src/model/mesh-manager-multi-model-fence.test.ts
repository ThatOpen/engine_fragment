// @vitest-environment happy-dom
import { describe, expect, test } from "vitest";
import * as THREE from "three";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Pako from "pako";
import { MeshManager } from "./mesh-manager";
import { ViewManager } from "./view-manager";
import { ModelUid, TileRequestClass } from "./model-types";
import { VirtualFragmentsModel } from "../virtual-model/virtual-fragments-model";
import { MultithreadingHelper } from "../multithreading/multithreading-helper";
import { threadSeq } from "../multithreading/thread-seq";

// `update(true)` fences on FINISH. With several models loaded, the FINISH of
// the model whose pass is short must not release the await while another
// model is still sweeping the same view.
//
// Real main-side dispatch (ViewManager + MeshManager) against real worker-side
// models; only the transport is replaced, by a queue the test drains, and the
// worker's update loop by `tick`.

// happy-dom rewrites import.meta.url, so resolve from the package root the
// suite runs in.
const frag = (name: string) =>
  resolve(process.cwd(), `../../resources/frags/${name}.frag`);

// A school_str pass spans this many ticks; school_arq's fits in one.
const STR_TICKS_PER_PASS = 4;

const setup = async () => {
  const meshes = new MeshManager(() => {});
  const applied = new Map<ModelUid, number>();
  (meshes as any).processTileRequest = (request: any) => {
    if (request.tileRequestClass === TileRequestClass.FINISH) return;
    applied.set(request.uid, (applied.get(request.uid) ?? 0) + 1);
  };

  const worker = new Map<ModelUid, VirtualFragmentsModel>();
  const inbox: any[] = [];
  const toMain: any = {
    fetch: async () => {},
    fetchMeshCompute: (_uid: ModelUid, list: any[]) => meshes.requests.add(list),
  };

  const camera = new THREE.PerspectiveCamera(60, 1.5, 0.01, 1e7);
  const views = new Map<string, ViewManager>();
  const mains = new Map<string, any>();

  const load = async (
    uid: ModelUid,
    id: string,
    file: string,
    ticksPerPass: number,
  ) => {
    const inflated = Pako.inflate(readFileSync(frag(file)));
    const data = inflated.buffer.slice(
      inflated.byteOffset,
      inflated.byteOffset + inflated.byteLength,
    );
    const model = new VirtualFragmentsModel(uid, data, toMain, {
      multithreading: { meshConnectionThreshold: 0, meshConnectionRate: 1e6 },
    });
    await model.setupData();
    const tiles = model.tiles as any;
    tiles._params.updateTime = 0;
    tiles._params.updateSamples = Math.ceil(tiles._sampleAmount / ticksPerPass);
    worker.set(uid, model);

    const main: any = {
      _uid: uid,
      modelId: id,
      object: new THREE.Object3D(),
      box: tiles._boxes.fullBox.clone(),
      graphicsQuality: 0,
      threads: {
        activeThreadCount: 1,
        // Mirrors FragmentsConnection.fetch: every RPC gets the next seq.
        fetch: async (input: any) => {
          if (input.seq === undefined) input.seq = MultithreadingHelper.nextSeq();
          inbox.push(input);
        },
      },
      _finishProcessing() {},
    };
    mains.set(id, main);
    meshes._add(main);
    const view = new ViewManager();
    view.useCamera(camera);
    views.set(id, view);
  };

  await load(1 as ModelUid, "arq", "school_arq", 1);
  await load(2 as ModelUid, "str", "school_str", STR_TICKS_PER_PASS);

  const box = new THREE.Box3();
  for (const m of worker.values()) box.union((m.tiles as any)._boxes.fullBox);
  const center = box.getCenter(new THREE.Vector3());
  const diagonal = box.getSize(new THREE.Vector3()).length();
  const moveCamera = (angle: number) => {
    camera.position
      .copy(center)
      .add(
        new THREE.Vector3(Math.cos(angle), 0.6, Math.sin(angle)).multiplyScalar(
          diagonal,
        ),
      );
    camera.lookAt(center);
    camera.updateMatrixWorld();
  };

  // What the worker does with a message: take the seq, run the handler.
  // Copies the view like the structured clone of postMessage would.
  const deliver = () => {
    for (const input of inbox.splice(0)) {
      if (input.seq > threadSeq.lastSeen) threadSeq.lastSeen = input.seq;
      const v = input.view;
      worker.get(input.uid)!.refreshView({
        ...v,
        cameraFrustum: MultithreadingHelper.frustum(v.cameraFrustum),
        cameraPosition: MultithreadingHelper.array(v.cameraPosition),
        clippingPlanes: MultithreadingHelper.planeSet(v.clippingPlanes),
      });
    }
  };
  // One pass of the worker's update loop over every model.
  const tick = () => {
    const start = performance.now();
    for (const m of worker.values()) m.update(start);
  };
  const passDone = (id: string) =>
    (worker.get(mains.get(id)._uid)!.tiles as any).tilesUpdated;

  // FragmentsModels.update(true): a forced refresh per model, then the fence.
  const forcedUpdate = async (ids = [...mains.keys()]) => {
    await Promise.all(
      ids.map((id) => views.get(id)!.refreshView(mains.get(id), meshes, true)),
    );
    return meshes.forceUpdateFinish();
  };

  const dispose = () => {
    for (const m of worker.values()) m.dispose();
  };

  return {
    meshes,
    applied,
    moveCamera,
    deliver,
    tick,
    passDone,
    forcedUpdate,
    dispose,
    ids: [...mains.keys()],
  };
};

const MAX_TICKS = 50;

describe("update(true) with several models", () => {
  test("resolves only after every model has finished its pass for the latest view", async () => {
    const t = await setup();
    // Settle the initial view.
    t.moveCamera(0);
    const initial = t.forcedUpdate();
    t.deliver();
    for (let i = 0; i < MAX_TICKS; i++) t.tick();
    await initial;

    const moves = 20;
    let resolvedEarly = 0;
    let lateUpdates = 0;
    for (let move = 1; move <= moves; move++) {
      t.moveCamera((move * 25 * Math.PI) / 180);
      let resolved = false;
      const fence = t.forcedUpdate().then(() => {
        resolved = true;
      });
      // Let the refresh dispatch reach the inbox.
      await new Promise((r) => setTimeout(r, 0));
      t.deliver();
      let ticks = 0;
      while (!resolved && ticks < MAX_TICKS) {
        t.tick();
        ticks++;
        await Promise.resolve();
        await Promise.resolve();
      }
      await fence;
      const incomplete = t.ids.filter((id) => !t.passDone(id));
      if (incomplete.length) resolvedEarly++;
      const before = [...t.applied.values()].reduce((a, b) => a + b, 0);
      for (let i = 0; i < MAX_TICKS; i++) t.tick();
      const after = [...t.applied.values()].reduce((a, b) => a + b, 0);
      lateUpdates += after - before;
    }
    t.dispose();
    expect({ resolvedEarly, lateUpdates }).toEqual({
      resolvedEarly: 0,
      lateUpdates: 0,
    });
  }, 120000);

  test("a model with no refresh in flight does not hold the fence", async () => {
    const t = await setup();
    t.moveCamera(0);
    const initial = t.forcedUpdate();
    t.deliver();
    for (let i = 0; i < MAX_TICKS; i++) t.tick();
    await initial;

    // Only arq gets a new view (str is frozen, say).
    t.moveCamera(1);
    let resolved = false;
    const fence = t.forcedUpdate(["arq"]).then(() => {
      resolved = true;
    });
    await new Promise((r) => setTimeout(r, 0));
    t.deliver();
    t.tick();
    await Promise.resolve();
    await Promise.resolve();
    await fence;
    expect(resolved).toBe(true);
    t.dispose();
  }, 120000);
});
