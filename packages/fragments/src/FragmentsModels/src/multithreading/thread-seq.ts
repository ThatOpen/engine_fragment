/**
 * Highest `seq` this worker has seen on any incoming RPC, shared between the
 * worker's {@link FragmentsThread} (which writes it) and the tile controller
 * (which stamps FINISH requests with it).
 *
 * It lives in its own module so that reading it does not import
 * `fragments-thread.ts`. That module constructs the worker singleton and
 * registers `onmessage` when evaluated, and it used to be reachable from the
 * package's main entry only because the tile controller read this number
 * through it (#298).
 */
export const threadSeq = { lastSeen: 0 };
