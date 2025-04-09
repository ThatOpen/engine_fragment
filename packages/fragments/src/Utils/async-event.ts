export class AsyncEvent<T> {
  enabled = true;

  add(
    handler: T extends void
      ? { (): Promise<void> }
      : { (data: T): Promise<void> },
  ): void {
    this.handlers.push(handler);
  }

  remove(
    handler: T extends void
      ? { (): Promise<void> }
      : { (data: T): Promise<void> },
  ): void {
    this.handlers = this.handlers.filter((h) => h !== handler);
  }

  trigger = async (data?: T) => {
    if (!this.enabled) {
      return;
    }
    const handlers = this.handlers.slice(0);
    for (const handler of handlers) {
      await handler(data as any);
    }
  };

  reset() {
    this.handlers.length = 0;
  }

  private handlers: (T extends void
    ? { (): Promise<void> }
    : { (data: T): Promise<void> })[] = [];
}
