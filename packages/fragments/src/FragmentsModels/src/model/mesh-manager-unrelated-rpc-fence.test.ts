// @vitest-environment happy-dom
import { describe, expect, test } from "vitest";
import * as THREE from "three";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Pako from "pako";
import { MeshManager } from "./mesh-manager";
import { ViewManager } from "./view-manager";
import { MultiThreadingRequestClass, TileRequestClass } from "./model-types";
import { VirtualFragmentsModel } from "../virtual-model/virtual-fragments-model";
import { MultithreadingHelper } from "../multithreading/multithreading-helper";
import { threadSeq } from "../multithreading/thread-seq";

// `update(true)` must settle once the forced refreshes are answered, even if
// a request that never produces a FINISH (an EXECUTE such as a pick, or any
// request of another FragmentsModels instance) was sent while the refresh
// round trip was in flight (#341).
//
// Same harness as mesh-manager-multi-model-fence.test.ts: real main-side
// dispatch (ViewManager + MeshManager) against a real worker-side model,
// with the transport replaced by a queue the test drains.

const frag = (name: string) =>
  resolve(process.cwd(), `../../resources/frags/${name}.frag`);

const setup = async () => {
  const meshes = new MeshManager(() => {});
  // Tile updates are applied on the GPU side; only the fence matters here.
  (meshes as any).processTileRequest = () => {};
  const inbox: any[] = [];
  const toMain: any = {
    fetch: async () => {},
    fetchMeshCompute: (_modelId: string, list: any[]) => meshes.requests.add(list),
  };

  const inflated = Pako.inflate(readFileSync(frag("school_arq")));
  const data = inflated.buffer.slice(
    inflated.byteOffset,
    inflated.byteOffset + inflated.byteLength,
  );
  const id = "arq";
  const worker = new VirtualFragmentsModel(id, data, toMain, {
    multithreading: { meshConnectionThreshold: 0, meshConnectionRate: 1e6 },
  });
  await worker.setupData();
  const tiles = worker.tiles as any;
  tiles._params.updateTime = 0;
  tiles._params.updateSamples = tiles._sampleAmount;

  const main: any = {
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
  meshes.list.set(id, main);

  const camera = new THREE.PerspectiveCamera(60, 1.5, 0.01, 1e7);
  const view = new ViewManager();
  view.useCamera(camera);
  const box = tiles._boxes.fullBox as THREE.Box3;
  const center = box.getCenter(new THREE.Vector3());
  camera.position
    .copy(center)
    .add(new THREE.Vector3(1, 0.6, 1).multiplyScalar(box.getSize(new THREE.Vector3()).length()));
  camera.lookAt(center);
  camera.updateMatrixWorld();

  // What the worker does with a message: take the seq, run the handler.
  const deliver = () => {
    for (const input of inbox.splice(0)) {
      if (input.seq > threadSeq.lastSeen) threadSeq.lastSeen = input.seq;
      if (input.class === MultiThreadingRequestClass.EXECUTE) {
        (worker as any)[input.function](...input.parameters);
        continue;
      }
      const v = input.view;
      worker.refreshView({
        ...v,
        cameraFrustum: MultithreadingHelper.frustum(v.cameraFrustum),
        cameraPosition: MultithreadingHelper.array(v.cameraPosition),
        clippingPlanes: MultithreadingHelper.planeSet(v.clippingPlanes),
      });
    }
  };
  const tick = () => worker.update(performance.now());
  // Lets the mesh connection flush and the fence react, like frames would.
  const run = async (ticks: number) => {
    for (let i = 0; i < ticks; i++) {
      tick();
      await new Promise((r) => setTimeout(r, 0));
    }
  };
  // A pick for hover snapping, as in the report.
  const execute = () =>
    main.threads.fetch(
      MultithreadingHelper.getExecuteRequest(id, "getLocalIdsFromItemIds", [[1]]),
    );

  // Settle the initial view.
  await view.refreshView(main, meshes, true);
  const initial = meshes.forceUpdateFinish();
  deliver();
  await run(20);
  await initial;

  const finishSeq = () => (meshes as any)._finishSeq.get(id) as number;

  return {
    meshes,
    main,
    view,
    deliver,
    run,
    execute,
    finishSeq,
    dispose: () => worker.dispose(),
  };
};

const settles = async (fence: Promise<void>, run: (n: number) => Promise<void>) => {
  let resolved = false;
  fence.then(() => {
    resolved = true;
  });
  await run(30);
  return resolved;
};

describe("update(true) with a request that produces no FINISH (#341)", () => {
  test("an EXECUTE sent while the forced refresh is in flight does not hold the fence", async () => {
    const t = await setup();
    // FragmentsModels.update(true) with an unchanged view: the worker answers
    // the refresh with a FINISH right away.
    await t.view.refreshView(t.main, t.meshes, true);
    const refreshSeq = MultithreadingHelper.lastDispatchedSeq;
    // The pick goes out before the refresh's reply reaches main.
    t.execute();
    t.deliver();
    await t.run(1);
    // The refresh has been answered by its FINISH.
    expect(t.finishSeq()).toBe(refreshSeq);
    const resolved = await settles(t.meshes.forceUpdateFinish(), t.run);
    t.dispose();
    expect(resolved).toBe(true);
  }, 60000);

  test("a request of another FragmentsModels instance does not hold the fence", async () => {
    const t = await setup();
    await t.view.refreshView(t.main, t.meshes, true);
    const refreshSeq = MultithreadingHelper.lastDispatchedSeq;
    // Another instance's FragmentsConnection.fetch, to its own worker.
    MultithreadingHelper.nextSeq();
    t.deliver();
    await t.run(1);
    expect(t.finishSeq()).toBe(refreshSeq);
    const resolved = await settles(t.meshes.forceUpdateFinish(), t.run);
    t.dispose();
    expect(resolved).toBe(true);
  }, 60000);

  test("the fence still waits for the forced refresh's own FINISH", async () => {
    const meshes = new MeshManager(() => {});
    meshes.list.set("a", { _finishProcessing() {} } as any);
    const seq = MultithreadingHelper.nextSeq();
    meshes.viewDispatched("a", seq);
    MultithreadingHelper.nextSeq();
    let resolved = false;
    const fence = meshes.forceUpdateFinish().then(() => {
      resolved = true;
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(resolved).toBe(false);
    meshes.requests.add([
      { modelId: "a", tileRequestClass: TileRequestClass.FINISH, seq },
    ]);
    await fence;
    expect(resolved).toBe(true);
  }, 500);
});
