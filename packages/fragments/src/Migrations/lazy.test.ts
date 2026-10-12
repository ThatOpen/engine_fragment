import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import { describe, expect, test } from "vitest";

// Issue #316: an app whose files are current should not carry the code that
// migrates older ones. The worker holds the gate and nothing else, and
// imports the rest from a URL, as one file that brings what it needs. On
// the main thread only an app that calls migrate() has it, behind a dynamic
// import. These bundle from source, so they guard the module graph the way
// entry-purity.test.ts does.

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, "..");

// What only a file that is behind needs.
const LAZY = [
  /Migrations\/registry\.ts$/,
  /Migrations\/src\/core\.ts$/,
  /Migrations\/src\/layout\//,
  /Migrations\/list\/.*\/migration\.ts$/,
  /Migrations\/list\/.*\/schema\.json$/,
];
const GATE = /Migrations\/gate\.ts$/;

const bundle = async (options: Record<string, unknown>) => {
  const require = createRequire(import.meta.url);
  const esbuild = require("esbuild");
  return esbuild.build({
    bundle: true,
    write: false,
    metafile: true,
    format: "esm",
    external: ["three", "three/*"],
    define: { __FRAGMENTS_VERSION__: '"test"' },
    logLevel: "silent",
    ...options,
  });
};

const lazyIn = (inputs: string[]) =>
  inputs.filter((file) => LAZY.some((pattern) => pattern.test(file)));

/**
 * Bundles an app the way esbuild splits one, and tells which chunks it needs
 * to start (its entry and what that imports statically, all the way down)
 * and which it can ever load (those, and what any of them imports
 * dynamically).
 */
const split = async (contents: string) => {
  const result = await bundle({
    stdin: { contents, resolveDir: src, loader: "ts" },
    splitting: true,
    outdir: "out",
  });
  const outputs = result.metafile.outputs as Record<string, any>;
  const [entry] = Object.keys(outputs).filter(
    (file) => outputs[file].entryPoint !== undefined,
  );
  const reach = (kinds: string[]) => {
    const seen = new Set<string>();
    const visit = (file: string) => {
      if (seen.has(file)) return;
      seen.add(file);
      for (const imported of outputs[file].imports) {
        if (kinds.includes(imported.kind) && outputs[imported.path]) {
          visit(imported.path);
        }
      }
    };
    visit(entry);
    return seen;
  };
  const inputsOf = (files: Iterable<string>) =>
    [...files].flatMap((file) => Object.keys(outputs[file].inputs));
  return {
    outputs,
    inputsOf,
    eager: reach(["import-statement"]),
    reachable: reach(["import-statement", "dynamic-import"]),
  };
};

describe("what a load carries of the migrations (issue #316)", () => {
  test("the worker holds the gate and none of the migration code", async () => {
    const entry = "FragmentsModels/src/multithreading/fragments-thread.ts";
    const result = await bundle({ entryPoints: [path.join(src, entry)] });
    const [output] = Object.values(result.metafile.outputs) as any[];
    const inputs = Object.keys(output.inputs);
    expect(inputs.some((file) => GATE.test(file))).toBe(true);
    expect(lazyIn(inputs)).toEqual([]);
  }, 60000);

  test("the file the worker imports is the migrations, without the reader or the editor", async () => {
    const entry = "Migrations/src/core.ts";
    const result = await bundle({ entryPoints: [path.join(src, entry)] });
    const [output] = Object.values(result.metafile.outputs) as any[];
    const inputs = Object.keys(output.inputs);
    expect(lazyIn(inputs).length).toBeGreaterThan(LAZY.length);
    // The worker has both already and lends the editor (see `run`): bundled
    // here they would be downloaded a second time.
    const heavy =
      /virtual-fragments-model|single-threading|Utils\/edit\/edit-function|node_modules\/(pako|three)\//;
    expect(inputs.filter((file) => heavy.test(file))).toEqual([]);
    // Nothing is left for whoever imports it to resolve.
    expect(output.imports).toEqual([]);
  }, 60000);

  test("a viewer never loads any of it, since the worker is what migrates", async () => {
    const { reachable, inputsOf } = await split(
      `import { FragmentsModels } from "./index";\nexport const f = new FragmentsModels("worker.mjs");`,
    );
    // esbuild writes a chunk for every dynamic import it comes across, used
    // or not, so what counts is what the viewer has a way to.
    expect(lazyIn(inputsOf(reachable))).toEqual([]);
  }, 60000);

  test("an app that calls migrate() reaches it only through a dynamic import", async () => {
    const { eager, reachable, inputsOf } = await split(
      `import { migrate } from "./index";\nexport const m = migrate;`,
    );
    expect(lazyIn(inputsOf(eager))).toEqual([]);

    // And it is there to be loaded, in chunks the entry does not start with.
    const rest = [...reachable].filter((file) => !eager.has(file));
    const lazy = lazyIn(inputsOf(rest));
    expect(lazy.some((file) => /src\/core\.ts$/.test(file))).toBe(true);
    expect(lazy.some((file) => /layout\/copier\.ts$/.test(file))).toBe(true);
  }, 60000);
});
