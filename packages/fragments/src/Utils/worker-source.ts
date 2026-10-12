// Kept apart from `worker-utils.ts`, which is public, and from the modules
// that resolve URLs against the package, which the worker has no use for.

/** The blob URLs this package made of a worker, by where it fetched it. */
const fetched = new Map<string, string>();

/**
 * Records where a worker that became a blob URL was fetched from, since the
 * blob URL no longer tells. One made from another keeps the first address.
 */
export function setWorkerSource(blobURL: string, url: string) {
  fetched.set(blobURL, fetched.get(url) ?? url);
}

/** Where a worker was fetched from: its own URL, unless it is such a blob. */
export function getWorkerSource(workerURL: string) {
  return fetched.get(workerURL) ?? workerURL;
}
