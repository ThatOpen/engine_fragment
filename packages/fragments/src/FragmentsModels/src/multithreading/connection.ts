import { ConnectionHandlers, ThreadHandler } from "./connection-handlers";
import { MultithreadingHelper } from "./multithreading-helper";

export class Connection {
  private readonly _handlers = new ConnectionHandlers();
  private readonly _handleInput: ThreadHandler;
  private _port?: MessagePort;

  constructor(handleInput: ThreadHandler) {
    this._handleInput = handleInput;
  }

  fetchMeshCompute(modelId: string, list: any[]) {
    const helper = MultithreadingHelper;
    const input = helper.getMeshComputeRequest(modelId, list);
    const content = helper.getRequestContent(input);
    this.fetch(input, content);
  }

  fetch(input: any, content?: any[]) {
    this._handlers.setupInput(input);
    return new Promise<any>((resolve, reject) => {
      this._handlers.set(input.requestId, reject, resolve);
      // A request that can't be routed never reaches the other side,
      // so nothing would ever answer it.
      this.executeConnection(input, content).catch((error) => {
        this._handlers.delete(input.requestId);
        reject(error);
      });
    });
  }

  init(port: MessagePort) {
    this._port = port;
    this.initConnection(port);
  }

  protected async fetchConnection(_input: any) {
    if (!this._port) {
      throw new Error("Fragments: Connection not initialized");
    }
    return this._port;
  }

  private async executeConnection(input: any, content?: any[]) {
    const connectionPort = await this.fetchConnection(input);
    connectionPort.postMessage(input, content as any);
  }

  protected initConnection(connection: MessagePort) {
    connection.onmessage = (input) => this.onInput(input, connection);
  }

  private async onInput<
    T extends { toMainThread?: boolean; errorInfo?: string },
  >({ data }: MessageEvent<T>, port: MessagePort) {
    if (data.toMainThread) {
      this._handlers.run(data);
      return;
    }
    try {
      await this._handleInput(data);
    } catch (error: any) {
      data.errorInfo = error.toString();
      // Aborts are intentional — don't log them as unexpected errors.
      if (error?.name !== "LoadAbortedError") {
        console.error(error);
      }
    }
    // Answers go back through the port the request came in on.
    data.toMainThread = true;
    port.postMessage(data);
  }
}
