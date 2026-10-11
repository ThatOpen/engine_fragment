import { probeUnstamped, readMetadata } from "./stamp";
import type { PendingMigration, UnstampedProbe } from "./types";

// The part of the migrations that every load pays for: telling whether a
// file is behind. It knows the steps by name and what they ask of an older
// file, and none of what they do, so the worker can hold it while the
// layouts, the copier and the migrations themselves are only loaded for a
// file that needs them.

/** A step as the gate knows it. */
export interface GateStep {
  /** UTC `YYYYMMDDHHmmss`. */
  id: string;
  slug: string;
  /** Whether the step has anything to do on a file that predates it. */
  work?: boolean;
  /** Whether such a file cannot be read until the step ran. */
  rewrite?: boolean;
  /** Whether a file with no revision predates the step (its `probe.ts`). */
  matchesUnstamped?: (probe: UnstampedProbe) => boolean;
}

export interface Gate {
  steps: GateStep[];
  /** The revision of a file that has none and that no step claims. */
  unstamped: string;
}

/**
 * The revision of a raw file and where its step is among the given ones.
 * A file that carries no revision is asked about by the steps up to the one
 * the stamp was introduced with, oldest first: the first that claims it puts
 * it just before itself, and one that none claims is past all of them.
 * `index` is -1 for a revision that is not one of the steps.
 */
export function locate(
  bytes: Uint8Array,
  { steps, unstamped }: Gate,
): { revision: string; stamped: boolean; index: number; latest: string } {
  const latest = steps[steps.length - 1].id;
  const stamp = readMetadata(bytes)?.revision;
  const stamped = typeof stamp === "string";
  let revision: string = stamped ? stamp : unstamped;
  if (!stamped) {
    const probe = probeUnstamped(bytes);
    for (let i = 1; i < steps.length; i++) {
      if (steps[i - 1].id === unstamped) {
        break;
      }
      if (steps[i].matchesUnstamped?.(probe)) {
        revision = steps[i - 1].id;
        break;
      }
    }
  }
  const index = steps.findIndex((step) => step.id === revision);
  return { revision, stamped, index, latest };
}

export interface GateVerdict {
  /** The revision of the file. */
  revision: string;
  /** Whether the file carries it, or it was worked out. */
  stamped: boolean;
  /** The newest revision the gate knows. */
  latest: string;
  /** Whether the revision is one the gate knows. A newer file's is not. */
  known: boolean;
  /** The steps the file is behind on that have something to do, by slug. */
  pending: PendingMigration[];
  /** Whether the file can be read as it is. */
  readable: boolean;
}

/** Whether a raw file is behind, as far as it can be told without migrating. */
export function check(bytes: Uint8Array, gate: Gate): GateVerdict {
  const { revision, stamped, index, latest } = locate(bytes, gate);
  const pending: PendingMigration[] = [];
  if (index !== -1) {
    for (const step of gate.steps.slice(index + 1)) {
      if (step.work) {
        const rewrite = step.rewrite === true;
        pending.push({ id: step.id, title: step.slug, rewrite });
      }
    }
  }
  return {
    revision,
    stamped,
    latest,
    known: index !== -1,
    pending,
    readable: index !== -1 && !pending.some((step) => step.rewrite),
  };
}
