import pako from "pako";
import { EditRequest, EditRequestType } from "../../Utils/edit/edit-types";
import { SingleThreadedFragmentsModel } from "../../FragmentsModels/src/single-threading";
import { isRawBuffer } from "../../FragmentsModels/src/utils/misc/buffer";
import { registry as packageRegistry } from "../registry";
import { MigrationError, UnknownRevisionError } from "./errors";
import { Copier, LayoutHandlers } from "./layout/copier";
import { SchemaDescriptor } from "./layout/descriptor";
import { probeUnstamped, readMetadata, stampMetadata } from "./stamp";
import {
  AppliedMigration,
  FileRevision,
  Migration,
  MigrationRegistry,
  MigrationReport,
  MigrationResult,
  MigrationStep,
  PendingMigration,
} from "./types";

const METADATA = "metadata";

function titleOf(step: MigrationStep) {
  return step.migration?.title ?? step.slug;
}

/** Whether a file that predates the step cannot be read before the step ran. */
function rewrites(step: MigrationStep) {
  return step.rewrite === true || step.migration?.layout !== undefined;
}

/** The layout of a file that is at the step of this index. */
function schemaAt(steps: MigrationStep[], index: number): SchemaDescriptor {
  for (let i = index; i >= 0; i--) {
    const { schema } = steps[i];
    if (schema) {
      return schema;
    }
  }
  throw new Error("Fragments: the oldest migration step has no schema.");
}

/** The revision of a raw file that carries none. */
function unstampedRevision(bytes: Uint8Array, registry: MigrationRegistry) {
  const { steps, unstamped } = registry;
  const probe = probeUnstamped(bytes);
  for (let i = 1; i < steps.length; i++) {
    if (steps[i - 1].id === unstamped) {
      break;
    }
    if (steps[i].migration?.matchesUnstamped?.(probe)) {
      return steps[i - 1].id;
    }
  }
  return unstamped;
}

function inspect(bytes: Uint8Array, registry: MigrationRegistry) {
  const { steps } = registry;
  const latest = steps[steps.length - 1].id;
  const stamp = readMetadata(bytes)?.revision;
  const stamped = typeof stamp === "string";
  const revision = stamped ? stamp : unstampedRevision(bytes, registry);
  const index = steps.findIndex((step) => step.id === revision);
  if (index === -1) {
    throw new UnknownRevisionError(revision, latest);
  }
  const pending: PendingMigration[] = [];
  for (const step of steps.slice(index + 1)) {
    if (rewrites(step) || step.migration?.edit) {
      pending.push({
        id: step.id,
        title: titleOf(step),
        rewrite: rewrites(step),
      });
    }
  }
  const readable = !pending.some((step) => step.rewrite);
  const info: FileRevision = { revision, stamped, latest, pending, readable };
  return { info, index };
}

/**
 * Tells which revision a fragments file is at and what {@link migrate} would
 * run on it, without changing it.
 * @param bytes - The file, raw or deflated.
 * @throws {UnknownRevisionError}
 */
export function getRevision(
  bytes: Uint8Array,
  { registry = packageRegistry }: { registry?: MigrationRegistry } = {},
): FileRevision {
  const raw = isRawBuffer(bytes) ? bytes : pako.inflate(bytes);
  return inspect(raw, registry).info;
}

/** The handlers of a layout step, plus the one that stamps the revision. */
function stamping(
  handlers: LayoutHandlers | undefined,
  root: string,
  revision: string,
): LayoutHandlers {
  const key = `${root}.${METADATA}`;
  const own = handlers?.[key];
  return {
    ...handlers,
    [key]: (node, ctx) =>
      stampMetadata(own ? own(node, ctx) : node[METADATA], revision),
  };
}

