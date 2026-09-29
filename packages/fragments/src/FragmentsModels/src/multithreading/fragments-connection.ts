import {
  ModelUid,
  MultiThreadingRequestClass,
  WorkerRequest,
} from "../model/model-types";
import { Cloned } from "./cloned";
import { Connection } from "./connection";
import { ThreadHandler } from "./connection-handlers";
import { MultithreadingHelper, Thread } from "./multithreading-helper";
import { ThreadsData } from "./threads-data";

export interface FragmentsConnectionOptions {
  classicWorker?: boolean;
  /**
   * Effective max worker cap. Defaults to navigator.hardwareConcurrency - 3,
   * floored at 2. Sum of declared `threadGroups` sizes must leave at least
   * one slot for the default pool.
   */
  maxWorkers?: number;
  /**
   * Reserved worker capacity per named group. Lazy: workers are spawned on
   * demand, not eagerly. A model loaded with a matching `threadGroup`
   * always lands on its group's pool; a default-pool load never lands on a
   * reserved worker.
   */
  threadGroups?: Record<string, number>;
}

export class FragmentsConnection extends Connection<WorkerRequest> {
  private readonly _data: ThreadsData;
  private readonly _classicWorker: boolean;
  private readonly _maxWorkers: number;
  private readonly _threadGroups: Map<string, number>;
  private readonly _defaultCap: number;

  get maxWorkers() {
    return this._maxWorkers;
  }

  get threadGroups(): Record<string, number> {
    return Object.fromEntries(this._threadGroups);
  }

  /**
   * Number of workers currently hosting at least one model. Used to
   * split the global graphic-memory budget evenly between workers
   * (each worker tracks its tile-cache consumption independently).
   */
  get activeThreadCount() {
    return this._data.getThreadAmount();
  }

  constructor(
    handleInput: ThreadHandler<WorkerRequest>,
    threadPath: string,
    options?: FragmentsConnectionOptions,
  ) {
    super(handleInput);
    this._classicWorker = options?.classicWorker ?? false;
    this._data = new ThreadsData(threadPath);
    this._maxWorkers = MultithreadingHelper.getMaxWorkers(options?.maxWorkers);

    const declared = options?.threadGroups ?? {};
    let reserved = 0;
    this._threadGroups = new Map();
    for (const [name, size] of Object.entries(declared)) {
      if (!Number.isFinite(size) || size < 1 || !Number.isInteger(size)) {
        throw new Error(
          `Fragments: threadGroup "${name}" must have an integer size >= 1 (got ${size}).`,
        );
      }
      this._threadGroups.set(name, size);
      reserved += size;
    }
    if (reserved >= this._maxWorkers) {
      throw new Error(
        `Fragments: declared threadGroups reserve ${reserved} workers but maxWorkers is ${this._maxWorkers}. The default pool needs at least one slot. Either lower a group size or raise maxWorkers.`,
      );
    }
    this._defaultCap = this._maxWorkers - reserved;
  }

  /**
   * Deletes the model from its worker. Takes effect right away: the model's
   * thread slot is freed, any later request for the model rejects, and the
   * worker is terminated if it hosts no other model, which rejects the
   * requests still waiting on it. Resolves once the worker has deleted the
   * model or has been terminated.
   */
  delete(uid: ModelUid): Promise<void> {
    const thread = this._data.getThread(uid);
    const port = thread ? this._data.getPort(thread) : undefined;
    // Sent before the slot is freed, so it still goes to the model's worker.
    // A model that never got a thread has nothing to delete there.
    const deleted = port
      ? this.fetch({ class: MultiThreadingRequestClass.DELETE_MODEL, uid })
      : Promise.resolve();
    this._data.deleteModel(uid);
    if (thread && port && this._data.getAmount(thread) === 0) {
      this._data.deleteThread(thread);
      this.failPending(port, "Fragments: the worker was terminated.");
      port.close();
    }
    // The model is gone either way; a failed delete has nothing to report.
    return deleted.then(
      () => {},
      () => {},
    );
  }

