import { FragmentsThread } from "../fragments-thread";

export class ThreadUpdater {
  private readonly _thread: FragmentsThread;
  private readonly _updateThreshold = 16;
  private _updateDelay = 128;
  private _running = false;
  private _timeout: ReturnType<typeof setTimeout> | null = null;

  constructor(thread: FragmentsThread) {
    this._thread = thread;
  }

  // Starts the update loop if it is not already running. Idempotent. Called
  // when a model is registered so the loop resumes after it stopped itself
  // while idle. The loop is no longer started at construction time, so merely
  // importing the library (e.g. for an IFC conversion task) does not spin a
  // perpetual timer. See #234.
  start() {
    if (this._running) return;
    this._running = true;
    this.schedule(0);
  }

  // Stops the loop and clears any pending timer. Safe to call repeatedly.
  stop() {
    this._running = false;
    if (this._timeout !== null) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
  }

  setUpdateDelay(delay?: number) {
    if (typeof delay !== "number" || !Number.isFinite(delay) || delay < 0) {
      return;
    }
    this._updateDelay = delay;
  }

  private schedule(delay: number) {
    this._timeout = setTimeout(this._tick, delay);
  }

  private _tick = () => {
    this._timeout = null;
    if (!this._running) return;
    // With no models there is nothing to drive, so stop instead of rescheduling
    // forever. start() brings the loop back when the next model is registered.
    if (this._thread.list.size === 0) {
      this._running = false;
      return;
    }
    const updated = this.updateAllModels();
    const delay = updated ? this._updateDelay : 0;
    this.schedule(delay);
  };

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
