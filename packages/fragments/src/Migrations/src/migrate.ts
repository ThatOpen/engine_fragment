import pako from "pako";
import type { EditRequest } from "../../Utils/edit/edit-types";
import type { SingleThreadedFragmentsModel } from "../../FragmentsModels/src/single-threading";
import { isRawBuffer } from "../../FragmentsModels/src/utils/misc/buffer";
import { gate as packageGate } from "../gate";
import { UnknownRevisionError } from "./errors";
import { Gate, check } from "./gate";
import {
  FileRevision,
  Migration,
  MigrationRegistry,
  MigrationReport,
  MigrationResult,
} from "./types";

/**
 * Tells which revision a fragments file is at and which migrations it is
 * behind on, without changing it. It only looks at the file: the migrations
 * are named by their slug, and none of their code is loaded.
 * @param bytes - The file, raw or deflated.
 * @throws {UnknownRevisionError} When the file is newer than this package.
 */
export function getRevision(
  bytes: Uint8Array,
  { gate = packageGate }: { gate?: Gate } = {},
): FileRevision {
  const raw = isRawBuffer(bytes) ? bytes : pako.inflate(bytes);
  const { known, ...info } = check(raw, gate);
  if (!known) {
    throw new UnknownRevisionError(info.revision, info.latest);
  }
  return info;
}

/**
 * Brings a fragments file to the newest revision this package knows. Files
 * record the revision they are at in their metadata; one that is behind gets
 * every migration since, the file is not touched otherwise.
 *
 * The code that migrates is loaded the first time a file needs it, so
 * calling this on files that are current costs a look at their metadata.
 * It runs where it is called, in Node, a page or a worker; `load()` does the
 * same thing in its own worker. The input is never modified: on failure
 * nothing is returned and the file is as it was.
 *
 * @param bytes - The file, raw or deflated.
 * @param options.raw - Whether to return the file raw or deflated. Defaults
 * to the form of the input.
 * @throws {UnknownRevisionError} When the file is newer than this package.
 * @throws {MigrationError} When a migration fails on the file.
 */
export async function migrate(
  bytes: Uint8Array,
  { raw, registry }: { raw?: boolean; registry?: MigrationRegistry } = {},
): Promise<MigrationResult> {
  const inputIsRaw = isRawBuffer(bytes);
  const source = inputIsRaw ? bytes : pako.inflate(bytes);
  if (!registry) {
    const { known, pending, revision } = check(source, packageGate);
    if (known && pending.length === 0) {
      return { bytes, from: revision, to: revision, applied: [] };
    }
  }

  const { run } = await import("./core");
  const result = await run(source, {
    registry,
    // The editor is only loaded for a migration that asks for an edit.
    apply: async (file, requests) => {
      const { applyRequests } = await import("./apply");
      return applyRequests(file, requests);
    },
  });
  const { from, to, applied } = result;
  if (applied.length === 0) {
    return { bytes, from, to: from, applied };
  }
  const outputIsRaw = raw ?? inputIsRaw;
  const output = outputIsRaw ? result.bytes : pako.deflate(result.bytes);
  return { bytes: output, from, to, applied };
}

/**
 * Applies the edit step of one migration to a model, the way `migrate` does
 * with the ones of this package. For migrations an app writes for its own
 * files: its `edit` can read the model it is about to change, which it has
 * in scope. The requests are left pending on the model, like any edit: save
 * it to get the new file.
 */
export async function applyMigration<Ctx extends object>(
  model: SingleThreadedFragmentsModel,
  migration: Migration<Ctx, any>,
): Promise<{ requests: EditRequest[]; report?: MigrationReport }> {
  if (migration.layout) {
    throw new Error(
      "Fragments: a migration that changes the layout cannot be applied to a model, only to a file through migrate().",
    );
  }
  const ctx = migration.context?.() ?? ({} as Ctx);
  const requests = (await migration.edit?.(ctx)) ?? [];
  if (requests.length > 0) {
    model.edit(requests);
  }
  return { requests, report: migration.report?.(ctx) };
}
