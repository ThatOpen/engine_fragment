import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import * as THREE from "three";
import { PlanesUtils } from "../utils/geometry/planes-utils";
import { ThreadViewRefresher } from "../multithreading/thread-controllers/thread-view-refresher";
import { VirtualTilesController } from "../virtual-model/virtual-controllers/virtual-tiles-controller";
import { ViewManager } from "./view-manager";
import { MultithreadingHelper } from "../multithreading/multithreading-helper";
import { CameraUtils } from "../utils/geometry/camera-utils";
import { MultiThreadingRequestClass } from "./model-types";

/**
 * Regression test for https://github.com/ThatOpen/engine_fragment/issues/255
 *
 * A default THREE.Frustum (never initialised from a real camera) has six
 * planes with normal=(1,0,0) and constant=0.  PlanesUtils.collides rejects
 * any box entirely at x < 0, silently culling ~50 % of an origin-centred
 * model.
 *
 * The fix: when no camera has been set, ViewManager.refreshView sends a
 * frustum built from the model's own bounds — one that contains all of it
 * — instead of the default. Nothing else has to agree to that. The worker
 * culls against it exactly as it would any frustum and discards nothing,
 * so a worker published before this fix behaves correctly without knowing
 * the fix exists. That matters because the worker is a separately pinned
 * artifact, and an out-of-band signal (a companion flag, or omitting the
 * frustum) is precisely what such a worker cannot read.
 *
 * Exercised here against the real implementations rather than
 * reimplemented locally:
 *
 *   1. ViewManager.refreshView             — builds the containing frustum
 *   2. an unpatched worker's own dereferences, replayed verbatim
 *   3. ThreadViewRefresher.safeCopyFrustum — worker boundary, defensive
 *   4. VirtualTilesController.setupView    — which reaches
 *      updateOrientationIfNeeded (reads planes[4]) BEFORE
 *      setupViewPlanes, so both need to tolerate a missing frustum
 */

// Box sitting entirely in negative-X half-space
const negXBox = new THREE.Box3(
  new THREE.Vector3(-10, 0, 0),
  new THREE.Vector3(-1, 5, 5),
);

// Box sitting in positive-X half-space
const posXBox = new THREE.Box3(
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(10, 5, 5),
);

/** Model bounds enclosing both sample boxes, as refreshView would supply. */
const modelBox = new THREE.Box3(
  new THREE.Vector3(-10, 0, 0),
  new THREE.Vector3(10, 5, 5),
);

/** Builds a frustum from a real perspective camera looking down -Z. */
const cameraFrustum = () => {
  const camera = new THREE.PerspectiveCamera(90, 1, 0.1, 100);
  camera.position.set(0, 2.5, 20);
  camera.lookAt(0, 2.5, 0);
  camera.updateProjectionMatrix();
  camera.updateWorldMatrix(true, true);
  const projScreen = new THREE.Matrix4();
  projScreen.multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse,
  );
  return new THREE.Frustum().setFromProjectionMatrix(projScreen);
};

/**
 * Drives the real ThreadViewRefresher through its registered action,
 * returning the view object as the worker-side model receives it.
 */
const refreshViewThroughWorker = (frustum: THREE.Frustum | null) => {
  let received: any;
  const model = { refreshView: (view: any) => (received = view) };
  const thread: any = { actions: {}, list: new Map([["m", model]]) };
  // Constructing registers execute() under REFRESH_VIEW on the stub thread.
  // eslint-disable-next-line no-new
  new ThreadViewRefresher(thread);
  const action = thread.actions[MultiThreadingRequestClass.REFRESH_VIEW];
  const view = {
    cameraFrustum: frustum,
    cameraPosition: new THREE.Vector3(0, 0, 0),
    clippingPlanes: [],
  };
  return action({ modelId: "m", view }).then(() => received);
};

/**
 * Calls the real VirtualTilesController.setupViewPlanes without running
 * the (flatbuffer-heavy) constructor, and returns the planes it collected.
 */
const setupViewPlanes = (view: any) => {
  const controller: any = Object.create(VirtualTilesController.prototype);
  controller._virtualView = view;
  controller.setupViewPlanes();
  return controller._virtualPlanes as THREE.Plane[];
};

/**
 * A VirtualTilesController with just enough state stubbed to run the real
 * setupView() — which also covers updateOrientationIfNeeded, the other
 * place that dereferences cameraFrustum.
 */
