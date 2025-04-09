import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get paths relative to this script
const rootDir = path.resolve(__dirname, "..");
const sourceReadme = path.join(rootDir, "README.md");
const targetReadme = path.join(rootDir, "packages", "fragments", "README.md");

// Copy the README file
try {
  fs.copyFileSync(sourceReadme, targetReadme);
  console.log("README.md successfully copied to packages/fragments/");
} catch (err) {
  console.error("Error copying README.md:", err);
  process.exit(1);
}
