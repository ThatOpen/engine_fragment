import { FragmentIdMap } from "./base-types";

export class FragmentUtils {
  static combine(maps: FragmentIdMap[]) {
    if (maps.length === 0) {
      return {};
    }

    if (maps.length === 1) {
      return maps[0];
    }

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

  static intersect(maps: FragmentIdMap[]) {
    // Strategy: count all fragIDs and all IDs
    // only stay with values whose count equals the maps count

    if (maps.length === 0) {
      return {};
    }

    if (maps.length === 1) {
      return maps[0];
    }

    const visitedIDs = new Map<
      string,
      { count: number; ids: Map<number, number> }
    >();

    let mapsCount = 0;

    for (const map of maps) {
      mapsCount++;
      for (const fragID in map) {
        if (!visitedIDs.has(fragID)) {
          visitedIDs.set(fragID, {
            count: 0,
            ids: new Map(),
          });
        }

        const current = visitedIDs.get(fragID)!;
        current.count++;

        for (const id of map[fragID]) {
          const idCount = current.ids.get(id) || 0;
          current.ids.set(id, idCount + 1);
        }
      }
    }

    const result: FragmentIdMap = {};

    for (const [fragID, { count, ids }] of visitedIDs) {
      if (count !== mapsCount) {
        continue;
      }

      for (const [id, idCount] of ids) {
        if (idCount !== mapsCount) {
          continue;
        }

        if (!result[fragID]) {
          result[fragID] = new Set();
        }
        result[fragID].add(id);
      }
    }

    return result;
  }

  static copy(map: FragmentIdMap) {
    const copied: FragmentIdMap = {};
    for (const id in map) {
      copied[id] = new Set(map[id]);
    }
    return copied;
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
