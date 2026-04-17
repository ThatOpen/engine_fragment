import { FragmentsThread } from "../fragments-thread";
import { ThreadModelCreator } from "./thread-model-creator";
import { ThreadRaycaster } from "./thread-raycaster";
import { ThreadModelDeleter } from "./thread-model-deleter";
import { ThreadModelAborter } from "./thread-model-aborter";
import { ThreadViewRefresher } from "./thread-view-refresher";
import { ThreadBoxFetcher } from "./thread-box-fetcher";
import { ThreadExecutor } from "./thread-executor";
import { ThreadUpdater } from "./thread-updater";

export class ThreadControllerManager {
  readonly thread: FragmentsThread;
  readonly modelCreator: ThreadModelCreator;
  readonly raycaster: ThreadRaycaster;
  readonly modelDeleter: ThreadModelDeleter;
  readonly modelAborter: ThreadModelAborter;
  readonly viewRefresher: ThreadViewRefresher;
  readonly boxFetcher: ThreadBoxFetcher;
  readonly executor: ThreadExecutor;
  readonly updater: ThreadUpdater;

  constructor(thread: FragmentsThread) {
    this.thread = thread;
    this.modelCreator = new ThreadModelCreator(thread);
    this.raycaster = new ThreadRaycaster(thread);
    this.modelDeleter = new ThreadModelDeleter(thread);
    this.modelAborter = new ThreadModelAborter(thread);
    this.viewRefresher = new ThreadViewRefresher(thread);
    this.boxFetcher = new ThreadBoxFetcher(thread);
    this.executor = new ThreadExecutor(thread);
    this.updater = new ThreadUpdater(thread);
  }
}
