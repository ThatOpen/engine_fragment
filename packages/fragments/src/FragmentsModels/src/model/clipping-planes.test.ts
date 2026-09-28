import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import * as THREE from "three";
import { FragmentsModels } from "../../index";
import { FragmentsModel } from "./fragments-model";

// Issue #302: clipping planes were only reachable through the callback
// `model.getClippingPlanesEvent = () => planes`. They are now a load option,
// symmetric with `camera`, and the callback keeps working (deprecated).

const realWindow = (globalThis as any).window;

beforeAll(() => {
  // ViewManager reads window for the viewport size.
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

afterEach(() => {
  vi.restoreAllMocks();
});

// Loads through the real FragmentsModels.load with only the worker round
// trip stubbed out, and records every REFRESH_VIEW the model dispatches.
const loadWith = async (options: Record<string, unknown>) => {
  const views: any[] = [];
  const threads = {
    activeThreadCount: 1,
    fetch: async (request: any) => {
      if (request.view) views.push(request.view);
    },
    invoke: async () => {},
    delete: async () => {},
  };
  vi.spyOn(FragmentsModel.prototype, "_setup").mockImplementation(
    async function (this: any) {
      this.threads = threads;
    },
  );
  const fragments = new FragmentsModels("worker.mjs");
  fragments.settings.autoCoordinate = false;
  const model = await fragments.load(new ArrayBuffer(8), {
    modelId: "clip",
    raw: true,
    ...options,
  } as any);
  const refresh = () => model._refreshView(true);
  return { fragments, model, views, refresh };
};

describe("clipping planes (issue #302)", () => {
  test("the clippingPlanes load option reaches the view, and in-place edits are picked up", async () => {
    const planes = [new THREE.Plane(new THREE.Vector3(0, 0, 1), -2)];
    const { fragments, model, views, refresh } = await loadWith({
      clippingPlanes: planes,
    });
    expect(model.clippingPlanes).toBe(planes);

    await refresh();
    expect(views.at(-1).clippingPlanes).toHaveLength(1);
    expect(views.at(-1).clippingPlanes[0].constant).toBe(-2);

    // Mutating the array the caller handed over is seen by the next refresh.
    planes[0].constant = -5;
    planes.push(new THREE.Plane(new THREE.Vector3(1, 0, 0), 1));
    await refresh();
    expect(views.at(-1).clippingPlanes).toHaveLength(2);
    expect(views.at(-1).clippingPlanes[0].constant).toBe(-5);
    await fragments.dispose();
  });

  test("useClippingPlanes() replaces the planes after load", async () => {
    const { fragments, model, views, refresh } = await loadWith({});
    await refresh();
    expect(views.at(-1).clippingPlanes).toHaveLength(0);

    const planes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 3)];
    model.useClippingPlanes(planes);
    expect(model.clippingPlanes).toBe(planes);
    await refresh();
    expect(views.at(-1).clippingPlanes[0].constant).toBe(3);
    await fragments.dispose();
  });

  test("the deprecated getClippingPlanesEvent callback still drives the view", async () => {
    const { fragments, model, views, refresh } = await loadWith({});
    const planes = [new THREE.Plane(new THREE.Vector3(0, 0, 1), 7)];
    model.getClippingPlanesEvent = () => planes;
    await refresh();
    expect(views.at(-1).clippingPlanes[0].constant).toBe(7);
    expect(model.clippingPlanes).toEqual(planes);
    await fragments.dispose();
  });
});
