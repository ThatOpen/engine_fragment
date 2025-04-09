export class IntHelper {
  private static readonly _max = 2147483647;
  private static readonly _min = -2147483648;

  static check(data: number) {
    const isInteger = Number.isInteger(data);
    const notOverflow = data < this._max;
    const notUnderflow = data > this._min;
    return isInteger && notOverflow && notUnderflow;
  }
}