  /**
   * Looks up the threadGroup the user assigned at load() time. Returns
   * undefined for default-pool models. Used by FragmentsModels to expose
   * `model.threadGroup` to consumers.
   */
  getModelThreadGroup(uid: ModelUid) {
    return this._data.getModelGroup(uid);
  }

  /**
   * Records the threadGroup for an upcoming load. Called by FragmentsModels
   * before issuing the first request for that model so the routing in
   * setupNewThread sees the right group.
   */
  setModelThreadGroup(uid: ModelUid, group: string | undefined) {
    if (group !== undefined && !this._threadGroups.has(group)) {
      throw new Error(
        `Fragments: thread group "${group}" was not declared at init time. Declared groups: ${[...this._threadGroups.keys()].join(", ") || "(none)"}.`,
      );
    }
    this._data.setModelGroup(uid, group);
  }

  /**
   * Calls a method of the model's worker-side counterpart. `R` is what the
   * method returns there, which reaches this thread as a copy.
   */
  async invoke<R = any>(uid: ModelUid, method: string, args: any[] = []) {
    const helper = MultithreadingHelper;
    const requestData = helper.getExecuteRequest(uid, method, args);
    const response = await this.fetch(requestData);
    return response.result as Cloned<R>;
  }

  /**
   * Tag every outbound request with a monotonic `seq`. The worker
   * tracks the highest seq it has processed and stamps emitted
   * `FINISH` tile requests with it; main uses the stamp to resolve
   * `forceUpdateFinish` waiters without polling. Only set if not
   * already present so internal callers can override (none currently
   * do, but keeps the contract explicit).
   *
   * Done at the connection level rather than per-helper so every
   * RPC type — EXECUTE, REFRESH_VIEW, GET_BOXES, etc. — is covered
   * uniformly.
   */
  override fetch<T extends object>(
    input: T & { seq?: number },
    content?: any[],
  ) {
    if (input.seq === undefined) {
      input.seq = MultithreadingHelper.nextSeq();
    }
    return super.fetch(input, content);
  }

  protected override fetchConnection(input: any): MessagePort {
    const thread = this._data.getAndCheckThread(input.uid);
    if (thread) {
      return this._data.getPort(thread);
    }
    // Only CREATE_MODEL assigns a thread, and only disposing the model
    // releases it. Any other request without one is for a model that isn't
    // loaded (or was disposed), and a thread assigned to it would never be
    // released.
    if (input.class !== MultiThreadingRequestClass.CREATE_MODEL) {
      throw new Error(`Fragments: model ${input.uid} is not loaded.`);
    }
    return this.setupNewThread(input);
  }

  /**
   * Either spawns a new worker (if this group/pool still has reserved
   * capacity) or routes the load to the least-busy existing worker in the
   * same pool. Cross-pool spillover is intentionally not allowed: a "data"
   * load never lands on a "geometry" worker and vice versa, and default
   * loads never use a reserved worker.
   */
  private setupNewThread(input: any): MessagePort {
    this._data.usePlaceholder(input.uid);
    const group = this._data.getModelGroup(input.uid);

    const cap =
      group === undefined
        ? this._defaultCap
        : (this._threadGroups.get(group) as number);
    const current = this._data.getThreadAmountForGroup(group);

    if (current < cap) {
      return this.newThread(input, this._data.path, group);
    }
    return this._data.balanceThreadLoad(input, group);
  }
  /**
   * Creates a `MessageChannel` to establish a bidirectional
   * communication link between the main thread and the worker.
   * - `port1` is kept on the main thread
   * - `port2` is transferred to the worker via `postMessage`
   * @param newThread
   */
  private setupThread(newThread: Thread) {
    const threadChannel = new MessageChannel();
    const p1 = threadChannel.port1;
    const p2 = threadChannel.port2;
    this.initConnection(p1);
    this._data.setPort(newThread, p1);
    newThread.postMessage(p2, [p2]);
  }

  private newThread(input: any, url: string, group: string | undefined) {
    const newThread = MultithreadingHelper.newThread(url, this._classicWorker);
    this.setupThread(newThread);
    this._data.setAmount(newThread, 1);
    this._data.setThreadGroup(newThread, group);
    this._data.set(input.uid, newThread);
    return this._data.getPort(newThread);
  }
}
