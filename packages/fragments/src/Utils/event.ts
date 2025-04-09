export class Event<T> {
  enabled = true;

  add(handler: T extends void ? { (): void } : { (data: T): void }): void {
    this.handlers.push(handler);
  }

  remove(handler: T extends void ? { (): void } : { (data: T): void }): void {
    this.handlers = this.handlers.filter((h) => h !== handler);
  }

  trigger = (data?: T) => {
    if (!this.enabled) {
      return;
    }
    const handlers = this.handlers.slice(0);
    for (const handler of handlers) {
      handler(data as any);
    }
  };

  reset() {
    this.handlers.length = 0;
  }

  private handlers: (T extends void ? { (): void } : { (data: T): void })[] =
    [];
}
