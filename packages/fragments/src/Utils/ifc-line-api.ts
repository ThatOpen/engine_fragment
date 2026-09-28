import * as webIfc from "web-ifc";
import { IfcEntityResolver } from "./ifc-resolver";
import { entityFactories, parseStepArguments } from "./ifc-parsing-utils";

// ---------------------------------------------------------------------------
// The tape-reader half of `IfcAPI`, served by the parsing layer
// ---------------------------------------------------------------------------
// The property pass reads IFC through five `IfcAPI` calls and never touches
// geometry. Serving those from an `IfcEntityResolver` removes the second
// web-ifc instance — and the second full copy of the file in WASM memory —
// without touching the pass's logic: `IfcAPI` satisfies this interface too, so
// either can be handed in.
// ---------------------------------------------------------------------------

/** A web-ifc `Vector<number>`: what `GetLineIDsWithType` returns. */
export interface IfcIdVector extends Iterable<number> {
  size(): number;
  get(index: number): number;
}

/**
 * The read-only, tape-reading subset of web-ifc's `IfcAPI`. Model ids are
 * accepted for compatibility and ignored by the resolver-backed
 * implementation, which serves exactly one file.
 */
export interface IfcLineApi {
  GetLine(modelID: number, expressID: number): any;
  GetLineIDsWithType(modelID: number, type: number): IfcIdVector;
  GetAllTypesOfModel(modelID: number): { typeID: number; typeName: string }[];
  GetModelSchema(modelID: number): string;
  GetHeaderLine(modelID: number, headerType: number): any;
}

const headerKeywords = [
  "FILE_DESCRIPTION",
  "FILE_NAME",
  "FILE_SCHEMA",
] as const;

class IdVector implements IfcIdVector {
  constructor(private readonly _ids: Uint32Array) {}

  size() {
    return this._ids.length;
  }

  get(index: number) {
    return this._ids[index];
  }

  [Symbol.iterator]() {
    return this._ids[Symbol.iterator]();
  }
}

/** {@link IfcLineApi} over an {@link IfcEntityResolver}. */
export class IfcResolverLineApi implements IfcLineApi {
  // web-ifc type code -> ids of that type, ascending. Built in one sweep of
  // the index on first use, since the property pass asks once per class and
  // a sweep per class would cost classes x statements.
  private _byType: Map<number, Uint32Array> | null = null;
  private readonly _typeNames = new Map<number, string>();

  constructor(readonly resolver: IfcEntityResolver) {}

  GetLine(_modelID: number, expressID: number) {
    return this.resolver.parse(expressID);
  }

  GetLineIDsWithType(_modelID: number, type: number): IfcIdVector {
    return new IdVector(this._types().get(type) ?? new Uint32Array(0));
  }

  /**
   * Like `IfcAPI.GetAllTypesOfModel`, except `typeName` is the STEP name
   * (`IFCWALL`) rather than web-ifc's `IfcWall`, which only the WASM module
   * knows.
   */
  GetAllTypesOfModel(_modelID: number) {
    // Ascending type code: the order `IfcAPI.GetAllTypesOfModel` produces,
    // which the importer's output order follows.
    return [...this._types().keys()]
      .sort((a, b) => a - b)
      .map((typeID) => ({
        typeID,
        typeName: this._typeNames.get(typeID)!,
      }));
  }

  GetModelSchema(_modelID: number) {
    return this.resolver.schema;
  }

  GetHeaderLine(_modelID: number, headerType: number) {
    const keyword = headerKeywords.find(
      (name) => (webIfc as Record<string, unknown>)[name] === headerType,
    );
    const raw = keyword && this.resolver.header.get(keyword);
    if (!raw) return undefined;
    return {
      ID: 0,
      type: headerType,
      arguments: parseStepArguments(raw),
    };
  }

  private _types(): Map<number, Uint32Array> {
    if (this._byType) return this._byType;
    const { index } = this.resolver;

    // interned index code -> web-ifc type code, for the types the schema
    // defines (what `GetAllTypesOfModel` enumerates)
    const factories = entityFactories(this.resolver.schema) ?? {};
    const typeCodes = index.typeNames.map((name) => {
      const code = (webIfc as Record<string, unknown>)[name];
      return typeof code === "number" && factories[code] ? code : -1;
    });

    // Counting sort: size every bucket, then fill in index (= id) order, so
    // each bucket comes out ascending without a sort.
    const counts = new Uint32Array(typeCodes.length);
    for (let i = 0; i < index.count; i++) counts[index.typeCodeAt(i)]++;
    const buckets = new Map<number, Uint32Array>();
    const fill = new Uint32Array(typeCodes.length);
    for (let code = 0; code < typeCodes.length; code++) {
      if (typeCodes[code] === -1 || counts[code] === 0) continue;
      buckets.set(code, new Uint32Array(counts[code]));
      this._typeNames.set(typeCodes[code], index.typeNames[code]);
    }
    for (let i = 0; i < index.count; i++) {
      const code = index.typeCodeAt(i);
      const bucket = buckets.get(code);
      if (bucket) bucket[fill[code]++] = index.idAt(i);
    }

    this._byType = new Map();
    for (const [code, ids] of buckets) this._byType.set(typeCodes[code], ids);
    return this._byType;
  }
}
