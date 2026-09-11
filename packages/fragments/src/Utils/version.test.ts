import { readFile } from "fs/promises";
import * as path from "path";
import { expect, test } from "vitest";
import { newModel } from "./edit/new-model-function";
import { IfcImporter } from "../Importers";
import { SingleThreadedFragmentsModel } from "../FragmentsModels";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");

const webIfcDir = path.dirname(import.meta.resolve("web-ifc"));

// The values are hardcoded on purpose (instead of importing them from
// ./version) so these tests fail if the stamped values ever change by
// accident.
const expectProvenance = async (metadata: Record<string, any> | null) => {
  expect(metadata).not.toBeNull();
  expect(metadata!.generator).toBe("@thatopen/fragments");
  const pkg = JSON.parse(
    await readFile(
      path.join(repoRoot, "packages", "fragments", "package.json"),
      "utf-8",
    ),
  );
  expect(metadata!.version).toBe(pkg.version);
  expect(metadata!.version).toMatch(/^\d+\.\d+\.\d+/);
};

test(
  "IfcImporter stamps generator and version into the model metadata",
  { timeout: 30000 },
  async () => {
    const importer = new IfcImporter();
    importer.wasm = { path: webIfcDir + path.sep, absolute: true };
    const fragBytes = await importer.process({
      bytes: await readFile(
        path.join(repoRoot, "resources", "ifc", "just_wall.ifc"),
      ),
      raw: true,
    });
    const model = new SingleThreadedFragmentsModel(
      "just_wall",
      fragBytes as Uint8Array,
    );
    const metadata = model.getMetadata();
    await expectProvenance(metadata);
    // The pre-existing metadata keys must still be there.
    expect(metadata.schema).toContain("IFC");
    expect(metadata).toHaveProperty("names");
    expect(metadata).toHaveProperty("descriptions");
    model.dispose();
  },
);

test("newModel stamps generator and version into the model metadata", async () => {
  const fragBytes = newModel({ raw: true });
  const model = new SingleThreadedFragmentsModel("blank", fragBytes);
  const metadata = model.getMetadata();
  await expectProvenance(metadata);
  model.dispose();
});

test("frag files created before the provenance stamp still load fine", async () => {
  const fragBytes = await readFile(
    path.join(repoRoot, "resources", "frags", "small_test.frag"),
  );
  const model = new SingleThreadedFragmentsModel(
    "small_test",
    new Uint8Array(fragBytes),
  );
  const metadata = model.getMetadata();
  expect(metadata).not.toHaveProperty("generator");
  expect(metadata).not.toHaveProperty("version");
  // The reader must be unaffected by the missing keys.
  expect(model.getLocalIds().length).toBeGreaterThan(0);
  expect(model.getCategories().length).toBeGreaterThan(0);
  model.dispose();
});
