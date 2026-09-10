import { Connection } from "./connection";
import { MultithreadingHelper } from "./multithreading-helper";
import { VirtualMultithreadingConfig } from "../model/model-types";

export class MeshConnection {
  private _rate = 64;
  private _updater: any;
  private _modelId: string;
  private _threshold = 16;
  private _connection: Connection | undefined;
  private _list: any[] = [];

  private get needsRefresh() {
    return this._list.length > this._threshold;
  }

  constructor(
    modelId: string,
    connection: Connection | undefined,
    multithreading?: VirtualMultithreadingConfig,
  ) {
    this._modelId = modelId;
    this._connection = connection;
    const configuredRate = multithreading?.meshConnectionRate;
    if (
      typeof configuredRate === "number" &&
      Number.isFinite(configuredRate) &&
      configuredRate >= 0
    ) {
      this._rate = configuredRate;
    }

    const configuredThreshold = multithreading?.meshConnectionThreshold;
    if (
      typeof configuredThreshold === "number" &&
      Number.isFinite(configuredThreshold) &&
      configuredThreshold >= 0
    ) {
      this._threshold = configuredThreshold;
    }

    // Without a connection (single-threaded path) there is nobody to flush
    // the request list to: a repeating timer would keep the process alive
    // forever (Node never exits) and its callback would dereference an
    // undefined connection. Don't start it at all (#262).
    if (this._connection) {
      this._updater = MultithreadingHelper.newUpdater(this.refresh, this._rate);
    }
  }

  dispose(): void {
    if (this._updater !== undefined) {
      MultithreadingHelper.deleteUpdater(this._updater);
      this._updater = undefined;
    }
  }

  clean() {
    this._list = MultithreadingHelper.cleanRequests(this._list);
  }

  process(request: any): void {
    // No connection means no consumer: accumulating requests would just
    // grow the list unboundedly (nothing ever flushes it). Mirrors the
    // `_onTransferMaterial` guard in VirtualFragmentsModel (#262).
    if (!this._connection) {
      return;
    }
    this._list.push(request);
    if (this.needsRefresh) {
      this.refresh();
    }
  }

  private refresh = () => {
    // Defensive twin of the `process` guard: covers any request that was
    // queued before a connection went away (#262).
    if (!this._connection) {
      return;
    }
    if (this._list.length) {
      const current = this._list;
      this._connection.fetchMeshCompute(this._modelId, current);
      this._list = [];
    }
  };
}
