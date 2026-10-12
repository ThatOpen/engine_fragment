import * as path from "node:path";

/**
 * How the file at `from` imports the module at `to`, the way the sources
 * spell an import: relative to the file, with `/` on every platform and
 * without the `.ts`. Both are absolute paths, so a generated import follows
 * its two ends wherever they are instead of repeating the layout between them.
 */
export function importPath(from: string, to: string) {
  const relative = path
    .relative(path.dirname(from), to)
    .split(path.sep)
    .join("/")
    .replace(/\.ts$/, "");
  return relative.startsWith("../") ? relative : `./${relative}`;
}
