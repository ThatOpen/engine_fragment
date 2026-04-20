import { Connection } from "./connection";
import { MultithreadingHelper } from "./multithreading-helper";
import { VirtualMultithreadingConfig } from "../model/model-types";

export class MeshConnection {
  private _rate = 64;
  private _updater: any;
  private _modelId: string;
  private _threshold = 16;
  private _connection: Connection;
  private _list: any[] = [];

  private get needsRefresh() {
    return this._list.length > this._threshold;
  }

  constructor(
    modelId: string,
    connection: Connection,
    multithreading?: VirtualMultithreadingConfig,
  ) {
    this._modelId = modelId;
    this._connection = connection;
    this._rate = multithreading?.meshConnectionRate ?? this._rate;
    this._threshold =
      multithreading?.meshConnectionThreshold ?? this._threshold;
    this._updater = MultithreadingHelper.newUpdater(this.refresh, this._rate);
  }

  dispose(): void {
    MultithreadingHelper.deleteUpdater(this._updater);
  }

  clean() {
    this._list = MultithreadingHelper.cleanRequests(this._list);
  }

  process(request: any): void {
    this._list.push(request);
    if (this.needsRefresh) {
      this.refresh();
    }
  }

  private refresh = () => {
    if (this._list.length) {
      const current = this._list;
      this._connection.fetchMeshCompute(this._modelId, current);
      this._list = [];
    }
  };
}
