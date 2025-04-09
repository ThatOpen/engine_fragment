export class GPU {
  private static readonly capacityFactor = 200;

  static estimateCapacity() {
    const factor = this.capacityFactor;
    const width = window.screen.width;
    const height = window.screen.height;
    const ratio = window.devicePixelRatio;
    const result = Math.trunc(width * height * ratio * ratio * factor);
    return result;
  }
}
