import { Connection } from "./connection";
import { ThreadHandler } from "./connection-handlers";
import { MultithreadingHelper, Thread } from "./multithreading-helper";
import { ThreadsData } from "./threads-data";

export class FragmentsConnection extends Connection {
  private readonly _data: ThreadsData;

  constructor(handleInput: ThreadHandler, threadPath: string) {
    super(handleInput);
    this._data = new ThreadsData(threadPath);
  }

  delete(model: string) {
    const thread = this._data.getThreadSafe(model);
    const amount = this._data.getAmountSafe(thread) - 1;
    this._data.deleteModel(model);
    if (amount === 0) {
      this._data.deleteThread(thread);
    }
  }

  async invoke(model: string, method: string, args: any[] = []) {
    const helper = MultithreadingHelper;
    const requestData = helper.getExecuteRequest(model, method, args);
    const response = await this.fetch(requestData);
    return response.result;
  }

  protected override async fetchConnection(input: any) {
    const thread = this._data.getAndCheckThread(input.modelId);
    if (thread) {
      return this._data.getPort(thread);
    }
    return this.setupNewThread(input);
  }

  private setupNewThread(input: any) {
    const helper = MultithreadingHelper;
    this._data.usePlaceholder(input.modelId);
    const currentThreads = this._data.getThreadAmount();
    const areCoresAvailable = helper.areCoresAvailable(currentThreads);
    if (areCoresAvailable) {
      return this.newThread(input, this._data.path);
    }
    return this._data.balanceThreadLoad(input);
  }

  private setupThread(newThread: Thread) {
    const threadChannel = new MessageChannel();
    const p1 = threadChannel.port1;
    const p2 = threadChannel.port2;
    this.initConnection(p1);
    this._data.setPort(newThread, p1);
    newThread.postMessage(p2, [p2]);
  }

  private newThread(input: any, url: string) {
    const newThread = MultithreadingHelper.newThread(url);
    this.setupThread(newThread);
    this._data.setAmount(newThread, 1);
    this._data.set(input.modelId, newThread);
    return this._data.getPort(newThread);
  }
}
