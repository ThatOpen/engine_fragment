import { describe, expect, test } from "vitest";
import { MeshManager } from "./mesh-manager";
import { FragmentsModel } from "./fragments-model";
import { TileRequestClass } from "./model-types";
import { MultithreadingHelper } from "../multithreading/multithreading-helper";

function model(uid: number, modelId: string) {
  return {
    _uid: uid,
    modelId,
    _finishProcessing() {},
  } as unknown as FragmentsModel;
}

describe("update fences when models are removed", () => {
  test("an empty manager does not await a FINISH for previous requests", async () => {
    const meshes = new MeshManager(() => {});
    MultithreadingHelper.nextSeq();
    await meshes.forceUpdateFinish();
  }, 500);

  test.each(["delete", "clear"] as const)(
    "%s releases all pending fences when no model remains",
    async (operation) => {
      const meshes = new MeshManager(() => {});
      meshes.list.set("a", model(1, "a"));
      MultithreadingHelper.nextSeq();
      const first = meshes.forceUpdateFinish();
      MultithreadingHelper.nextSeq();
      const second = meshes.forceUpdateFinish();
      if (operation === "delete") meshes.list.delete("a");
      else meshes.list.clear();
      await Promise.all([first, second]);
    },
    500,
  );

  test("removing one of two models still waits for the remaining model's FINISH", async () => {
    const meshes = new MeshManager(() => {});
    const a = model(1, "a");
    meshes._add(a);
    meshes._add(model(2, "b"));
    const seq = MultithreadingHelper.nextSeq();
    let finished = false;
    const pending = meshes.forceUpdateFinish().then(() => {
      finished = true;
    });
    meshes._remove(a);
    await Promise.resolve();
    expect(finished).toBe(false);
    meshes.requests.add([
      { uid: 2, tileRequestClass: TileRequestClass.FINISH, seq },
    ]);
    await pending;
    expect(finished).toBe(true);
  });

  test("a model loaded after an empty scene still requires its own FINISH", async () => {
    const meshes = new MeshManager(() => {});
    MultithreadingHelper.nextSeq();
    await meshes.forceUpdateFinish();
    meshes._add(model(3, "new"));
    const seq = MultithreadingHelper.nextSeq();
    let finished = false;
    const pending = meshes.forceUpdateFinish().then(() => {
      finished = true;
    });
    await Promise.resolve();
    expect(finished).toBe(false);
    meshes.requests.add([
      { uid: 3, tileRequestClass: TileRequestClass.FINISH, seq },
    ]);
    await pending;
    expect(finished).toBe(true);
  }, 500);

  test("the FINISH of a model that is gone still settles fences", async () => {
    const meshes = new MeshManager(() => {});
    meshes._add(model(1, "a"));
    const seq = MultithreadingHelper.nextSeq();
    let finished = false;
    const pending = meshes.forceUpdateFinish().then(() => {
      finished = true;
    });
    await Promise.resolve();
    expect(finished).toBe(false);
    // Model 2 was disposed, but its worker got through the fenced requests.
    meshes._dropRequests([
      { uid: 2, tileRequestClass: TileRequestClass.FINISH, seq },
    ]);
    await pending;
    expect(finished).toBe(true);
  }, 500);
});
