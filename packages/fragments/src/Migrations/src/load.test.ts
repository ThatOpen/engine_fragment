import { readFile } from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import pako from "pako";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { buildMigrations } from "../../../vitest.migrations";
import { gate } from "../gate";
import { LATEST_REVISION } from "../revision";
import { applyRequests } from "./apply";
import { loadMigrations } from "./load";
import { migrate } from "./migrate";

// Issue #316: the worker imports the migration code from a URL. What it
// imports is one file that has to run wherever it lands, a worker, a page
// or Node, so it may import nothing and use nothing of any of them.

const fixtures = path.resolve(
  import.meta.dirname,
  "../list/20251023113211_remove-alignments-and-geometries/fixtures",
);

// Converted with @thatopen/fragments@3.1.7.
const stale = async (name: string) =>
  pako.inflate(
    new Uint8Array(await readFile(path.join(fixtures, `${name}.3.1.7.frag`))),
  );

let built: Awaited<ReturnType<typeof buildMigrations>>;

beforeAll(async () => {
  built = await buildMigrations();
}, 60000);

afterAll(() => built?.remove());

describe("the migration code as the file the worker imports (issue #316)", () => {
  test.each([
    ["migrations.mjs", () => built.url],
    ["migrations.min.mjs", () => built.minified],
  ])(
    "%s brings everything it needs and names no environment",
    async (_, url) => {
      const code = await readFile(fileURLToPath(url()), "utf8");
      // A blob worker can only import an absolute URL, and whatever that file
      // imports would be looked for next to it, or not be found at all.
      expect(code).not.toMatch(/(^|[;\n])\s*import\s*[\w{*"']/);
      expect(code).not.toMatch(/\bimport\(|\brequire\(/);
      const globals =
        /\b(window|document|navigator|self|process|Buffer|__dirname)\b/;
      expect(code.match(globals)).toBeNull();
    },
  );

  test.each([
    ["migrations.mjs", () => built.url],
    ["migrations.min.mjs", () => built.minified],
  ])(
    "%s migrates a file exactly as migrate() does",
    async (_, url) => {
      const code = await loadMigrations([url()], LATEST_REVISION);
      expect(code.revision).toBe(gate.steps[gate.steps.length - 1].id);

      // One file is only copied, the other also needs the editor of the caller.
      for (const name of ["just_wall", "alignment"]) {
        const file = await stale(name);
        const expected = await migrate(file);
        const result = await code.run(file, { apply: applyRequests });
        expect(result.applied).toEqual(expected.applied);
        expect(result).toMatchObject({ from: expected.from, to: expected.to });
        expect(Buffer.from(result.bytes).equals(expected.bytes)).toBe(true);
      }
    },
    30000,
  );

  test("a URL that does not answer is passed over for the next one", async () => {
    const missing = new URL("./nowhere.mjs", built.url).href;
    const code = await loadMigrations([missing, built.url], LATEST_REVISION);
    expect(typeof code.run).toBe("function");
  });

  test("a file from another version of the package is not taken", async () => {
    const other = loadMigrations([built.url], "20990101000000");
    await expect(other).rejects.toThrow(
      `${built.url} is from another version of the package (it migrates to ${LATEST_REVISION}, the worker to 20990101000000)`,
    );
  });

  test("when none loads, the error says why for each", async () => {
    const missing = new URL("./nowhere.mjs", built.url).href;
    const error = await loadMigrations([missing, "not a url"], "1").catch(
      (e) => e,
    );
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain(`${missing}: `);
    expect(error.message).toContain("not a url: ");
    await expect(loadMigrations([], "1")).rejects.toThrow();
  });
});
