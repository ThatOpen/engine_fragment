export type ThreadHandler = (args: any) => Promise<void> | void;

export class ConnectionHandlers {
  private readonly _list = new Map<number, ThreadHandler>();
  private _communicationKey = 0;

  setupInput(input: any) {
    input.requestId = this._communicationKey++;
  }

  set(id: number, reject: any, resolve: any) {
    const handler = this.newHandler(reject, resolve);
    this._list.set(id, handler);
  }

  run(data: any) {
    const handler = this._list.get(data.requestId) as ThreadHandler;
    this._list.delete(data.requestId);
    handler(data);
  }

  private newHandler(reject: any, resolve: any) {
    return (response: any) => {
      if (response.errorInfo) {
        reject(response.errorInfo);
        return;
      }
      resolve(response);
    };
  }
}
