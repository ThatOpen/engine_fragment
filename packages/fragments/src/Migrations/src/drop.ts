/** What the handler of a removed field returns: the field is gone on purpose. */
export const drop: unique symbol = Symbol("fragments.migration.drop");
export type Drop = typeof drop;
