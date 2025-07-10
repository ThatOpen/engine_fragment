export interface ProgressData {
  process: "geometries" | "attributes" | "relations" | "conversion";
  state: "start" | "inProgress" | "finish";
  class?: string;
  entitiesProcessed?: number;
}

export interface ProcessData {
  id?: string;
  readFromCallback?: boolean;
  bytes?: Uint8Array;
  readCallback?: any;
  raw?: boolean;
  progressCallback?: (progress: number, data: ProgressData) => void;
}