const tilesController = () => {
  const controller: any = Object.create(VirtualTilesController.prototype);
  controller._meshConnection = { clean: () => {} };
  controller._lastView = {
    rotation: new THREE.Vector3(),
    location: new THREE.Vector3(),
  };
  controller._params = {
    updateviewOrientation: (8 * Math.PI) / 180,
    updateViewPosition: 256,
  };
  // The real constructor always sets these; updateOutsideMask (hierarchical
  // culling) falls back to all-candidates when lookup is null.
  controller._boxes = { lookup: null };
  controller._outsideMask = new Uint8Array(0);
  return controller;
};

/**
 * Exactly what a worker published before this fix does with an incoming
 * view — all three dereferences unguarded, as in resources/worker.mjs.
 * The worker is a separately pinned artifact, so a new main thread must
 * keep this consumable.
 */
const unpatchedWorkerConsume = (view: any) => {
  // ThreadViewRefresher.safeCopyFrustum, pre-fix
  const copied = MultithreadingHelper.frustum(view.cameraFrustum);
  // VirtualTilesController.getCurrentViewOrientation, pre-fix
  const orientation = view.cameraFrustum.planes[4].normal;
  // VirtualTilesController.setupViewPlanes, pre-fix
  const planes: THREE.Plane[] = [];
  for (const plane of view.cameraFrustum.planes) {
    planes.push(plane);
  }
  return { copied, orientation, planes };
};

/**
 * A model placed by a non-identity matrix. `box` mirrors the real getter
 * (local bounds pushed through matrixWorld), so the world/model
 * distinction is actually observable — under an identity placement the
 * two spaces coincide and a mismatch cannot show up.
 */
const placedHarness = (placement: THREE.Matrix4, localBox: THREE.Box3) => {
  const requests: any[] = [];
  const model: any = {
    modelId: "placed-model",
    graphicsQuality: 1,
    object: { matrixWorld: placement },
    get box() {
      return localBox.clone().applyMatrix4(placement);
    },
    threads: {
      fetch: async (request: any) => {
        requests.push(request);
      },
    },
  };
  const meshes: any = { requests: { clean: () => {} } };
  return { model, meshes, requests };
};

/** Stub main-thread model + mesh manager for driving the real ViewManager. */
const viewManagerHarness = () => {
  const requests: any[] = [];
  const model: any = {
    // Distinctive enough that asserting on it in the warning text cannot
    // pass by accidentally matching a common word like "model".
    modelId: "test-model-7f3a",
    graphicsQuality: 1,
    object: { matrixWorld: new THREE.Matrix4() },
    // The real getter returns a fresh clone each read; refreshView mutates
    // what it gets, so the stub must too.
    get box() {
      return modelBox.clone();
    },
    threads: {
      fetch: async (request: any) => {
        requests.push(request);
      },
    },
  };
  const meshes: any = { requests: { clean: () => {} } };
  return { model, meshes, requests };
};

