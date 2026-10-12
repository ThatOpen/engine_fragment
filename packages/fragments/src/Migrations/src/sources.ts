import { getBundledMigrationsUrl } from "../../bundled-worker-url";
import { getWorkerSource } from "../../Utils/worker-source";

// The worker imports the migration code from a URL (see `load.ts`). This is
// the other end: where the main thread works out which URLs to send it.

/** The URL as the worker has to get it: it cannot resolve a relative one. */
function absolute(
  url: string,
  base = globalThis.document?.baseURI ?? globalThis.location?.href,
) {
  try {
    return new URL(url, base).href;
  } catch {
    return undefined;
  }
}

/** The migration code next to a worker, when the worker has an address. */
function nextTo(workerURL: string) {
  const worker = absolute(getWorkerSource(workerURL));
  if (!worker || /^(blob|data):/i.test(worker)) {
    return undefined;
  }
  const minified = /\.min\.[^/.]+$/.test(new URL(worker).pathname);
  const name = minified ? "./migrations.min.mjs" : "./migrations.mjs";
  return absolute(name, worker);
}

/**
 * The URLs the worker tries for the migration code, in order:
 *
 * - the one the app gave, and nothing else;
 * - otherwise `migrations.mjs` next to the worker, which is where the
 *   package and unpkg have it, and then the one the package bundles, for a
 *   worker that a bundler moved or that is a blob of unknown origin.
 *
 * A worker URL that was left out is the bundled one, so only the second
 * applies.
 */
export function getMigrationSources({
  workerURL,
  migrationsURL,
}: {
  workerURL?: string;
  migrationsURL?: string;
}) {
  if (migrationsURL !== undefined) {
    return [absolute(migrationsURL) ?? migrationsURL];
  }
  const sources = new Set<string>();
  const beside = workerURL === undefined ? undefined : nextTo(workerURL);
  if (beside) {
    sources.add(beside);
  }
  const bundled = getBundledMigrationsUrl();
  if (bundled) {
    sources.add(bundled);
  }
  return [...sources];
}
