/**
 * URL of the worker that ships with the package, used when no worker URL is
 * given to `FragmentsModels`.
 *
 * This lives at the root of `src` on purpose. The ES build keeps one file per
 * module (so bundlers can drop what an app does not use, #298), and a module
 * at the root lands next to `dist/index.mjs`, where `./Worker/worker.mjs`
 * resolves to `dist/Worker/worker.mjs` just as it does in the single-file
 * builds. Keep the `new URL("...", import.meta.url)` literal: bundlers only
 * recognise and emit the worker asset in that exact form.
 */
export function getBundledWorkerUrl() {
  return new URL("./Worker/worker.mjs", import.meta.url).href;
}
