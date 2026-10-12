import {
  getWorkerMigrationsUrl,
  setWorkerMigrationsUrl,
} from "./worker-migrations";

/**
 * Fetches a worker script and returns a blob URL with the ES module `export` stripped, so it can be used as a classic (non-module) worker.
 * @param workerURL - URL of the ES module worker script.
 * @returns A blob URL usable with `new FragmentsModels(url, { classicWorker: true })`.
 */
export async function toClassicWorker(workerURL: string): Promise<string> {
  const res = await fetch(workerURL);
  const src = await res.text();
  const classic = src.replace(/export\s*\{[^}]*\}\s*;?\s*/, "");
  const blob = new Blob([classic], { type: "text/javascript" });
  const classicURL = URL.createObjectURL(blob);
  // A worker from `getWorker()` keeps the migration code it came with.
  const migrationsURL = getWorkerMigrationsUrl(workerURL);
  if (migrationsURL !== undefined) {
    setWorkerMigrationsUrl(classicURL, migrationsURL);
  }
  return classicURL;
}
