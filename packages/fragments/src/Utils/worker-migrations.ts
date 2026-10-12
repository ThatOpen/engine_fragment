// Kept apart from `worker-utils.ts`, which is public, and from the module
// that resolves URLs against the package, which the worker has no use for.

/** The URL of the migration code of a worker, by the URL of the worker. */
const known = new Map<string, string>();

/**
 * Records where the migration code of a worker is. Only for a worker this
 * package located itself, like the one `getWorker()` fetches: it knows what
 * is next to that one. Where the files of a worker the app serves are is
 * for the app to say.
 */
export function setWorkerMigrationsUrl(
  workerURL: string,
  migrationsURL: string,
) {
  known.set(workerURL, migrationsURL);
}

/** The migration code that goes with a worker, when this package knows. */
export function getWorkerMigrationsUrl(workerURL: string) {
  return known.get(workerURL);
}
