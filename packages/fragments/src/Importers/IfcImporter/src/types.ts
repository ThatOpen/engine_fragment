import type { ModelLoadCallback } from "web-ifc";

export interface ProgressData {
  process: "geometries" | "attributes" | "relations" | "conversion";
  state: "start" | "inProgress" | "finish";
  class?: string;
  entitiesProcessed?: number;
}

export interface ProcessData {
  id?: string;
  bytes?: Uint8Array;
  /**
   * @see {@link readCallback}
   * @default false
   */
  readFromCallback?: boolean;
  /**
   * Read ifc file incrementally, use instead of passing {@link bytes}
   */
  readCallback?: ModelLoadCallback;
  raw?: boolean;
  progressCallback?: (progress: number, data: ProgressData) => void;
}
