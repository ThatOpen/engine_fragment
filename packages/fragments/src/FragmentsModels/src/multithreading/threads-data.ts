import { Thread } from "./multithreading-helper";
import type { ModelUid } from "../model/model-types";

/**
 * Sentinel for the default pool. Threads not reserved for a named
 * `threadGroup` carry this value internally so all the bookkeeping uses one
 * type (string) instead of `string | undefined`.
 */
const DEFAULT_POOL = "__default__";

export class ThreadsData {
  private readonly _modelThread = new Map<ModelUid, Thread>();
  private readonly _threadsModelAmount = new Map<Thread, number>();
  private readonly _threadPort = new Map<Thread, MessagePort>();
  private readonly _threadPath: string;
  private readonly _placeholder: Thread;

  // Per-thread group tag. Default-pool threads use DEFAULT_POOL.
  private readonly _threadGroup = new Map<Thread, string>();
  // Per-model group tag, mirrors what the user passed at load().
  private readonly _modelGroup = new Map<ModelUid, string | undefined>();

  get path() {
    return this._threadPath;
  }

  constructor(threadPath: string) {
    this._placeholder = {} as Thread;
    this._threadPath = threadPath;
  }

  usePlaceholder(uid: ModelUid) {
    this._modelThread.set(uid, this._placeholder);
  }

  getAmount(thread: Thread) {
    return this._threadsModelAmount.get(thread);
  }

  getThread(uid: ModelUid) {
    return this._modelThread.get(uid);
  }

  getAndCheckThread(uid: ModelUid) {
    const thread = this._modelThread.get(uid);
    if (thread === this._placeholder) {
      throw new Error("Fragments: Error fetching thread!");
    }
    return thread;
  }

  set(uid: ModelUid, thread: Thread) {
    this._modelThread.set(uid, thread);
  }

  setModelGroup(uid: ModelUid, group: string | undefined) {
    this._modelGroup.set(uid, group);
  }

  getModelGroup(uid: ModelUid) {
    return this._modelGroup.get(uid);
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

  /**
   * Forgets the model, and frees its slot in its thread if it got one (a
   * model that never sent CREATE_MODEL, or whose thread setup failed, has
   * none).
   */
  deleteModel(uid: ModelUid) {
    const modelThread = this._modelThread.get(uid);
    if (modelThread && modelThread !== this._placeholder) {
      this.setAmount(modelThread, this.getAmountSafe(modelThread) - 1);
    }
    this._modelThread.delete(uid);
    this._modelGroup.delete(uid);
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
    this._modelThread.set(input.uid, lessBusyThread);
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
