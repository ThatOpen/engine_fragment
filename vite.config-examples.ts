/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig } from "vite";
import * as path from "path";
import * as fs from "fs";
import { globSync } from "glob";

const restructureExamples = () => {
  return {
    name: "examples-refactor",
    async writeBundle() {
      const outDir = "examples/packages";
      const files = globSync(`${outDir}/**/example.html`);
      const paths: string[] = [];

      for (const file of files) {
        const directory = path.dirname(file);
        const rootFolder = directory.split(path.sep)[0];

        let targetDirectory: string | undefined;
        let assetsPath: string | undefined;
        let resourcesPath: string | undefined;

        const split = file.split("examples");
        if (split.length === 3 && split[1] && split[2]) {
          const baseName = path.basename(split[1]);
          const dirName = path.dirname(split[2]);
          const dir = path.join(baseName, dirName);
          targetDirectory = path.join(rootFolder, dir);
          assetsPath = "../../assets";
          resourcesPath = "../../../resources";
        }

        if (split.length === 2) {
          const exampleName = path.basename(directory);
          targetDirectory = path.join(rootFolder, exampleName);
          assetsPath = "../assets";
          resourcesPath = "../../resources";
        }

        if (!(targetDirectory && assetsPath && resourcesPath)) continue;

        const urlPath = file
          // .split("examples")[1]
          // .slice(1)
          .slice(9)
          .replace(".html", ".ts")
          .replace(/\\/g, "/");
        paths.push(urlPath);

        if (!fs.existsSync(targetDirectory)) fs.mkdirSync(targetDirectory);

        const buffer = fs.readFileSync(file);
        const newBuffer = buffer
          .toString()
          .replace(/(\.\.\/)+assets/g, assetsPath)
          .replace(/(\.\.\/)+resources/g, resourcesPath);
        fs.writeFileSync(path.join(targetDirectory, "index.html"), newBuffer);
      }

      if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true });
      fs.writeFileSync(
        path.join("examples", "paths.json"),
        JSON.stringify(paths, null, 2),
      );
    },
  };
};

const entries = globSync("packages/**/src/**/example.html").map(
  (file: string) => {
    const directory = path.dirname(file);
    const exampleName = path.basename(directory);
    const fixedName = exampleName[0].toLowerCase() + exampleName.slice(1);
    const entry = [fixedName, path.resolve(file)];
    return entry;
  },
);

const input = Object.fromEntries(entries);

export default defineConfig({
  base: "./",
  esbuild: {
    supported: {
      "top-level-await": true,
    },
  },
  build: {
    outDir: "./examples",
    rollupOptions: {
      input,
      output: {
        entryFileNames: "assets/[name].js",
      },
    },
  },
  plugins: [restructureExamples()],
});
