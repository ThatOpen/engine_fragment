/* eslint-disable max-classes-per-file */
import type { PendingMigration } from "./types";

/**
 * Thrown when a file needs a migration that changes its layout and migrating
 * was turned off. Without it the file cannot be read.
 */
export class StaleFragmentsError extends Error {
  /** The revision of the file. */
  readonly revision: string;
  readonly pending: PendingMigration[];

  constructor(revision: string, pending: PendingMigration[]) {
    super(
      `Fragments: the file is at revision ${revision} and its layout has changed since. Migrate it to load it.`,
    );
    this.name = "StaleFragmentsError";
    this.revision = revision;
    this.pending = pending;
  }
}

/**
 * Thrown when a file was written by a newer version of this package than the
 * one reading it, or carries a revision this package does not know.
 */
export class UnknownRevisionError extends Error {
  readonly revision: string;
  /** The newest revision this package knows. */
  readonly latest: string;

  constructor(revision: string, latest: string) {
    const newer = revision > latest;
    super(
      newer
        ? `Fragments: the file is at revision ${revision}, newer than this version of the package (${latest}). Update the package to read it.`
        : `Fragments: the file is at revision ${revision}, which this version of the package does not know.`,
    );
    this.name = "UnknownRevisionError";
    this.revision = revision;
    this.latest = latest;
  }
}

/** Thrown when a migration fails on a file. The file is left as it was. */
export class MigrationError extends Error {
  /** The id of the migration that failed. */
  readonly migration: string;
  /** Its title. */
  readonly title: string;

  constructor(migration: string, title: string, cause: unknown) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Fragments: migration ${migration} (${title}) failed. ${reason}`);
    this.name = "MigrationError";
    this.migration = migration;
    this.title = title;
    this.cause = cause;
  }
}

/**
 * Thrown when a file cannot be read without migrating it and the code that
 * migrates could not be loaded. The worker of `load()` imports that code
 * from a URL, for a file that is behind only, and none of the ones it tried
 * answered with it.
 */
export class MigrationsUnavailableError extends Error {
  /** The revision of the file. */
  readonly revision: string;
  /** The URLs that were tried, in order. */
  readonly sources: string[];

  constructor(revision: string, sources: string[], reason?: string) {
    const why =
      sources.length > 0
        ? `the code that migrates could not be loaded (${reason || sources.join(", ")})`
        : "there is no URL to load the code that migrates from";
    super(
      `Fragments: the file is at revision ${revision} and cannot be read without migrating it, but ${why}. Serve dist/Worker/migrations.mjs of this version of the package and give its URL as the migrationsURL option of FragmentsModels.`,
    );
    this.name = "MigrationsUnavailableError";
    this.revision = revision;
    this.sources = sources;
  }
}

/**
 * Thrown when a migration changes the layout and leaves a decision open: a
 * field was removed, is new and required, or changed type, and the migration
 * has no handler for it.
 */
export class MigrationObligationError extends Error {
  /** The field, as `Type.field`. */
  readonly field: string;

  constructor(field: string, why: string) {
    super(
      `Fragments: "${field}" ${why}, and the migration has no handler for it.`,
    );
    this.name = "MigrationObligationError";
    this.field = field;
  }
}
