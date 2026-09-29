import {
  ConnectionHandlers,
  type MessageBase,
  type ThreadHandler,
} from "./connection-handlers";
import { MultithreadingHelper } from "./multithreading-helper";
import type { ModelUid } from "../model/model-types";

export class Connection {
  private readonly _handlers = new ConnectionHandlers();
  private readonly _handleInput: ThreadHandler;
  private _port?: MessagePort;

  constructor(handleInput: ThreadHandler) {
    this._handleInput = handleInput;
  }

  fetchMeshCompute(uid: ModelUid, list: any[]) {
    const helper = MultithreadingHelper;
    const input = helper.getMeshComputeRequest(uid, list);
    const content = helper.getRequestContent(input);
    this.fetch(input, content);
  }

  fetch<T extends object>(input: T, content: any[] = []) {
    const message = this._handlers.setupInput(input);
    return new Promise<T & MessageBase>((resolve, reject) => {
      // Routing and sending happen before this returns, so a caller that
      // frees a route right after (see FragmentsConnection.delete) still
      // sends through it. If either throws, the promise rejects: nothing
      // would ever answer the request.
      const port = this.fetchConnection(message);
      port.postMessage(message, content);
      this._handlers.set(message.requestId, port, (response) => {
        if (response.errorInfo) {
          reject(response.errorInfo);
          return;
        }
        // The other side answers with the message it received, results added.
        resolve(response as T & MessageBase);
      });
    });
  }

  init(port: MessagePort) {
    this._port = port;
    this.initConnection(port);
  }

  protected fetchConnection(_input: MessageBase): MessagePort {
    if (!this._port) {
      throw new Error("Fragments: Connection not initialized");
    }
    return this._port;
  }

  /**
   * Rejects every request still waiting for an answer through `port`, for
   * when the other side is gone.
   */
  protected failPending(port: MessagePort, errorInfo: string) {
    this._handlers.fail(port, errorInfo);
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
