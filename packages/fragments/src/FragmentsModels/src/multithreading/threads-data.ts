import { Thread } from "./multithreading-helper";

export class ThreadsData {
  private readonly _modelThread = new Map<string, Thread>();
  private readonly _threadsModelAmount = new Map<Thread, number>();
  private readonly _threadPort = new Map<Thread, MessagePort>();
  private readonly _threadPath: string;
  private readonly _placeholder: Thread;

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

  deleteModel(modelId: string) {
    const modelThread = this.getThreadSafe(modelId);
    const threadModelAmount = this.getAmountSafe(modelThread);
    const newModelAmount = threadModelAmount - 1;
    this.setAmount(modelThread, newModelAmount);
    this._modelThread.delete(modelId);
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
    thread.terminate();
  }

  getThreadAmount() {
    return this._threadsModelAmount.size;
  }

  balanceThreadLoad(input: any) {
    const { lessBusyThread, modelAmount } = this.getLessBusyThread();
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

  private getLessBusyThread() {
    let modelAmount = Number.MAX_VALUE;
    let lessBusyThread = this._threadsModelAmount.keys().next().value as Thread;
    for (const [thread, amount] of this._threadsModelAmount) {
      if (amount < modelAmount) {
        modelAmount = amount;
        lessBusyThread = thread;
      }
    }
    return { lessBusyThread, modelAmount };
  }
}
