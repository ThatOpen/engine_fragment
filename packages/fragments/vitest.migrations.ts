/* eslint-disable import/no-extraneous-dependencies */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Builds the migration code the way the package ships it: the single file
 * the worker imports from a URL (`dist/Worker/migrations.mjs`, see
 * `vite.config-migrations.ts`). Tests that go through the worker's side of a
 * load give it this file, so that they run what an app runs: code bundled
 * apart from the worker, with its own copy of every class.
 *
 * @returns The `file:` URLs of the build, and what removes it.
 */
export async function buildMigrations() {
  const outDir = await mkdtemp(path.join(tmpdir(), "fragments-migrations-"));
  await build({
    configFile: path.join(here, "vite.config-migrations.ts"),
    logLevel: "silent",
    build: { outDir, emptyOutDir: true },
  });
  const urlOf = (file: string) => pathToFileURL(path.join(outDir, file)).href;
  return {
    url: urlOf("migrations.mjs"),
    minified: urlOf("migrations.min.mjs"),
    remove: () => rm(outDir, { recursive: true, force: true }),
  };
}