describe("default frustum culling (issue #255)", () => {
  test("default Frustum planes reject negative-X boxes (demonstrates the bug)", () => {
    // A default THREE.Frustum that was never set from a projection matrix
    // has all six planes at normal=(1,0,0), constant=0.
    const planes = new THREE.Frustum().planes;

    // The default planes incorrectly cull the negative-X box …
    expect(PlanesUtils.collides(negXBox, planes, false)).toBe(false);
    // … while the positive-X box passes.
    expect(PlanesUtils.collides(posXBox, planes, false)).toBe(true);
  });

  test("worker boundary passes a null frustum through without crashing", async () => {
    // #255 itself never threw — it silently culled. The crash appears only
    // once refreshView starts sending null: safeCopyFrustum ran
    // unconditionally and died on null.planes, upstream of every culling
    // guard. This guard is therefore load-bearing for the fix, not for the
    // original bug.
    const view = await refreshViewThroughWorker(null);
    expect(view.cameraFrustum).toBeNull();
  });

  test("worker boundary still rehydrates a real frustum", async () => {
    const view = await refreshViewThroughWorker(cameraFrustum());
    expect(view.cameraFrustum).toBeInstanceOf(THREE.Frustum);
    expect(view.cameraFrustum.planes).toHaveLength(6);
  });

  test("a containing frustum is culled against normally and keeps everything", () => {
    // The worker needs no special case: it culls against this frustum
    // exactly as it would any other, and nothing is discarded.
    const planes = setupViewPlanes({
      cameraFrustum: CameraUtils.containing(modelBox),
      clippingPlanes: [],
    });

    expect(planes).toHaveLength(6);
    expect(PlanesUtils.collides(negXBox, planes, false)).toBe(true);
    expect(PlanesUtils.collides(posXBox, planes, false)).toBe(true);
  });

  test("scales to the model, so millimetre-scale coordinates survive", () => {
    // Fragments does not normalise geometry to metres — the IFC length
    // unit factor is applied to storey-height properties only — so a
    // geo-referenced model authored in millimetres legitimately reaches
    // ~1e10. Any fixed extent would start clipping exactly the models a
    // "big enough" constant is meant to protect. Bounds-derived cannot.
    const origin = new THREE.Vector3(1.2e10, -5.4e9, 3.1e9);
    const mmBox = new THREE.Box3(
      origin.clone(),
      origin.clone().add(new THREE.Vector3(5e4, 3e4, 1e4)),
    );
    const planes = setupViewPlanes({
      cameraFrustum: CameraUtils.containing(mmBox),
      clippingPlanes: [],
    });

    // The whole model survives …
    expect(PlanesUtils.collides(mmBox, planes, false)).toBe(true);
    // … and so does a single sample deep inside it.
    const sample = new THREE.Box3(
      origin.clone().add(new THREE.Vector3(10, 10, 10)),
      origin.clone().add(new THREE.Vector3(20, 20, 20)),
    );
    expect(PlanesUtils.collides(sample, planes, false)).toBe(true);
  });

  test("setupViewPlanes collects no planes when the frustum is null", () => {
    const planes = setupViewPlanes({
      cameraFrustum: null,
      clippingPlanes: [],
    });

    expect(planes).toHaveLength(0);
    // With no planes, nothing is culled — geometry at x < 0 renders.
    expect(PlanesUtils.collides(negXBox, planes, false)).toBe(true);
    expect(PlanesUtils.collides(posXBox, planes, false)).toBe(true);
  });

  test("setupViewPlanes still collects frustum and clipping planes", () => {
    const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const planes = setupViewPlanes({
      cameraFrustum: cameraFrustum(),
      clippingPlanes: [clip],
    });

    // Six frustum planes plus the clipping plane.
    expect(planes).toHaveLength(7);
    // Both boxes sit inside a 90-degree FOV camera aimed at the origin.
    expect(PlanesUtils.collides(negXBox, planes, false)).toBe(true);
    expect(PlanesUtils.collides(posXBox, planes, false)).toBe(true);
  });

  test("setupView tolerates a null frustum end to end", () => {
    // Covers updateOrientationIfNeeded / getCurrentViewOrientation, which
    // dereference cameraFrustum.planes[4] before setupViewPlanes ever runs.
    const controller = tilesController();
    const view = {
      cameraFrustum: null,
      cameraPosition: new THREE.Vector3(0, 0, 0),
      clippingPlanes: [],
      meshThreshold: 1000,
    };

    expect(() => controller.setupView(view)).not.toThrow();
    expect(controller._virtualPlanes).toHaveLength(0);
  });

  test("a null frustum does not disable clipping planes", () => {
    // Clipping is independent of the camera: a half-space clip must still
    // cull even when no camera has been set.
    const clip = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
    const planes = setupViewPlanes({
      cameraFrustum: null,
      clippingPlanes: [clip],
    });

    expect(planes).toHaveLength(1);
    expect(PlanesUtils.collides(negXBox, planes, false)).toBe(false);
    expect(PlanesUtils.collides(posXBox, planes, false)).toBe(true);
  });
});