/** The requests of an edit step, with the revision set in the metadata. */
function stamped(
  requests: EditRequest[],
  model: SingleThreadedFragmentsModel,
  revision: string,
) {
  const result = [...requests];
  let index = -1;
  for (let i = 0; i < result.length; i++) {
    if (result[i].type === EditRequestType.UPDATE_METADATA) {
      index = i;
    }
  }
  // The request replaces the metadata, so the last one decides it.
  const last = result[index];
  const data =
    last && last.type === EditRequestType.UPDATE_METADATA
      ? last.data
      : model.getMetadata();
  const request: EditRequest = {
    type: EditRequestType.UPDATE_METADATA,
    localId: 0,
    data: JSON.parse(stampMetadata(data, revision)),
  };
  if (index === -1) {
    result.push(request);
  } else {
    result[index] = request;
  }
  return result;
}

/**
 * Brings a fragments file to the newest revision this package knows. Files
 * record the revision they are at in their metadata; one that is behind gets
 * every migration since, the file is not touched otherwise.
 *
 * Layout steps run first, then edit steps, each in order. The input is never
 * modified: on failure nothing is returned and the file is as it was.
 *
 * @param bytes - The file, raw or deflated.
 * @param options.raw - Whether to return the file raw or deflated. Defaults
 * to the form of the input.
 * @throws {UnknownRevisionError} When the file is newer than this package.
 * @throws {MigrationError} When a migration fails on the file.
 */
export async function migrate(
  bytes: Uint8Array,
  {
    raw,
    registry = packageRegistry,
  }: { raw?: boolean; registry?: MigrationRegistry } = {},
): Promise<MigrationResult> {
  const inputIsRaw = isRawBuffer(bytes);
  const source = inputIsRaw ? bytes : pako.inflate(bytes);
  const { info, index } = inspect(source, registry);
  const from = info.revision;
  if (info.pending.length === 0) {
    return { bytes, from, to: from, applied: [] };
  }

  const { steps } = registry;
  const to = info.latest;
  const pending = steps.slice(index + 1);
  const contexts = new Map<MigrationStep, object>();
  const changed = new Set<MigrationStep>();
  const contextOf = (step: MigrationStep) => {
    let ctx = contexts.get(step);
    if (!ctx) {
      ctx = step.migration?.context?.() ?? {};
      contexts.set(step, ctx as object);
    }
    return ctx as object;
  };

  let current = source;
  let schema = schemaAt(steps, index);

  // Layout steps need nothing but the descriptors, so they are what makes a
  // file readable by the rest of the package. They all run first.
  for (const step of pending) {
    const target = step.schema ?? schema;
    if (rewrites(step)) {
      try {
        current = new Copier({
          bytes: current,
          from: schema,
          to: target,
          handlers: stamping(step.migration?.layout, target.root, to),
          ctx: contextOf(step),
        }).run();
      } catch (error) {
        throw new MigrationError(step.id, titleOf(step), error);
      }
      changed.add(step);
    }
    schema = target;
  }

  for (const step of pending) {
    const edit = step.migration?.edit;
    if (!edit) continue;
    try {
      const model = new SingleThreadedFragmentsModel(step.id, current, true);
      try {
        const requests = await edit(model, contextOf(step));
        if (requests.length > 0) {
          model.edit(stamped(requests, model, to));
          current = model.save(true);
          changed.add(step);
        }
      } finally {
        model.dispose();
      }
    } catch (error) {
      throw new MigrationError(step.id, titleOf(step), error);
    }
  }

  if (changed.size === 0) {
    return { bytes, from, to: from, applied: [] };
  }

  const applied: AppliedMigration[] = [];
  for (const step of pending) {
    if (!changed.has(step)) continue;
    const entry: AppliedMigration = { id: step.id, title: titleOf(step) };
    const report = step.migration?.report?.(contextOf(step));
    if (report) {
      entry.report = report;
    }
    applied.push(entry);
  }

  const outputIsRaw = raw ?? inputIsRaw;
  const output = outputIsRaw ? current : pako.deflate(current);
  return { bytes: output, from, to, applied };
}

/**
 * Applies the edit step of one migration to a model, the way `migrate` does
 * with the ones of this package. For migrations an app writes for its own
 * files. The requests are left pending on the model, like any edit: save it
 * to get the new file.
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
  const requests = (await migration.edit?.(model, ctx)) ?? [];
  if (requests.length > 0) {
    model.edit(requests);
  }
  return { requests, report: migration.report?.(ctx) };
}
