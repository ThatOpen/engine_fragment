import { FragmentIdMap } from "./base-types";

export class FragmentUtils {
  static combine(maps: Iterable<FragmentIdMap>) {
    const result: FragmentIdMap = {};
    for (const map of maps) {
      for (const fragID in map) {
        if (!result[fragID]) {
          result[fragID] = new Set<number>();
        }
        for (const expressID of map[fragID]) {
          result[fragID].add(expressID);
        }
      }
    }
    return result;
  }

  static export(map: FragmentIdMap) {
    const serialized: { [fragID: string]: number[] } = {};
    for (const fragID in map) {
      serialized[fragID] = Array.from(map[fragID]);
    }
    return JSON.stringify(serialized);
  }

  static import(serializedMap: string) {
    const serialized = JSON.parse(serializedMap) as {
      [fragID: string]: number[];
    };
    const map: FragmentIdMap = {};
    for (const fragID in serialized) {
      map[fragID] = new Set(serialized[fragID]);
    }
    return map;
  }
}