describe("ViewManager.refreshView frustum transmission (issue #255)", () => {
  // ViewManager reads window for viewport size and GPU capacity estimation.
  const realWindow = (globalThis as any).window;

  beforeAll(() => {
    (globalThis as any).window = {
      innerWidth: 1920,
      innerHeight: 1080,
      screen: { width: 1920, height: 1080 },
      devicePixelRatio: 1,
    };
  });

  afterAll(() => {
    (globalThis as any).window = realWindow;
  });

  // Restore centrally: a failing assertion would skip an inline
  // mockRestore() and leak the console spy into later tests.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("sends a model-containing frustum, not the degenerate default", async () => {
    // Silence the expected warning; this test is about the payload.
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { model, meshes, requests } = viewManagerHarness();

    await new ViewManager().refreshView(model, meshes);

    expect(requests).toHaveLength(1);
    const sent = requests[0].view.cameraFrustum;
    expect(sent).toBeInstanceOf(THREE.Frustum);
    expect(sent.planes).toHaveLength(6);
    // The meaning lives in the frustum itself — no companion flag that a
    // worker would have to know about.
    expect(requests[0].view.cameraApplied).toBeUndefined();
    // And it keeps geometry on both sides of x = 0, unlike the default.
    expect(PlanesUtils.collides(negXBox, sent.planes, false)).toBe(true);
    expect(PlanesUtils.collides(posXBox, sent.planes, false)).toBe(true);
  });

  test("an unpatched worker consumes the camera-less payload and culls nothing", async () => {
    // The pairing the maintainer hit: a main thread updated ahead of a
    // pinned worker. Because the signal is carried in the frustum rather
    // than beside it, the old worker does not merely survive — it gets the
    // fixed behaviour without knowing the fix exists.
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { model, meshes, requests } = viewManagerHarness();

    await new ViewManager().refreshView(model, meshes);

    const consumed = unpatchedWorkerConsume(requests[0].view);
    expect(consumed.copied).toBeInstanceOf(THREE.Frustum);
    expect(consumed.planes).toHaveLength(6);
    expect(PlanesUtils.collides(negXBox, consumed.planes, false)).toBe(true);
    expect(PlanesUtils.collides(posXBox, consumed.planes, false)).toBe(true);
  });

  test("sends a real camera frustum once useCamera is called", async () => {
    const { model, meshes, requests } = viewManagerHarness();
    const manager = new ViewManager();
    const camera = new THREE.PerspectiveCamera(90, 1, 0.1, 100);
    camera.position.set(0, 2.5, 20);
    camera.lookAt(0, 2.5, 0);
    manager.useCamera(camera);

    await manager.refreshView(model, meshes);

    expect(() => unpatchedWorkerConsume(requests[0].view)).not.toThrow();
    // A real projection frustum, not the axis-aligned stand-in: its
    // normals are not all axis-aligned.
    const normals = requests[0].view.cameraFrustum.planes.map(
      (p: THREE.Plane) => p.normal,
    );
    const axisAligned = (n: THREE.Vector3) =>
      [n.x, n.y, n.z].filter((c) => Math.abs(c) > 1e-6).length === 1;
    expect(normals.every(axisAligned)).toBe(false);
  });

  test("builds the frustum in model space, not world space", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    // The worker culls raw model-space boxes: VirtualBoxController.get()
    // reads flatbuffer coordinates directly, and `modelPlacement` on the
    // view is never read by anything. So refreshView must map the world
    // -space `model.box` back through the inverse placement, exactly as
    // the real-camera path maps its world frustum.
    //
    // The placement is 1e7 away — far enough that the margin, which is
    // the model's own size, cannot paper over a space mismatch. This is
    // the geo-referenced case the bounds-derived extent exists for.
    const localBox = new THREE.Box3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(10, 10, 10),
    );
    const placement = new THREE.Matrix4().makeTranslation(1e7, 0, 0);
    const { model, meshes, requests } = placedHarness(placement, localBox);

    await new ViewManager().refreshView(model, meshes);
    const planes = requests[0].view.cameraFrustum.planes;

    // A sample at the model's own coordinates must survive. Built from
    // the untransformed world box the frustum would sit around x = 1e7
    // and discard this entirely.
    const sampleInModelSpace = new THREE.Box3(
      new THREE.Vector3(1, 1, 1),
      new THREE.Vector3(2, 2, 2),
    );
    expect(PlanesUtils.collides(sampleInModelSpace, planes, false)).toBe(true);
  });

  test("warns once, not on every frame", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { model, meshes } = viewManagerHarness();
    const manager = new ViewManager();

    await manager.refreshView(model, meshes);
    await manager.refreshView(model, meshes);
    await manager.refreshView(model, meshes);

    expect(warn).toHaveBeenCalledTimes(1);
    // Names the public API to call, and which model is affected — with
    // several models loaded an anonymous warning is not actionable.
    expect(warn.mock.calls[0][0]).toMatch(/useCamera/);
    expect(warn.mock.calls[0][0]).toContain(model.modelId);
  });

  test("the warning is per instance, so two viewers cannot silence each other", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const a = viewManagerHarness();
    const b = viewManagerHarness();

    await new ViewManager().refreshView(a.model, a.meshes);
    await new ViewManager().refreshView(b.model, b.meshes);

    expect(warn).toHaveBeenCalledTimes(2);
  });

  test("sends a real frustum once useCamera has been called", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { model, meshes, requests } = viewManagerHarness();
    const manager = new ViewManager();

    const camera = new THREE.PerspectiveCamera(90, 1, 0.1, 100);
    camera.position.set(0, 2.5, 20);
    camera.lookAt(0, 2.5, 0);
    manager.useCamera(camera);
    await manager.refreshView(model, meshes);

    const sent = requests[0].cameraFrustum;
    expect(sent).toBeInstanceOf(THREE.Frustum);
    // A genuine frustum, not the degenerate all-(1,0,0) default: it keeps
    // geometry on both sides of x = 0.
    expect(PlanesUtils.collides(negXBox, sent.planes, false)).toBe(true);
    expect(PlanesUtils.collides(posXBox, sent.planes, false)).toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });
});
