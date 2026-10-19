/**
 * The worker a test gives to `FragmentsModels` to go through a worker for
 * real, in a file that opts into `happy-dom`:
 *
 *   new FragmentsModels(new URL("<path to>/vitest.worker.ts", import.meta.url).href)
 *
 * It stands in for `fragments-thread.ts` on one point only. The `Worker` of
 * `@vitest/web-worker` (see ./vitest.setup.ts) runs a worker in the test's
 * own context, where `window` exists, so `fragments-thread.ts` takes itself
 * for the main thread and doesn't listen. This listens for it, on the `self`
 * the stub gives each worker.
 *
 * What is posted from then on goes through a `MessagePort`, which copies it
 * as it does between threads: class instances arrive as plain objects.
 */
import { thread } from "./src/FragmentsModels/src/multithreading/fragments-thread";

// eslint-disable-next-line no-restricted-globals
self.onmessage = (input: MessageEvent) => thread.useConnection(input.data);
