export type MessageBase = {
  requestId: number;
  /** Set on answers, in either direction, despite the name. */
  toMainThread?: boolean;
  errorInfo?: string;
};

export type ThreadHandler = (args: MessageBase) => Promise<void> | void;

export class ConnectionHandlers {
  private readonly _list = new Map<number, ThreadHandler>();
  private _communicationKey = 0;

  setupInput<T extends object>(input: T): T & MessageBase {
    return Object.assign(input, { requestId: this._communicationKey++ });
  }

  set(id: number, handler: ThreadHandler) {
    this._list.set(id, handler);
  }

  delete(id: number) {
    this._list.delete(id);
  }

  // It resolves the awaited model.threads.fetch(...)
  run(data: MessageBase) {
    const handler = this._list.get(data.requestId)!;
    this._list.delete(data.requestId);
    handler(data);
  }
}
