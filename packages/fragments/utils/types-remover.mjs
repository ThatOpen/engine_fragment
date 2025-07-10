import { readdir, rm } from "fs/promises";
import { join } from "path";

async function removeTypesFiles() {
  const distPath = "./dist";

  try {
    // Get all files and directories in dist
    const entries = await readdir(distPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(distPath, entry.name);

      // Delete .d.ts files
      if (entry.isFile() && entry.name.endsWith(".d.ts")) {
        await rm(fullPath);
        continue;
      }

      // Delete folders except Worker
      if (entry.isDirectory() && entry.name !== "Worker") {
        await rm(fullPath, { recursive: true });
      }
    }

    console.log(
      "Successfully removed .d.ts files and non-Worker folders from dist",
    );
  } catch (error) {
    console.error("Error cleaning dist folder:", error);
  }
}

removeTypesFiles();
