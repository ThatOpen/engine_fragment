import type { EditRequest } from "../../Utils/edit/edit-types";
import type { LayoutHandler } from "./layout/copier";
import type { SchemaDescriptor } from "./layout/descriptor";

/**
 * A table of a file being migrated, read with the layout the file was written
 * with. Every field is a property, named as the schema names it. The types of
 * a migration (`types.ts` next to it) describe the ones that changed.
 */
export interface View {
  /** The root table of the file. */
  readonly root: View;
}

/** A struct of a file being migrated. Every field is a property. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StructView {}

/** A vector of strings, structs or tables of a file being migrated. */
export interface Vector<T> extends Iterable<T> {
  readonly length: number;
  at(index: number): T | undefined;
}

/**
 * What a handler may return for a table, a struct, or a vector of them: an
 * object with the fields of the new layout, or a node of the old file to move
 * there.
 */
export type Writable = View | StructView | { [field: string]: unknown };

/** What the app is told about one migrated file. It crosses to the main thread, so it has to be cloneable. */
export type MigrationReport = Record<string, unknown>;

/**
 * What the `probe.ts` of a step can ask about a file that carries no
 * revision, to tell whether the file predates the step. Only the steps older
 * than the revision stamp need one.
 */
export interface UnstampedProbe {
  /** The metadata of the file, or `null` when it has none that parses. */
  readonly metadata: Record<string, any> | null;
  /** How many fields the root table of the file has room for. */
  readonly rootSlots: number;
  /** Whether the root table holds a value in a slot. */
  has(slot: number): boolean;
  /**
   * Whether the value in a slot of the root table is a vector of strings.
   * `null` when the slot is empty or holds an empty vector, which cannot be
   * told apart from one of anything else.
   */
  isStringVector(slot: number): boolean | null;
}

/**
 * One change to fragments files, applied to every file that predates it.
 *
 * - `layout` gives the value of single fields while the file is copied. The
 *   copier carries everything it can by name; the handlers decide the rest.
 *   A schema change needs it for the fields it leaves open, and it is also
 *   the cheap way to change the content of a field: one pass over the bytes.
 * - `edit` changes the content of a file that is already in the current
 *   layout, with the same requests the editor takes. It is for changes that
 *   need the editor's bookkeeping, like creating items, and it costs a full
 *   edit of the file.
 *
 * Both receive the `ctx` of the migration, one per file, so `layout` can keep
 * what it removes for `edit` to put back in another form.
 *
 * Every layout step of a file runs before any edit step, so a layout handler
 * cannot count on an older migration's `edit` having run.
 */
export interface Migration<
  Ctx extends object = {},
  Handlers extends object = Record<string, LayoutHandler<Ctx>>,
> {
  title: string;
  /** The state of this migration for one file. Called once per file. */
  context?: () => Ctx;
  /**
   * Handlers by `Type.field`: one per field the copier cannot carry on its
   * own, and any other whose value has to change.
   */
  layout?: Handlers;
  /**
   * Edit requests that bring the content of the file up to date, worked out
   * from what `layout` left in `ctx`. It is not given the file: a handler
   * can read any field of it while it is copied, which costs nothing, where
   * a model to read from would cost building one.
   */
  edit?: (ctx: Ctx) => EditRequest[] | Promise<EditRequest[]>;
  /** What to tell the app about this file, once the migration ran. */
  report?: (ctx: Ctx) => MigrationReport;
}

/** A directory of `Migrations/list`: a migration, a new layout, or both. */
export interface MigrationStep {
  /** UTC `YYYYMMDDHHmmss`. Orders the steps and is what files are stamped with. */
  id: string;
  slug: string;
  /** The layout from this step on, when the step changed the schema. */
  schema?: SchemaDescriptor;
  /** The schema change cannot be read without rewriting the file. */
  rewrite?: boolean;
  migration?: Migration<any, any>;
  /**
   * Whether a file with no revision predates this step: the `probe.ts` of
   * its directory. Only the steps up to the one the stamp was introduced
   * with are asked, oldest first; a file none of them claims is taken to be
   * past all of them.
   */
  matchesUnstamped?: (probe: UnstampedProbe) => boolean;
}

export interface MigrationRegistry {
  steps: MigrationStep[];
  /** The revision of a file that has none and that no migration claims. */
  unstamped: string;
}

export interface PendingMigration {
  id: string;
  title: string;
  /** Whether the file cannot be read until this one ran. */
  rewrite: boolean;
}

export interface FileRevision {
  /** The revision of the file. */
  revision: string;
  /** Whether the file carries it, or it was worked out. */
  stamped: boolean;
  /** The newest revision this package knows. */
  latest: string;
  /** What `migrate` would run, oldest first. */
  pending: PendingMigration[];
  /** Whether this package can read the file as it is. */
  readable: boolean;
}

export interface AppliedMigration {
  id: string;
  title: string;
  report?: MigrationReport;
}

export interface MigrationResult {
  /** The migrated file, or the input itself when nothing had to change. */
  bytes: Uint8Array;
  /** The revision of the input. */
  from: string;
  /** The revision of `bytes`. */
  to: string;
  /** The migrations that changed the file, oldest first. */
  applied: AppliedMigration[];
}
