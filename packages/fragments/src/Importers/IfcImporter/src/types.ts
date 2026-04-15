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
   * Read ifc file incrementally, instead of passing {@link bytes}.
   *
   * @example node.js
   * ```typescript
   * import { open } from "node:fs/promises";
   *
   * const handle = await open(filePath, "r");
   * const chunkSize = 64 * 1024; // 64KB
   * const buffer = new Uint8Array(chunkSize);
   * const readCallback: ((offset: number) => {
   *   const bytesRead = readSync(handle.fd, buffer, 0, chunkSize, offset);
   *   return buffer.slice(0, bytesRead);
   * })
   * const output = await importer.process({ readFromCallback: true, readCallback });
   * await handle.close();
   * ```
   */
  readCallback?: ModelLoadCallback;
  raw?: boolean;
  progressCallback?: (progress: number, data: ProgressData) => void;
}
