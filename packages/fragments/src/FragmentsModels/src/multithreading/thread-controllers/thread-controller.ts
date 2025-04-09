import { FragmentsThread } from "../fragments-thread";

export abstract class ThreadController {
  private readonly id: number;

  protected readonly thread: FragmentsThread;

  constructor(thread: FragmentsThread) {
    this.id = this.getId();
    this.thread = thread;
    this.thread.actions[this.id] = (input: any) => this.execute(input);
  }

  protected abstract getId(): number;

  protected abstract execute(input: any): Promise<void>;
}
