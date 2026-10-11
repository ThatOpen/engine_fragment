import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import { describe, expect, test } from "vitest";

// Issue #316: an app whose files are current should not carry the code that
// migrates older ones. The worker holds the gate and nothing else, and the
// main thread reaches the rest through a dynamic import. These bundle from
// source, so they guard the module graph the way entry-purity.test.ts does.

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

describe("what a load carries of the migrations (issue #316)", () => {
  test("the worker holds the gate and none of the migration code", async () => {
    const entry = "FragmentsModels/src/multithreading/fragments-thread.ts";
    const result = await bundle({ entryPoints: [path.join(src, entry)] });
    const [output] = Object.values(result.metafile.outputs) as any[];
    const inputs = Object.keys(output.inputs);
    expect(inputs.some((file) => GATE.test(file))).toBe(true);
    expect(lazyIn(inputs)).toEqual([]);
  }, 60000);

  test("a viewer reaches the migration code only through a dynamic import", async () => {
    const result = await bundle({
      stdin: {
        contents: `import { FragmentsModels } from "./index";\nexport const f = new FragmentsModels("worker.mjs");`,
        resolveDir: src,
        loader: "ts",
      },
      splitting: true,
      outdir: "out",
    });
    const outputs = result.metafile.outputs as Record<string, any>;
    const [entry] = Object.keys(outputs).filter(
      (file) => outputs[file].entryPoint !== undefined,
    );

    // Everything the entry needs to start: itself and what it imports
    // statically, and what those import statically.
    const eager = new Set<string>();
    const visit = (file: string) => {
      if (eager.has(file)) return;
      eager.add(file);
      for (const imported of outputs[file].imports) {
        if (imported.kind === "import-statement" && outputs[imported.path]) {
          visit(imported.path);
        }
      }
    };
    visit(entry);

    const inputsOf = (files: Iterable<string>) =>
      [...files].flatMap((file) => Object.keys(outputs[file].inputs));
    expect(lazyIn(inputsOf(eager))).toEqual([]);

    // And it is there to be loaded, in chunks the entry does not start with.
    const rest = Object.keys(outputs).filter((file) => !eager.has(file));
    const lazy = lazyIn(inputsOf(rest));
    expect(lazy.some((file) => /src\/core\.ts$/.test(file))).toBe(true);
    expect(lazy.some((file) => /layout\/copier\.ts$/.test(file))).toBe(true);
    const dynamic = [...eager].flatMap((file) =>
      outputs[file].imports.filter((i: any) => i.kind === "dynamic-import"),
    );
    expect(dynamic.length).toBeGreaterThan(0);

    // The reader of files does not come along, eagerly or not. An edit step
    // works from its ctx, and what it asks for is applied by the worker,
    // which has the reader: on the main thread a migration is a copy.
    const all = inputsOf(Object.keys(outputs));
    const reader = /virtual-fragments-model|single-threading/;
    expect(all.filter((file) => reader.test(file))).toEqual([]);
  }, 60000);
});
