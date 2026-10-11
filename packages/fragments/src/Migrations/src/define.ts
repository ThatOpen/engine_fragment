import type { LayoutHandler } from "./layout/copier";
import type { Migration } from "./types";

export { drop } from "./drop";

/**
 * Declares a migration. It only types it: `ctx` is inferred from `context`,
 * and a migration that changes the layout names the handlers its `types.ts`
 * lists, so a missing one does not compile.
 *
 * ```ts
 * export default defineMigration<Ctx, Handlers<Ctx>>({ ... });
 * ```
 */
export function defineMigration<
  Ctx extends object = {},
  Handlers extends object = Record<string, LayoutHandler<Ctx>>,
>(migration: Migration<Ctx, Handlers>) {
  return migration;
}
