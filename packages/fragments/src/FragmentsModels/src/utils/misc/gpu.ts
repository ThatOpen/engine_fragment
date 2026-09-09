export class GPU {
  private static readonly capacityFactor = 200;

  /**
   * Ceiling for the estimated tile-cache budget, in bytes. The
   * screen-size heuristic explodes on hidpi displays (a 4K screen at
   * devicePixelRatio 2 yields ~6.6 GB), and this budget only caps the
   * cache of *invisible* tiles — visible geometry is never evicted —
   * so a bounded cache costs at most some re-uploads when the camera
   * returns to a previously culled area.
   */
  private static readonly maxCapacity = 1_000_000_000;

  static estimateCapacity() {
    const factor = this.capacityFactor;
    const width = window.screen.width;
    const height = window.screen.height;
    const ratio = window.devicePixelRatio;
    const result = Math.trunc(width * height * ratio * ratio * factor);
    return Math.min(result, this.maxCapacity);
  }
}
