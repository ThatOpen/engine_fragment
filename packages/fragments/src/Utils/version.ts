declare const __FRAGMENTS_VERSION__: string;

/**
 * The name of this package, used to identify it as the generator of the
 * models it creates.
 */
export const FRAGMENTS_GENERATOR = "@thatopen/fragments";

/**
 * The version of this package. It's injected at build time from package.json
 * (see the `define` option in vite.config.ts), so it's always in sync with
 * the published version. When the code runs unbundled and the define is not
 * applied (e.g. tsx scripts), it falls back to "unknown".
 */
export const FRAGMENTS_VERSION =
  typeof __FRAGMENTS_VERSION__ !== "undefined"
    ? __FRAGMENTS_VERSION__
    : "unknown";

/**
 * Provenance data stamped into the metadata of every model this library
 * creates, so any fragments file records which package and version generated
 * it (see ThatOpen/engine_fragment#273).
 */
export function getProvenanceMetadata() {
  return {
    generator: FRAGMENTS_GENERATOR,
    version: FRAGMENTS_VERSION,
  };
}
