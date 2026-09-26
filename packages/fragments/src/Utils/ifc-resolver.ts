import * as webIfc from "web-ifc";
import { IfcLineIndex, IfcLineIndexBuilder } from "./ifc-index";
import {
  buildEntity,
  entityFactories,
  entityFactory,
  parseFileSchema,
  RawFactory,
  StepArgument,
} from "./ifc-parsing-utils";
import { IfcStatementScanner } from "./ifc-scanner";
import { streamAsyncIterator } from "./ifc-stream";

// ---------------------------------------------------------------------------
// On-demand reference resolution
// ---------------------------------------------------------------------------
// A `#N` handle is resolved by slicing statement N out of the source and
// parsing just that, rather than by keeping every entity in memory. Resolution
// is lazy — reading `.ref` is what triggers it — so following one chain costs
// only the entities on it, and an entity nobody asks about is never built.
//
// Parsed entities are cached by id, which both keeps a hot entity (an
// IFCCARTESIANPOINT referenced hundreds of times) from being re-parsed and
// makes reference cycles safe: a cycle resolves to the same object rather than
// recursing.
// ---------------------------------------------------------------------------

/** Chunk size used when scanning a resident buffer. */
const scanChunkSize = 64 * 1024;

/** A `{ type: REF, value: id }` handle with lazy access to its target. */
export interface ResolvedRef {
  type: number;
  value: number;
  /** The entity `value` points at, or `undefined` if the file defines none. */
  readonly ref: webIfc.IfcLineObject | undefined;
}

const isRef = (
  item: StepArgument,
): item is { type: number; value: number } & Record<string, unknown> =>
  item !== null &&
  !Array.isArray(item) &&
  item.type === webIfc.REF &&
  typeof item.value === "number";

/**
 * Resolves `#N` handles against an indexed, in-memory IFC file.
 *
 * The whole source must be resident: `.ref` is a plain property read, so it
 * cannot await a `Blob` slice or a file handle. Index a buffer with
 * {@link IfcEntityResolver.fromBytes}.
 *
 * @example
 * ```ts
 * const resolver = await IfcEntityResolver.fromBytes(bytes);
 * const wall = resolver.get(42);
 * // nothing else has been parsed yet
 * const placement = wall?.ObjectPlacement.ref;
 * ```
 */
export class IfcEntityResolver {
  readonly index: IfcLineIndex;

  private readonly _source: Uint8Array;
  private readonly _factories: readonly (RawFactory | undefined)[];
  private readonly _decoder: TextDecoder;
  private readonly _cache = new Map<number, webIfc.IfcLineObject | undefined>();

  constructor({
    source,
    index,
    factories,
    encoding = "utf-8",
  }: {
    source: Uint8Array;
    index: IfcLineIndex;
    factories: Record<number, RawFactory>;
    encoding?: string;
  }) {
    this._source = source;
    this.index = index;
    // Narrowed to the types the file contains and keyed by the index's
    // interned code, so `get` finds a factory by array lookup instead of
    // resolving the type name against web-ifc on every call.
    this._factories = index.typeNames.map((type) =>
      entityFactory(type, factories),
    );
    this._decoder = new TextDecoder(encoding);
  }

  /**
   * Scan `bytes` once to locate every statement and read the declared schema,
   * without parsing any entity.
   *
   * @throws if the file declares no schema, or one web-ifc does not know.
   */
  static async fromBytes(
    bytes: Uint8Array,
    encoding = "utf-8",
  ): Promise<IfcEntityResolver> {
    // Fed in chunks, not as one buffer: a single transform call that enqueues
    // every statement at once builds the whole readable queue in one tick,
    // which measures ~30x slower than letting the reader interleave.
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < bytes.length; i += scanChunkSize) {
          controller.enqueue(bytes.subarray(i, i + scanChunkSize));
        }
        controller.close();
      },
    });

    const decoder = new TextDecoder(encoding);
    const builder = new IfcLineIndexBuilder();
    let schema: string | null = null;

    for await (const statement of streamAsyncIterator(
      source.pipeThrough(new IfcStatementScanner()),
    )) {
      if (statement.id) {
        builder.add(statement);
      } else if (!schema) {
        const raw = decoder.decode(statement.bytes).slice(0, -1).trim();
        if (raw.startsWith("FILE_SCHEMA")) schema = parseFileSchema(raw);
      }
    }

    if (!schema) throw new Error("Ifc schema not found");
    const factories = entityFactories(schema);
    if (!factories) {
      throw new Error(`Ifc schema '${schema}' not found`);
    }

    return new IfcEntityResolver({
      source: bytes,
      index: builder.finalize(),
      factories,
      encoding,
    });
  }

  /**
   * The entity `id` names, parsed on first request and cached after.
   *
   * `undefined` when the file defines no such statement — a dangling `#N` — or
   * when its type is outside the declared schema.
   *
   * @throws if the statement's arguments are malformed.
   */
  get(id: number): webIfc.IfcLineObject | undefined {
    const cached = this._cache.get(id);
    if (cached !== undefined || this._cache.has(id)) return cached;

    // A dangling id, or a type with no factory: nothing to build, so the
    // statement is never even decoded.
    const at = this.index.indexOf(id);
    const factory =
      at === -1 ? undefined : this._factories[this.index.typeCodeAt(at)];
    if (!factory) {
      this._cache.set(id, undefined);
      return undefined;
    }

    const offset = this.index.offsetAt(at);
    const raw = this._decoder
      .decode(this._source.subarray(offset, offset + this.index.lengthAt(at)))
      .slice(0, -1)
      .trim();

    let entity: webIfc.IfcLineObject;
    try {
      entity = buildEntity({ raw, id, factory });
    } catch (err) {
      throw new Error(`Corrupted Ifc statement: ${raw}`, { cause: err });
    }

    // Cache before attaching, so a cycle back to this id finds the entity
    // already here instead of recursing into it.
    this._cache.set(id, entity);
    this.attach(entity);
    return entity;
  }

  /**
   * Give every `#N` handle in `entity` a lazy `ref` accessor. Applied by
   * {@link get}; call it yourself for an entity parsed elsewhere.
   */
  attach(entity: webIfc.IfcLineObject): void {
    for (const key of Object.keys(entity)) {
      if (key === "expressID" || key === "type") continue;
      this._attachTo(entity as unknown as Record<string, StepArgument>, key);
    }
  }

  private _attachTo(owner: Record<string, StepArgument>, key: string): void {
    const item = owner[key];
    if (Array.isArray(item)) {
      for (let i = 0; i < item.length; i++) {
        this._attachTo(item as unknown as Record<string, StepArgument>, `${i}`);
      }
      return;
    }
    // Typed values (IFCLABEL(...) and friends) are never descended into: IFC
    // defined types sit on simple types, so they hold no entity references,
    // and web-ifc's own constructors unwrap them to bare primitives anyway.
    if (!isRef(item) || "ref" in item) return;

    const id = item.value;
    const resolver = this;
    Object.defineProperty(item, "ref", {
      enumerable: false, // keeps GetLine-shaped equality checks intact
      configurable: true,
      get() {
        return resolver.get(id);
      },
    });
  }
}
