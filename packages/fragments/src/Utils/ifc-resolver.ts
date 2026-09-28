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
import {
  byteSourceStream,
  IfcByteSource,
  IfcBytesSource,
} from "./ifc-byte-source";

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

/** Chunk size used when scanning through an {@link IfcByteSource}. */
const scanChunkSize = 64 * 1024;

/** Bytes between two scan progress reports. */
const progressStep = 16 * 1024 * 1024;

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
 * Resolves `#N` handles against an indexed IFC file.
 *
 * `.ref` is a plain property read, so it cannot await: the source is read
 * through a synchronous {@link IfcByteSource}. That is either a resident buffer
 * ({@link IfcEntityResolver.fromBytes}) or, in a worker, a `File` read with
 * `FileReaderSync` ({@link IfcEntityResolver.fromSource} with an
 * `IfcBlobSource`), which never holds the file in memory.
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

  /** The schema named by the file's `FILE_SCHEMA`, e.g. `IFC4`. */
  readonly schema: string;

  /**
   * Raw text of the header statements (`FILE_DESCRIPTION`, `FILE_NAME`,
   * `FILE_SCHEMA`), keyed by keyword, without the trailing `;`.
   */
  readonly header: ReadonlyMap<string, string>;

  private readonly _source: IfcByteSource;
  private readonly _factories: readonly (RawFactory | undefined)[];
  private readonly _decoder: TextDecoder;
  private readonly _cache = new Map<number, webIfc.IfcLineObject | undefined>();

  constructor({
    source,
    index,
    factories,
    schema = "",
    header = new Map(),
    encoding = "utf-8",
  }: {
    source: Uint8Array | IfcByteSource;
    index: IfcLineIndex;
    factories: Record<number, RawFactory>;
    schema?: string;
    header?: ReadonlyMap<string, string>;
    encoding?: string;
  }) {
    this._source =
      source instanceof Uint8Array ? new IfcBytesSource(source) : source;
    this.index = index;
    this.schema = schema;
    this.header = header;
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
    return IfcEntityResolver.fromSource(new IfcBytesSource(bytes), {
      encoding,
    });
  }

  /**
   * Scan `source` once to locate every statement and read the declared
   * schema, without parsing any entity. Entities are read back through
   * `source` on demand.
   *
   * @param options.stream The same bytes as a stream, when one is cheaper to
   * scan than chunked reads of `source` — `blob.stream()` for a `Blob`.
   * @param options.onProgress Called with the number of bytes scanned so far.
   * @throws if the file declares no schema, or one web-ifc does not know.
   */
  static async fromSource(
    source: IfcByteSource,
    {
      stream,
      encoding = "utf-8",
      onProgress,
    }: {
      stream?: ReadableStream<Uint8Array>;
      encoding?: string;
      onProgress?: (bytesScanned: number) => void;
    } = {},
  ): Promise<IfcEntityResolver> {
    // Fed in chunks, not as one buffer: a single transform call that enqueues
    // every statement at once builds the whole readable queue in one tick,
    // which measures ~30x slower than letting the reader interleave.
    const bytes = stream ?? byteSourceStream(source, scanChunkSize);

    const decoder = new TextDecoder(encoding);
    const builder = new IfcLineIndexBuilder();
    const header = new Map<string, string>();
    let inHeader = true;
    let reported = 0;

    for await (const statement of streamAsyncIterator(
      bytes.pipeThrough(new IfcStatementScanner()),
    )) {
      if (statement.id) {
        builder.add(statement);
        if (onProgress && statement.offset - reported > progressStep) {
          reported = statement.offset;
          onProgress(reported);
        }
      } else if (inHeader) {
        const raw = decoder.decode(statement.bytes).slice(0, -1).trim();
        if (raw === "DATA") inHeader = false;
        const keyword = /^[A-Z_]+/.exec(raw)?.[0];
        if (keyword && raw.length > keyword.length) header.set(keyword, raw);
      }
    }

    const fileSchema = header.get("FILE_SCHEMA");
    const schema = fileSchema ? parseFileSchema(fileSchema) : null;
    if (!schema) throw new Error("Ifc schema not found");
    const factories = entityFactories(schema);
    if (!factories) {
      throw new Error(`Ifc schema '${schema}' not found`);
    }

    return new IfcEntityResolver({
      source,
      index: builder.finalize(),
      factories,
      schema,
      header,
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

    const entity = this.parse(id);
    // Cache before attaching, so a cycle back to this id finds the entity
    // already here instead of recursing into it.
    this._cache.set(id, entity);
    if (entity) this.attach(entity);
    return entity;
  }

  /**
   * The entity `id` names, parsed fresh from the source: uncached, and with
   * bare `{ type: REF, value }` handles and no `.ref` accessors, exactly like
   * `IfcAPI.GetLine`. For sweeps that visit each entity once, where a cache
   * would only end up holding the whole file.
   *
   * `undefined` when the file defines no such statement, or when its type is
   * outside the declared schema.
   *
   * @throws if the statement's arguments are malformed.
   */
  parse(id: number): webIfc.IfcLineObject | undefined {
    // A dangling id, or a type with no factory: nothing to build, so the
    // statement is never even decoded.
    const at = this.index.indexOf(id);
    const factory =
      at === -1 ? undefined : this._factories[this.index.typeCodeAt(at)];
    if (!factory) return undefined;

    const raw = this.readStatement(at);
    try {
      return buildEntity({ raw, id, factory });
    } catch (err) {
      throw new Error(`Corrupted Ifc statement: ${raw}`, { cause: err });
    }
  }

  /**
   * The text of the statement at index position `at`, without its trailing
   * `;` — for callers that only need a field or two and can skip building
   * the entity.
   */
  readStatement(at: number): string {
    const bytes = this._source.read(
      this.index.offsetAt(at),
      this.index.lengthAt(at),
    );
    return this._decoder.decode(bytes).slice(0, -1).trim();
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
