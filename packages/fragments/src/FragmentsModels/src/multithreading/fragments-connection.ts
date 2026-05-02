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

export class FragmentsConnection extends Connection {
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

  constructor(
    handleInput: ThreadHandler,
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

  delete(model: string) {
    const thread = this._data.getThreadSafe(model);
    const amount = this._data.getAmountSafe(thread) - 1;
    this._data.deleteModel(model);
    if (amount === 0) {
      this._data.deleteThread(thread);
    }
  }

  /**
   * Looks up the threadGroup the user assigned at load() time. Returns
   * undefined for default-pool models. Used by FragmentsModels to expose
   * `model.threadGroup` to consumers.
   */
  getModelThreadGroup(modelId: string) {
    return this._data.getModelGroup(modelId);
  }

  /**
   * Records the threadGroup for an upcoming load. Called by FragmentsModels
   * before issuing the first request for that model so the routing in
   * setupNewThread sees the right group.
   */
  setModelThreadGroup(modelId: string, group: string | undefined) {
    if (group !== undefined && !this._threadGroups.has(group)) {
      throw new Error(
        `Fragments: thread group "${group}" was not declared at init time. Declared groups: ${[...this._threadGroups.keys()].join(", ") || "(none)"}.`,
      );
    }
    this._data.setModelGroup(modelId, group);
  }

  async invoke(model: string, method: string, args: any[] = []) {
    const helper = MultithreadingHelper;
    const requestData = helper.getExecuteRequest(model, method, args);
    const response = await this.fetch(requestData);
    return response.result;
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
  override fetch(input: any, content?: any[]) {
    if (input.seq === undefined) {
      input.seq = MultithreadingHelper.nextSeq();
    }
    return super.fetch(input, content);
  }

  protected override async fetchConnection(input: any): Promise<MessagePort> {
    const thread = this._data.getAndCheckThread(input.modelId);
    if (thread) {
      return this._data.getPort(thread);
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
    this._data.usePlaceholder(input.modelId);
    const group = this._data.getModelGroup(input.modelId);

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
    this._data.set(input.modelId, newThread);
    return this._data.getPort(newThread);
  }
}
