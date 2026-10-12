/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig } from "vite";
import * as path from "path";
import pluginTerser from "@rollup/plugin-terser";

// The code that migrates files an older version wrote, as one file next to
// the worker (#316). The worker imports it from a URL, for a file that is
// behind only, and it is often a blob: what a blob imports has to be an
// absolute URL that brings everything it needs. So this is a build of its
// own, with nothing external and nothing shared with the worker.
export default defineConfig({
  build: {
    outDir: "./dist/Worker",
    // The worker is already there.
    emptyOutDir: false,
    minify: false,
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, "./src/Migrations/src/core.ts"),
    },
    rollupOptions: {
      output: [
        {
          entryFileNames: `migrations.mjs`,
          format: "es",
        },
        {
          entryFileNames: `migrations.min.mjs`,
          plugins: [pluginTerser()],
          format: "es",
        },
      ],
    },
  },
});
