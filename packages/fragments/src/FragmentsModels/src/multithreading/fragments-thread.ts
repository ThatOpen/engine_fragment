import { VirtualFragmentsModel } from "../virtual-model";
import { Connection } from "./connection";
import { ThreadControllerManager } from "./thread-controllers/thread-controller-manager";

export class FragmentsThread {
  readonly actions: { [index: number]: any } = {};
  readonly list = new Map<string, VirtualFragmentsModel>();
  /** Set of model IDs currently being loaded (CREATE_MODEL in flight). */
  readonly loading = new Set<string>();
  /** Set of model IDs whose in-flight load should abort at the next yield. */
  readonly aborting = new Set<string>();

  /**
   * Highest `seq` this worker has seen on any incoming RPC. Each
   * main → worker message carries a monotonic `seq` set by the
   * sender (FragmentsConnection.fetch). When the worker emits a
   * FINISH tile request, it stamps it with this value so the main
   * thread can resolve `forceUpdateFinish` waiters without polling.
   *
   * Lives on the thread (not the model) because seq is global to
   * the worker — a single FINISH from any model carries the highest
   * seq the worker has acknowledged, which is what main needs for
   * the fence semantics ("everything I've sent up to N is done").
   */
  lastSeenSeq = 0;

  // It registers all actions from multithreadingRequestClass
  readonly controllerManager = new ThreadControllerManager(this);

  private _connection?: Connection;

  get connection() {
    if (!this._connection) {
      throw new Error("Fragments: Connection not set");
    }
    return this._connection;
  }

  set connection(connection: Connection) {
    this._connection = connection;
  }

  useConnection(connection: MessagePort) {
    const handler = async (input: any) => {
      // `seq` is monotonic so taking max guards against any out-of-
      // order delivery (postMessage is in-order, but defensive is
      // cheap). Captured before dispatching so the FINISH emitted
      // by the action's resulting tile work carries this RPC's seq.
      if (typeof input.seq === "number" && input.seq > this.lastSeenSeq) {
        this.lastSeenSeq = input.seq;
      }
      await this.actions[input.class](input);
    };
    this.connection = new Connection(handler);
    this.connection.init(connection);
  }

  getModel(id: string) {
    const model = this.list.get(id);
    if (!model) {
      throw new Error(`Fragments: Model not found: ${id}`);
    }
    return model;
  }
}

/**
 * The worker's singleton {@link FragmentsThread}. Exposed so worker-
 * side code (e.g. tile-controllers emitting FINISH) can read the
 * current `lastSeenSeq` to stamp outgoing tile requests with.
 *
 * Importing this module is now safe from the main bundle (e.g. from
 * `virtual-tiles-controller.ts`) because the `onmessage` registration
 * below is gated on actually being in a worker context. Without that
 * gate, the main thread would have its own `onmessage` clobbered the
 * moment any code in the main bundle pulled in this file.
 */
export const thread = new FragmentsThread();
// `window` is undefined in workers; guarding on it avoids the main
// thread accidentally registering this handler when the file gets
// pulled into the main bundle by a transitive import.
if (typeof window === "undefined") {
  globalThis.onmessage = (input: MessageEvent) => {
    thread.useConnection(input.data);
  };
}
