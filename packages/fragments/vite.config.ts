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
    lib: {
      entry: path.resolve(__dirname, "./src/index.ts"),
    },
    rollupOptions: {
      external: Object.keys(packageJson.peerDependencies),
      // TODO: Only build minified version until repo is reorganized and public
      output: [
        // {
        //   entryFileNames: `index.mjs`,
        //   format: "es",
        //   globals: {
        //     three: "THREE",
        //   },
        // },
        // {
        //   entryFileNames: `index.cjs`,
        //   format: "cjs",
        //   globals: {
        //     three: "THREE",
        //   },
        // },
        {
          entryFileNames: `index.mjs`,
          plugins: [pluginTerser()],
          format: "es",
          globals: {
            three: "THREE",
          },
        },
        {
          entryFileNames: `index.cjs`,
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
