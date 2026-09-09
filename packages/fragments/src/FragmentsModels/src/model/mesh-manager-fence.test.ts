import { describe, expect, test } from "vitest";
import { MeshManager } from "./mesh-manager";
import { FragmentsModel } from "./fragments-model";
import { TileRequestClass } from "./model-types";
import { MultithreadingHelper } from "../multithreading/multithreading-helper";

function model() {
  return { _finishProcessing() {} } as FragmentsModel;
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
      meshes.list.set("a", model());
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
    meshes.list.set("a", model());
    meshes.list.set("b", model());
    const seq = MultithreadingHelper.nextSeq();
    let finished = false;
    const pending = meshes.forceUpdateFinish().then(() => {
      finished = true;
    });
    meshes.list.delete("a");
    await Promise.resolve();
    expect(finished).toBe(false);
    meshes.requests.add([
      { modelId: "b", tileRequestClass: TileRequestClass.FINISH, seq },
    ]);
    await pending;
    expect(finished).toBe(true);
  });

  test("a model loaded after an empty scene still requires its own FINISH", async () => {
    const meshes = new MeshManager(() => {});
    MultithreadingHelper.nextSeq();
    await meshes.forceUpdateFinish();
    meshes.list.set("new", model());
    const seq = MultithreadingHelper.nextSeq();
    let finished = false;
    const pending = meshes.forceUpdateFinish().then(() => {
      finished = true;
    });
    await Promise.resolve();
    expect(finished).toBe(false);
    meshes.requests.add([
      { modelId: "new", tileRequestClass: TileRequestClass.FINISH, seq },
    ]);
    await pending;
    expect(finished).toBe(true);
  }, 500);
});
