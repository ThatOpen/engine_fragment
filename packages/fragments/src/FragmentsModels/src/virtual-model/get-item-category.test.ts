import { readFileSync } from "node:fs";
import path from "node:path";
import pako from "pako";
import { describe, expect, test } from "vitest";
import { VirtualFragmentsModel } from "./virtual-fragments-model";
import { ThreadExecutor } from "../multithreading/thread-controllers/thread-executor";
import { MultithreadingHelper } from "../multithreading/multithreading-helper";
import { MultiThreadingRequestClass } from "../model/model-types";

/**
 * Regression test for https://github.com/ThatOpen/engine_fragment/issues/267
 *
 * Item.getCategory() invokes "getItemCategory" on the virtual model through
 * the worker, but the virtual model only had getItemsCategories, so the
 * dispatch (`model[input.function](...input.parameters)` in ThreadExecutor)
 * threw `TypeError: virtualModel[input.function] is not a function`.
 */

const fixture = path.resolve(
  import.meta.dirname,
  "../../../../../..",
  "resources/frags/small_test.frag",
);

function loadModel() {
  const data = pako.inflate(new Uint8Array(readFileSync(fixture)));
  const model = new VirtualFragmentsModel(
    "get-item-category-test",
    data as any,
    undefined as any,
  );
  model.setupData();
  return model;
}

describe("VirtualFragmentsModel.getItemCategory", () => {
  test("returns the same category as getItemsCategories for a known id", () => {
    const model = loadModel();
    const [localId] = model.getLocalIds();
    const [expected] = model.getItemsCategories([localId]);
    // Guard against a vacuous null === null comparison
    expect(typeof expected).toBe("string");
    expect(model.getItemCategory(localId)).toBe(expected);
  });

  test("returns null for an unknown id", () => {
    const model = loadModel();
    const unknown = Math.max(...model.getLocalIds()) + 1000;
    expect(model.getItemCategory(unknown)).toBe(null);
  });

  test("is reachable through the real worker dispatch path", async () => {
    const model = loadModel();
    const [localId] = model.getLocalIds();
    const [expected] = model.getItemsCategories([localId]);

    // The real ThreadExecutor, wired to a stub thread that resolves our
    // in-process model. The request is built by the same helper that
    // FragmentsConnection.invoke() uses, so the dispatch is the exact
    // expression that used to throw.
    const thread = {
      actions: {} as Record<number, (input: any) => Promise<void>>,
      getModel: () => model,
    };
    // eslint-disable-next-line no-new
    new ThreadExecutor(thread as any);

    const input: any = MultithreadingHelper.getExecuteRequest(
      "get-item-category-test",
      "getItemCategory",
      [localId],
    );
    await thread.actions[MultiThreadingRequestClass.EXECUTE](input);
    expect(input.result).toBe(expected);
  });
});
