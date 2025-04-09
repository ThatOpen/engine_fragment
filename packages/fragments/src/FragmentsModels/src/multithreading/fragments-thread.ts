import { VirtualFragmentsModel } from "../virtual-model";
import { Connection } from "./connection";
import { ThreadControllerManager } from "./thread-controllers/thread-controller-manager";

export class FragmentsThread {
  readonly actions: { [index: number]: any } = {};
  readonly list = new Map<string, VirtualFragmentsModel>();
  readonly controllerManager = new ThreadControllerManager(this);

  private _connection?: Connection;

  get connection() {
    if (!this._connection) {
      throw new Error("Fragments: Connection not set");
    }
    return this._connection;
  }

  set connection(connection: Connection) {
    this._connection = connection;
  }

  useConnection(connection: MessagePort) {
    const handler = async (input: any) => {
      await this.actions[input.class](input);
    };
    this.connection = new Connection(handler);
    this.connection.init(connection);
  }

  getModel(id: string) {
    const model = this.list.get(id);
    if (!model) {
      throw new Error(`Fragments: Model not found: ${id}`);
    }
    return model;
  }
}

const thread = new FragmentsThread();
globalThis.onmessage = (input: MessageEvent) => {
  thread.useConnection(input.data);
};
