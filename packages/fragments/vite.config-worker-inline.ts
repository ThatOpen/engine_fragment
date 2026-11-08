import { defineConfig } from "vite";
import * as path from "path";
import pluginTerser from "@rollup/plugin-terser";

/**
 * Builds the worker that `dist/inline.mjs` embeds (see
 * `scripts/generate-inline-worker.mjs`).
 *
 * The inline worker is embedded as a base64 blob, so it is loaded from a blob
 * URL and cannot resolve relative chunk imports. It must therefore be ONE
 * self-contained file (`inlineDynamicImports`), unlike the regular
 * `dist/Worker/*` build (`vite.config-worker.ts`), which stays code-split.
 */
export default defineConfig({
  build: {
    outDir: "./dist/Worker-inline",
    minify: false,
    sourcemap: true,
    lib: {
      formats: ["es"],
      entry: path.resolve(
        __dirname,
        "./src/FragmentsModels/src/multithreading/fragments-thread.ts",
      ),
    },
    rollupOptions: {
      output: {
        entryFileNames: `inline-worker.mjs`,
        plugins: [pluginTerser()],
        format: "es",
        inlineDynamicImports: true,
      },
    },
  },
});
