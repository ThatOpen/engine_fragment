import { EditRequest, EditRequestType } from "../../Utils/edit/edit-types";
import { registry as packageRegistry } from "../registry";
import { LATEST_REVISION } from "../revision";
import { MigrationError, UnknownRevisionError } from "./errors";
import { locate } from "./gate";
import { Copier, LayoutHandlers } from "./layout/copier";
import { SchemaDescriptor } from "./layout/descriptor";
import { readMetadata, stampMetadata } from "./stamp";
import {
  AppliedMigration,
  FileRevision,
  MigrationRegistry,
  MigrationResult,
  MigrationStep,
  PendingMigration,
} from "./types";

// What only a file that is behind needs: the layouts, the copier and the
// migrations. Nothing imports this module statically, so that an app whose
// files are current does not carry it. Once the gate says a file is behind,
// `migrate()` reaches it through a dynamic import, and the worker of
// `load()` imports the single file built from it, `dist/Worker/migrations.mjs`,
// from a URL (see `load.ts`).
//
// It has to run wherever it is loaded: Node, a page, a worker. So it uses
// nothing of any of them, imports nothing that is not bundled into that
// file, and takes the editor from its caller instead of importing it.

/**
 * The revision this code migrates files to. Whoever loads it from a URL
 * compares it to its own gate: a file served from another version of the
 * package would leave files behind, or know steps the gate does not.
 */
export const revision = LATEST_REVISION;

const METADATA = "metadata";

function titleOf(step: MigrationStep) {
  return step.migration?.title ?? step.slug;
}

/** Whether the step is done by copying the file, with or without handlers. */
function copies(step: MigrationStep) {
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

/**
 * Which revision a raw file is at and what migrating it would run, with the
 * titles of the migrations. The gate gives the same answer by slug.
 * @throws {UnknownRevisionError}
 */
export function inspect(
  bytes: Uint8Array,
  registry: MigrationRegistry = packageRegistry,
) {
  const { steps } = registry;
  const { revision, stamped, index, latest } = locate(bytes, registry);
  if (index === -1) {
    throw new UnknownRevisionError(revision, latest);
  }
  const pending: PendingMigration[] = [];
  for (const step of steps.slice(index + 1)) {
    if (copies(step) || step.migration?.edit) {
      pending.push({
        id: step.id,
        title: titleOf(step),
        // Handlers on a schema that did not break only change content: the
        // file reads fine without them.
        rewrite: step.rewrite === true,
      });
    }
  }
  const readable = !pending.some((step) => step.rewrite);
  const info: FileRevision = { revision, stamped, latest, pending, readable };
  return { info, index };
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

/** The requests of the edit steps, with the revision set in the metadata. */
function stamped(
  requests: EditRequest[],
  metadata: Record<string, any> | null,
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
      : metadata;
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

export interface Prepared {
  /**
   * The file after its layout steps, raw. The input itself if it had none.
   * While there are `requests` this is a file in flight, not one to keep:
   * it already names the revision it is on its way to.
   */
  bytes: Uint8Array;
  /**
   * What the edit steps ask for, still to be applied to `bytes` (see
   * `applyRequests`). The file is at `to` once they are.
   */
  requests: EditRequest[];
  /** The revision of the input. */
  from: string;
  /** The revision of `bytes` once `requests` are applied. */
  to: string;
  /** The migrations that change the file, oldest first. */
  applied: AppliedMigration[];
}

/**
 * Runs the migrations a raw file is behind on, as far as it goes without the
 * editor: the layout steps, each a copy of the file, and then the edit steps,
 * which only say what to edit. Applying that takes the editor, which is not
 * part of this code (see `run`).
 *
 * Layout steps all run before edit steps, each in order. The input is never
 * modified.
 *
 * @throws {UnknownRevisionError} When the file is newer than this package.
 * @throws {MigrationError} When a migration fails on the file.
 */
export async function prepare(
  bytes: Uint8Array,
  registry: MigrationRegistry = packageRegistry,
): Promise<Prepared> {
  const { info, index } = inspect(bytes, registry);
  const from = info.revision;
  const untouched: Prepared = {
    bytes,
    requests: [],
    from,
    to: from,
    applied: [],
  };
  if (info.pending.length === 0) {
    return untouched;
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

  let current = bytes;
  let schema = schemaAt(steps, index);

  // Copies need nothing but the descriptors, so they are what makes a file
  // readable by the rest of the package. They all run first.
  for (const step of pending) {
    const target = step.schema ?? schema;
    if (copies(step)) {
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

  // An edit step works from its ctx and reads nothing of the file, so what
  // the steps ask for adds up to one list, applied in one edit.
  let requests: EditRequest[] = [];
  for (const step of pending) {
    const edit = step.migration?.edit;
    if (!edit) continue;
    try {
      const asked = await edit(contextOf(step));
      if (asked.length > 0) {
        requests.push(...asked);
        changed.add(step);
      }
    } catch (error) {
      throw new MigrationError(step.id, titleOf(step), error);
    }
  }

  if (changed.size === 0) {
    return untouched;
  }
  if (requests.length > 0) {
    requests = stamped(requests, readMetadata(current), to);
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
  return { bytes: current, requests, from, to, applied };
}

/** Applies edit requests to a raw file and gives the new one (`apply.ts`). */
export type ApplyRequests = (
  bytes: Uint8Array,
  requests: EditRequest[],
) => Uint8Array | Promise<Uint8Array>;

/**
 * Brings a raw file to the newest revision: `prepare`, and then what the
 * edit steps asked for, applied with the editor the caller hands over. The
 * worker has the editor already and `migrate()` loads it when it is needed,
 * so it is not bundled here a second time.
 *
 * This is the whole of a migration and the same call everywhere it runs.
 * The input is never modified; when nothing had to change it is returned.
 *
 * @throws {UnknownRevisionError} When the file is newer than this package.
 * @throws {MigrationError} When a migration fails on the file.
 */
export async function run(
  bytes: Uint8Array,
  { apply, registry }: { apply: ApplyRequests; registry?: MigrationRegistry },
): Promise<MigrationResult> {
  const prepared = await prepare(bytes, registry);
  const { requests, from, to, applied } = prepared;
  const migrated =
    requests.length > 0
      ? await apply(prepared.bytes, requests)
      : prepared.bytes;
  return { bytes: migrated, from, to, applied };
}
