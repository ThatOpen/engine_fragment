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

/**
 * URL of the migration code that ships with the package, which the worker
 * imports for a file an older version wrote (see `Migrations/src/sources.ts`).
 * It is here, and written this way, for the reasons above. Where
 * `import.meta.url` is not a URL, as in a bundle of a format that has none,
 * there is nothing to resolve against.
 */
export function getBundledMigrationsUrl() {
  try {
    return new URL("./Worker/migrations.mjs", import.meta.url).href;
  } catch {
    return undefined;
  }
}
