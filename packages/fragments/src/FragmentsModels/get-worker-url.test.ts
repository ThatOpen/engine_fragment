import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { FragmentsModels } from "./index";

afterEach(() => {
  vi.unstubAllGlobals();
});

// unpkg serves paths case-insensitively, so a wrong-case URL works there and
// 404s on any CDN that does not (jsDelivr does). The package's own exports
// map is the source of truth for where the worker lives.
test("getWorker asks for the worker at the path the package exports", async () => {
  const requested: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    requested.push(url);
    return { ok: true, blob: async () => new Blob(["// worker"]) };
  });

  await FragmentsModels.getWorker();

  const pkg = JSON.parse(
    readFileSync(resolve(__dirname, "../../package.json"), "utf8"),
  );
  const exported = (pkg.exports["./worker"].import as string).replace(
    /^\./,
    "",
  );
  expect(requested).toHaveLength(1);
  expect(requested[0].endsWith(exported)).toBe(true);
});
