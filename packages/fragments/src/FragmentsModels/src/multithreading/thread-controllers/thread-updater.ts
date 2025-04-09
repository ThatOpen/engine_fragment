import { FragmentsThread } from "../fragments-thread";

export class ThreadUpdater {
  private readonly _thread: FragmentsThread;
  private readonly _updateThreshold = 16;
  private readonly _updateDelay = 128;

  constructor(thread: FragmentsThread) {
    this._thread = thread;
    const updateAll = () => {
      const updated = this.updateAllModels();
      const delay = updated ? this._updateDelay : 0;
      setTimeout(updateAll, delay);
    };
    updateAll();
  }

  private updateAllModels() {
    const start = performance.now();
    let isUpdated = true;
    for (const [, model] of this._thread.list) {
      const modelUpdated = model.update(start);
      isUpdated = isUpdated && modelUpdated;
      const end = performance.now();
      const timePassed = end - start;
      if (timePassed > this._updateThreshold) {
        break;
      }
    }
    return isUpdated;
  }
}
