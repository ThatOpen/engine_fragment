/* eslint-disable import/no-extraneous-dependencies */
import dts from "vite-plugin-dts";
import { defineConfig } from "vite";
import * as path from "path";
import * as fs from "fs";
import pluginTerser from "@rollup/plugin-terser";
import * as packageJson from "./package.json";

// const generateTSNamespace = (dts: Map<string, string>) => {
//   if (!fs.existsSync("./dist")) return;
//   console.log("Generating namespace!");
//   let types = "";
//   dts.forEach((declaration) => {
//     const cleanedType = declaration
//       .replace(/export\s+\*?\s+from\s+"[^"]+";/g, "")
//       .replace(/^\s*[\r\n]/gm, "")
//       .replace(/`/g, "'");
//     types += cleanedType;
//   });
//   fs.writeFileSync(
//     "./dist/namespace.d.ts",
//     `declare namespace OBC {\n${types}\n}`,
//   );
// };

export default defineConfig({
  build: {
    outDir: "./dist",
    minify: false,
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, "./src/index.ts"),
    },
    rollupOptions: {
      external: (id) => {
        const peers = Object.keys(packageJson.peerDependencies);
        return peers.some((p) => id === p || id.startsWith(`${p}/`));
      },
      output: [
        {
          entryFileNames: `index.mjs`,
          format: "es",
          sourcemap: true,
          globals: {
            three: "THREE",
          },
        },
        {
          entryFileNames: `index.cjs`,
          format: "cjs",
          sourcemap: true,
          globals: {
            three: "THREE",
          },
        },
        {
          entryFileNames: `index.min.mjs`,
          plugins: [pluginTerser()],
          format: "es",
          globals: {
            three: "THREE",
          },
        },
        {
          entryFileNames: `index.min.cjs`,
          plugins: [pluginTerser()],
          format: "cjs",
          globals: {
            three: "THREE",
          },
        },
      ],
    },
  },
  plugins: [
    dts({
      include: ["./src"],
      rollupTypes: true,
      exclude: ["./src/**/example.ts", "./src/**/*.test.ts"],
      // afterBuild: generateTSNamespace,
    }),
  ],
});
