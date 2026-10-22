/* eslint-disable import/no-extraneous-dependencies */
// The WEBGPU RESOLUTION tier: the same library modules, but with `three`
// resolved to three.webgpu, as an app that aliases `three` to `three/webgpu`
// does. In seconds and with no browser, it catches JS-level breakage of that
// build: exports that do not exist there (UniformsUtils / UniformsLib), node
// materials that do not construct, guards that depend on the detection.
//
// What it CANNOT see: shader compilation (NodeBuilder) and pixels.
//
// The tests carry the .wgputest.ts suffix on purpose: the normal run's glob
// (*.test.ts) does not pick them up, because under classic three the WebGPU
// paths are inactive and their asserts would be false reds.
//
// Run: npx vitest --run --config vitest.config-webgpu.ts
import { defineConfig } from "vitest/config";
import * as path from "path";

// The hoisted three of the workspace root.
const webgpu = path.resolve(
  __dirname,
  "../../node_modules/three/build/three.webgpu.js",
);

export default defineConfig({
  resolve: {
    alias: [
      { find: /^three$/, replacement: webgpu },
      { find: /^three\/webgpu$/, replacement: webgpu },
    ],
  },
  test: {
    include: ["src/**/*.wgputest.ts"],
    environment: "node",
    testTimeout: 30000,
  },
});
