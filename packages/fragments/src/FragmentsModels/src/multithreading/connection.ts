import {
  ConnectionHandlers,
  type MessageBase,
  type ThreadHandler,
} from "./connection-handlers";
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

  fetch<T extends object>(input: T, content: any[] = []) {
    const message = this._handlers.setupInput(input);
    return new Promise<T & MessageBase>((resolve, reject) => {
      const handler: ThreadHandler = (response) => {
        if (response.errorInfo) {
          reject(response.errorInfo);
          return;
        }
        // The other side answers with the message it received, results added.
        resolve(response as T & MessageBase);
      };
      this._handlers.set(message.requestId, handler);
      // A request that can't be routed never reaches the other side,
      // so nothing would ever answer it.
      this.fetchConnection(message)
        .then((connectionPort) => {
          connectionPort.postMessage(message, content);
        })
        .catch((error) => {
          this._handlers.delete(message.requestId);
          reject(error);
        });
    });
  }

  init(port: MessagePort) {
    this._port = port;
    this.initConnection(port);
  }

  protected async fetchConnection(_input: MessageBase) {
    if (!this._port) {
      throw new Error("Fragments: Connection not initialized");
    }
    return this._port;
  }

  protected initConnection(connection: MessagePort) {
    connection.onmessage = (input) => this.onInput(input, connection);
  }

  private async onInput(
    { data }: MessageEvent<MessageBase>,
    port: MessagePort,
  ) {
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
