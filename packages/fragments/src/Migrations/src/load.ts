import type { run } from "./core";

/** The migration code (`core.ts`), whichever way it was loaded. */
export interface MigrationCode {
  /** The revision it migrates files to. */
  revision: string;
  run: typeof run;
}

/**
 * Loads the migration code from a URL, for whoever cannot reach it with an
 * import of its own. That is the worker: it is one file, and it often runs
 * from a blob URL, where a path relative to it leads nowhere. So the main
 * thread tells it where the code is, and the worker imports it from there,
 * for a file that is behind only.
 *
 * It is a plain `import()` of a file that imports nothing itself, which
 * works the same in a worker, a page and Node (with a `file:` URL).
 *
 * @param url - The absolute URL of `dist/Worker/migrations.mjs`.
 * @param revision - The revision the caller's gate migrates to. A file
 * built from another version of the package is not taken.
 * @throws When the import fails, or gives the code of another version.
 */
export async function loadMigrations(
  url: string,
  revision: string,
): Promise<MigrationCode> {
  const code: MigrationCode = await import(
    /* @vite-ignore */ /* webpackIgnore: true */ url
  );
  if (code.revision !== revision || typeof code.run !== "function") {
    throw new Error(
      `It is from another version of the package: it migrates to ${code.revision}, the worker to ${revision}.`,
    );
  }
  return code;
}
