import { describe, expect, test } from "vitest";
import * as THREE from "three";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Pako from "pako";
import { VirtualFragmentsModel } from "../virtual-model";
import { CurrentLod, TileRequestClass } from "./model-types";
import { CameraUtils } from "../utils/geometry/camera-utils";

/**
 * End-to-end companion to view-manager.test.ts, for
 * https://github.com/ThatOpen/engine_fragment/issues/255
 *
 * The unit tests pin each guard in isolation. This one drives a real .frag
 * through the real VirtualFragmentsModel — real flatbuffer parse, real
 * bounding boxes, real tile generation, real LOD/culling decisions — and
 * asserts on the geometry that actually reaches the renderer.
 *
 * `small_test.frag` straddles the YZ plane (x from -5.18 to 2.28), so a
 * default THREE.Frustum discards the whole negative-X side of it. The
 * camera-less path instead sends a frustum built from the model's own
 * bounds, which is culled against normally but discards nothing.
 *
 * The worker hop itself is covered by the unit tests (ThreadViewRefresher);
 * here the model is driven in-process, which is what the worker does once
 * the message has landed.
 */

const FRAG = fileURLToPath(
  new URL("../../../../../../resources/frags/small_test.frag", import.meta.url),
);

/**
 * A real camera frustum, aimed at the model or away from it. The fixture
 * sits around (-1.45, 0.85, -6.84); a 90-degree FOV at z = 30 with a far
 * plane of 200 contains it comfortably.
 */
const realFrustum = (facing: boolean) => {
  const camera = new THREE.PerspectiveCamera(90, 1, 0.1, 200);
  camera.position.set(-1.45, 0.85, 30);
  camera.lookAt(-1.45, 0.85, facing ? -6.84 : 100);
  camera.updateProjectionMatrix();
  camera.updateWorldMatrix(true, true);
  const projScreen = new THREE.Matrix4();
  projScreen.multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse,
  );
  return new THREE.Frustum().setFromProjectionMatrix(projScreen);
};

/** The view payload ViewManager.newView() builds, with the frustum swapped. */
const viewFor = (cameraFrustum: THREE.Frustum) => ({
  cameraFrustum,
  cameraPosition: new THREE.Vector3(0, 1, 10),
  fov: 60,
  // A tiny orthogonal dimension with a huge viewport makes every sample
  // read as "large on screen", so nothing is dropped for being small and
  // frustum culling is the only thing under test.
  orthogonalDimension: 0.01,
  viewSize: 10000,
  graphicThreshold: Number.MAX_SAFE_INTEGER,
  graphicQuality: 0.5,
  clippingPlanes: [],
  modelPlacement: new THREE.Matrix4(),
  meshThreshold: Number.MAX_SAFE_INTEGER,
});

/**
 * Loads the fixture, applies the view, runs the update loop to completion
 * and reports what geometry the renderer was told to draw.
 */
const CONTAINING = "containing" as const;

const renderModel = async (spec: THREE.Frustum | typeof CONTAINING) => {
  const requests: any[] = [];
  const connection: any = {
    fetch: async () => {},
    fetchMeshCompute: (_modelId: string, list: any[]) => requests.push(...list),
  };

  const inflated = Pako.inflate(readFileSync(FRAG));
  const data = inflated.buffer.slice(
    inflated.byteOffset,
    inflated.byteOffset + inflated.byteLength,
  );
  const model = new VirtualFragmentsModel("m", data, connection, {
    // Flush every queued mesh request immediately instead of on a timer.
    multithreading: { meshConnectionThreshold: 0, meshConnectionRate: 0 },
  });

  try {
    await model.setupData();
    // Mirrors ViewManager.refreshView: with no camera, derive the frustum
    // from the model's own bounds.
    const cameraFrustum =
      spec === CONTAINING ? CameraUtils.containing(model.getFullBBox()) : spec;
    model.refreshView(viewFor(cameraFrustum));

    // Drive the worker's update loop until the controller reports done.
    let done = false;
    for (let i = 0; i < 2000 && !done; i++) {
      done = model.update(performance.now());
    }
    expect(done).toBe(true);
    // Flush anything still queued below the threshold.
    (model.tiles as any)._meshConnection.refresh();

    let indices = 0;
    let negativeXTiles = 0;
    const worldBox = new THREE.Box3();
    for (const request of requests) {
      if (request.tileRequestClass !== TileRequestClass.CREATE) continue;
      if (request.currentLod !== CurrentLod.GEOMETRY) continue;
      indices += request.indices?.length ?? 0;
      // aabb is tile-local; matrix carries the tile origin.
      worldBox.copy(request.aabb).applyMatrix4(request.matrix);
      // A box is frustum-culled by the degenerate default planes exactly
      // when it lies wholly at x < 0, i.e. its max corner is negative.
      if (worldBox.max.x < 0) negativeXTiles++;
    }
    return { indices, negativeXTiles };
  } finally {
    model.dispose();
  }
};

describe("frustum culling against a real .frag (issue #255)", () => {
  test(
    "a containing frustum draws the negative-X half the default discards",
    async () => {
      // The fix: no camera set, so a model-containing frustum goes out.
      const fixed = await renderModel(CONTAINING);
      // The bug: the degenerate default, which is what main sends today.
      const buggy = await renderModel(new THREE.Frustum());

      // The model genuinely has geometry on the negative-X side …
      expect(fixed.negativeXTiles).toBeGreaterThan(0);
      // … which the default frustum silently drops entirely.
      expect(buggy.negativeXTiles).toBe(0);

      // And that loss is visible as indices never handed to the renderer.
      expect(buggy.indices).toBeLessThan(fixed.indices);
      expect(fixed.indices).toBeGreaterThan(0);
    },
    60_000,
  );

  test(
    "a real camera still culls: everything in view, nothing when facing away",
    async () => {
      const noCamera = await renderModel(CONTAINING);
      const facing = await renderModel(realFrustum(true));
      const away = await renderModel(realFrustum(false));

      // Culling is not disabled by this change: aim the camera away and
      // the whole model still disappears.
      expect(away.indices).toBe(0);
      expect(away.negativeXTiles).toBe(0);

      // And it does not over-cull: a camera that contains the model draws
      // exactly what the camera-less path draws, negative-X half included.
      expect(facing.indices).toBe(noCamera.indices);
      expect(facing.negativeXTiles).toBe(noCamera.negativeXTiles);
      expect(facing.indices).toBeGreaterThan(0);
      expect(facing.negativeXTiles).toBeGreaterThan(0);
    },
    60_000,
  );
});
