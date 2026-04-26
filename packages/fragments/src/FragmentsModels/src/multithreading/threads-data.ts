import { Thread } from "./multithreading-helper";

/**
 * Sentinel for the default pool. Threads not reserved for a named
 * `threadGroup` carry this value internally so all the bookkeeping uses one
 * type (string) instead of `string | undefined`.
 */
const DEFAULT_POOL = "__default__";

export class ThreadsData {
  private readonly _modelThread = new Map<string, Thread>();
  private readonly _threadsModelAmount = new Map<Thread, number>();
  private readonly _threadPort = new Map<Thread, MessagePort>();
  private readonly _threadPath: string;
  private readonly _placeholder: Thread;

  // Per-thread group tag. Default-pool threads use DEFAULT_POOL.
  private readonly _threadGroup = new Map<Thread, string>();
  // Per-model group tag, mirrors what the user passed at load().
  private readonly _modelGroup = new Map<string, string | undefined>();

  get path() {
    return this._threadPath;
  }

  constructor(threadPath: string) {
    this._placeholder = {} as Thread;
    this._threadPath = threadPath;
  }

  usePlaceholder(id: string) {
    this._modelThread.set(id, this._placeholder);
  }

  getAmount(thread: Thread) {
    return this._threadsModelAmount.get(thread);
  }

  getThread(modelId: string) {
    return this._modelThread.get(modelId);
  }

  getAndCheckThread(id: string) {
    const thread = this._modelThread.get(id);
    if (thread === this._placeholder) {
      throw new Error("Fragments: Error fetching thread!");
    }
    return thread;
  }

  set(modelId: string, thread: Thread) {
    this._modelThread.set(modelId, thread);
  }

  setModelGroup(modelId: string, group: string | undefined) {
    this._modelGroup.set(modelId, group);
  }

  getModelGroup(modelId: string) {
    return this._modelGroup.get(modelId);
  }

  setThreadGroup(thread: Thread, group: string | undefined) {
    this._threadGroup.set(thread, group ?? DEFAULT_POOL);
  }

  getThreadGroup(thread: Thread): string | undefined {
    const group = this._threadGroup.get(thread);
    if (group === undefined || group === DEFAULT_POOL) return undefined;
    return group;
  }

  /**
   * Number of threads currently registered for the given group, or for the
   * default pool when `group` is undefined.
   */
  getThreadAmountForGroup(group: string | undefined) {
    const target = group ?? DEFAULT_POOL;
    let count = 0;
    for (const value of this._threadGroup.values()) {
      if (value === target) count++;
    }
    return count;
  }

  deleteModel(modelId: string) {
    const modelThread = this.getThreadSafe(modelId);
    const threadModelAmount = this.getAmountSafe(modelThread);
    const newModelAmount = threadModelAmount - 1;
    this.setAmount(modelThread, newModelAmount);
    this._modelThread.delete(modelId);
    this._modelGroup.delete(modelId);
  }

  getThreadSafe(modelId: string) {
    const thread = this.getThread(modelId);
    if (!thread) {
      throw new Error(`Fragments: Thread for model ${modelId} not found`);
    }
    return thread;
  }

  deleteThread(thread: Thread) {
    this._threadsModelAmount.delete(thread);
    this._threadPort.delete(thread);
    this._threadGroup.delete(thread);
    thread.terminate();
  }

  getThreadAmount() {
    return this._threadsModelAmount.size;
  }

  /**
   * Round-robin balancing within the given group only. The default pool and
   * each named group are independent, so a "data" model never lands on a
   * "geometry" worker, and a default-pool model never lands on a reserved
   * worker even if that worker is idle.
   */
  balanceThreadLoad(input: any, group: string | undefined) {
    const target = group ?? DEFAULT_POOL;
    let lessBusyThread: Thread | null = null;
    let modelAmount = Number.MAX_VALUE;
    for (const [thread, amount] of this._threadsModelAmount) {
      if (this._threadGroup.get(thread) !== target) continue;
      if (amount < modelAmount) {
        modelAmount = amount;
        lessBusyThread = thread;
      }
    }
    if (!lessBusyThread) {
      throw new Error(
        `Fragments: no worker available for thread group "${target}".`,
      );
    }
    this._threadsModelAmount.set(lessBusyThread, modelAmount + 1);
    this._modelThread.set(input.modelId, lessBusyThread);
    return this._threadPort.get(lessBusyThread) as MessagePort;
  }

  getAmountSafe(thread: Thread) {
    const amount = this.getAmount(thread);
    if (!amount) {
      throw new Error(`Fragments: Amount for thread ${thread} not found`);
    }
    return amount;
  }

  setPort(thread: Thread, port: MessagePort) {
    this._threadPort.set(thread, port);
  }

  setAmount(thread: Thread, amount: number) {
    this._threadsModelAmount.set(thread, amount);
  }

  getPort(thread: Thread) {
    return this._threadPort.get(thread) as MessagePort;
  }
}
