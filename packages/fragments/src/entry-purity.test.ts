import { describe, expect, test } from "vitest";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import * as path from "node:path";

// Issue #298: an app that only displays models must be able to import the
// package without evaluating the worker (which installs a global onmessage)
// and without bundling web-ifc, which only the IFC importer and the geometry
// engine need.

const here = path.dirname(fileURLToPath(import.meta.url));

describe("package entry purity (issue #298)", () => {
  test("importing the entry installs no global message handler", async () => {
    expect((globalThis as any).onmessage).toBeUndefined();
    await import("./index");
    expect((globalThis as any).onmessage).toBeUndefined();
  }, 60000);

  // Bundles from source, so it guards the module graph: nothing a viewer
  // uses may need web-ifc or the worker. Consumers only see the same result
  // because dist/index.mjs keeps one file per module; from a single-file
  // dist, esbuild keeps the file's web-ifc import regardless.
  test("a viewer-only consumer bundle contains neither web-ifc nor the worker", async () => {
    const require = createRequire(import.meta.url);
    const esbuild = require("esbuild");
    const result = await esbuild.build({
      stdin: {
        contents: `import { FragmentsModels } from "./index";\nexport const f = new FragmentsModels("worker.mjs");`,
        resolveDir: here,
        loader: "ts",
      },
      bundle: true,
      write: false,
      metafile: true,
      format: "esm",
      external: ["three", "three/*"],
      define: { __FRAGMENTS_VERSION__: '"test"' },
      logLevel: "silent",
    });
    // `metafile.inputs` lists every file esbuild scanned; what ends up in the
    // bundle is the output's own input list.
    const [bundle] = Object.values(result.metafile.outputs) as any[];
    const inputs = Object.keys(bundle.inputs);
    const output = result.outputFiles[0].text;
    expect(inputs.filter((file) => /web-ifc/.test(file))).toEqual([]);
    expect(inputs.filter((file) => /fragments-thread/.test(file))).toEqual([]);
    expect(output).not.toMatch(/globalThis\.onmessage/);
  }, 60000);
});
