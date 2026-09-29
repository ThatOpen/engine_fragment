export type MessageBase = {
  requestId: number;
  /** Set on answers, in either direction, despite the name. */
  toMainThread?: boolean;
  errorInfo?: string;
};

export type ThreadHandler = (args: MessageBase) => Promise<void> | void;

export class ConnectionHandlers {
  private readonly _list = new Map<
    number,
    { port: MessagePort; handler: ThreadHandler }
  >();

  private _communicationKey = 0;

  setupInput<T extends object>(input: T): T & MessageBase {
    return Object.assign(input, { requestId: this._communicationKey++ });
  }

  /** Waits for the answer to a request sent through `port`. */
  set(id: number, port: MessagePort, handler: ThreadHandler) {
    this._list.set(id, { port, handler });
  }

  // It resolves the awaited model.threads.fetch(...)
  run(data: MessageBase) {
    const entry = this._list.get(data.requestId);
    if (!entry) return;
    this._list.delete(data.requestId);
    entry.handler(data);
  }

  /**
   * Answers every request still waiting on `port` with an error, for when
   * nothing will answer them anymore.
   */
  fail(port: MessagePort, errorInfo: string) {
    for (const [requestId, entry] of this._list) {
      if (entry.port !== port) continue;
      this._list.delete(requestId);
      entry.handler({ requestId, errorInfo });
    }
  }
}
