/**
 * Fetches a worker script and returns a blob URL with the ES module
 * `export` stripped, so it can be used as a classic (non-module) worker.
 * Use this when running in environments that don't support module workers
 * (e.g. sandboxed iframes without `allow-same-origin`).
 *
 * @param workerURL - URL of the ES module worker script.
 * @returns A blob URL usable with `new FragmentsModels(url, { classicWorker: true })`.
 */
export async function toClassicWorker(workerURL: string): Promise<string> {
  const res = await fetch(workerURL);
  const src = await res.text();
  const classic = src.replace(/export\s*\{[^}]*\}\s*;?\s*/, "");
  const blob = new Blob([classic], { type: "text/javascript" });
  return URL.createObjectURL(blob);
}
