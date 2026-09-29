import {
  ConnectionHandlers,
  type MessageBase,
  type ThreadHandler,
} from "./connection-handlers";
import { MultithreadingHelper } from "./multithreading-helper";
import type { Cloned } from "./cloned";
import type { ModelUid, TileRequest } from "../model/model-types";

/**
 * One side of the message layer between the main thread and a worker.
 * `TInput` is what the other side sends it as requests.
 */
export class Connection<TInput extends object = object> {
  private readonly _handlers = new ConnectionHandlers();
  private readonly _handleInput: ThreadHandler<TInput>;
  private _port?: MessagePort;

  constructor(handleInput: ThreadHandler<TInput>) {
    this._handleInput = handleInput;
  }

  fetchMeshCompute(uid: ModelUid, list: TileRequest[]) {
    const helper = MultithreadingHelper;
    const input = helper.getMeshComputeRequest(uid, list);
    const content = helper.getRequestContent(input);
    // Fire-and-forget: if the main thread fails to handle it, it logs the
    // error itself, and there is nothing to do about it here.
    this.fetch(input, content).catch(() => {});
  }

  fetch<T extends object>(input: T, content: any[] = []) {
    const message = this._handlers.setupInput(input);
    return new Promise<Cloned<T> & MessageBase>((resolve, reject) => {
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
        // The other side answers with a copy of the message it received,
        // results added.
        resolve(response as Cloned<T> & MessageBase);
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
      // Anything that isn't an answer is a request, which the other side
      // sends as a TInput.
      await this._handleInput(data as Cloned<TInput> & MessageBase);
    } catch (error: any) {
      data.errorInfo = error.toString();
      // Aborts are intentional — don't log them as unexpected errors.
      if (error?.name !== "LoadAbortedError") {
        console.error(error);
      }
    }
    // Answers go back through the port the request came in on.
    data.toMainThread = true;
    try {
      port.postMessage(data);
    } catch (error: any) {
      // The answer can't be copied (e.g. a result holding a function). Answer
      // with the error instead, or the request would never settle.
      console.error(error);
      const { requestId } = data;
      const errorInfo = String(error);
      port.postMessage({ requestId, toMainThread: true, errorInfo });
    }
  }
}
