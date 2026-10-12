import { getBundledMigrationsUrl } from "../../bundled-worker-url";
import { getWorkerMigrationsUrl } from "../../Utils/worker-migrations";

// The worker imports the migration code from a URL (see `load.ts`) and does
// no looking of its own: the main thread says which URL, and this is where
// it works that out. So a load that has nowhere to get the code from fails
// here, before anything is sent to the worker.

/** The URL as the worker has to get it: it cannot resolve a relative one. */
function absolute(url: string) {
  try {
    const base = globalThis.document?.baseURI ?? globalThis.location?.href;
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

/**
 * The URL the worker is to import the migration code from:
 *
 * - the one the app gave;
 * - otherwise the one that goes with a worker this package located itself,
 *   which is the bundled one when no worker URL was given, and the one on
 *   unpkg for a worker from `getWorker()`.
 *
 * A worker the app serves itself has none, and the app has to give it.
 *
 * @returns The URL, or `undefined` when there is none.
 */
export function resolveMigrationsUrl({
  workerURL,
  migrationsURL,
}: {
  workerURL?: string;
  migrationsURL?: string;
}) {
  if (migrationsURL !== undefined) {
    return absolute(migrationsURL);
  }
  if (workerURL === undefined) {
    return getBundledMigrationsUrl();
  }
  return getWorkerMigrationsUrl(workerURL);
}
