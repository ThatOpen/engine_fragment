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
      this.executeConnection(input, content);
    });
  }

  init(port: MessagePort) {
    this._port = port;
    this.initConnection(port);
  }

  protected initConnection(connection: MessagePort) {
    connection.onmessage = this.onInput;
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

  private async manageOutput(input: any) {
    const connection = await this.fetchConnection(input);
    input.toMainThread = true;
    connection.postMessage(input);
  }

  private onInput = (input: MessageEvent) => {
    if (input.data.toMainThread) {
      this._handlers.run(input.data);
      return;
    }
    this.manageInput(input.data);
  };

  private async manageConnection(input: any) {
    try {
      await this._handleInput(input);
    } catch (error: any) {
      input.errorInfo = error.toString();
      console.error(error);
    }
  }

  private async manageInput(input: any): Promise<void> {
    await this.manageConnection(input);
    await this.manageOutput(input);
  }
}
