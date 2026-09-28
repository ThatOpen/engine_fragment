/* eslint-disable max-classes-per-file */
// ---------------------------------------------------------------------------
// Synchronous random access to an IFC file's bytes
// ---------------------------------------------------------------------------
// web-ifc reads its input through a synchronous `(offset, size) => bytes`
// callback, and `.ref` on a resolved entity is a plain property read, so both
// need a reader that answers without awaiting. One reader serves both, which
// is what lets a worker convert a `File` without ever holding it in memory:
// `FileReaderSync` reads a slice of a disk-backed `File` synchronously.
// ---------------------------------------------------------------------------

/**
 * Synchronous, random-access reader over an IFC file.
 *
 * Bound as `(offset, size) => source.read(offset, size)` it is a web-ifc
 * `ModelLoadCallback`.
 */
export interface IfcByteSource {
  /** Total size of the file in bytes. */
  readonly size: number;
  /**
   * The bytes in `[offset, offset + length)`, clamped to the end of the file,
   * so the result is shorter than `length` only at the end and empty past it.
   *
   * May be a view into memory the source reuses: it is only valid until the
   * next `read`. Copy it to keep it.
   */
  read(offset: number, length: number): Uint8Array;
}

/** `FileReaderSync` lives in the worker lib, which the library does not load. */
interface SyncBlobReader {
  readAsArrayBuffer(blob: Blob): ArrayBuffer;
}

/** An {@link IfcByteSource} over bytes already in memory. */
export class IfcBytesSource implements IfcByteSource {
  constructor(private readonly _bytes: Uint8Array) {}

  get size() {
    return this._bytes.length;
  }

  read(offset: number, length: number) {
    return this._bytes.subarray(offset, offset + length);
  }
}

/**
 * An {@link IfcByteSource} over bytes held in memory as several buffers, for
 * files larger than one `ArrayBuffer` may be (browsers cap a single read of a
 * `Blob` at 2 GB).
 */
export class IfcChunkedBytesSource implements IfcByteSource {
  private _scratch = new Uint8Array(0);
  readonly size: number;

  constructor(
    private readonly _chunks: Uint8Array[],
    private readonly _chunkSize: number,
  ) {
    this.size = _chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  }

  /** Reads all of `blob` into memory, `chunkSize` bytes per buffer. */
  static async read(blob: Blob, chunkSize = 256 * 1024 * 1024) {
    const chunks: Uint8Array[] = [];
    for (let offset = 0; offset < blob.size; offset += chunkSize) {
      const slice = blob.slice(offset, offset + chunkSize);
      chunks.push(new Uint8Array(await slice.arrayBuffer()));
    }
    return new IfcChunkedBytesSource(chunks, chunkSize);
  }

  read(offset: number, length: number): Uint8Array {
    const end = Math.min(offset + length, this.size);
    if (end <= offset) return new Uint8Array(0);
    const first = Math.floor(offset / this._chunkSize);
    const last = Math.floor((end - 1) / this._chunkSize);
    if (first === last) {
      const start = offset - first * this._chunkSize;
      return this._chunks[first].subarray(start, start + end - offset);
    }
    if (this._scratch.length < end - offset) {
      this._scratch = new Uint8Array(end - offset);
    }
    const out = this._scratch.subarray(0, end - offset);
    let written = 0;
    for (let c = first; c <= last; c++) {
      const from = c === first ? offset - c * this._chunkSize : 0;
      const to = Math.min(this._chunkSize, end - c * this._chunkSize);
      out.set(this._chunks[c].subarray(from, to), written);
      written += to - from;
    }
    return out;
  }
}

/**
 * An {@link IfcByteSource} over a `Blob` (a `File` from an upload, typically),
 * read synchronously with `FileReaderSync`, so it only works in a worker.
 *
 * Reads go through a small LRU cache of fixed-size pages: a statement is a few
 * hundred bytes, and a `FileReaderSync` call costs far more than copying a
 * page, so neighbouring reads should hit memory rather than the file.
 */
export class IfcBlobSource implements IfcByteSource {
  private readonly _reader: SyncBlobReader;
  private readonly _pageSize: number;
  private readonly _maxPages: number;
  // Map iteration order is insertion order, which makes it an LRU for free:
  // a hit is deleted and re-inserted, and eviction takes the first key.
  private readonly _pages = new Map<number, Uint8Array>();
  private _scratch = new Uint8Array(0);

  /** Number of `FileReaderSync` reads made so far. */
  fileReads = 0;

  constructor(
    private readonly _blob: Blob,
    {
      pageSize = 4 * 1024 * 1024,
      cacheBytes = 128 * 1024 * 1024,
    }: { pageSize?: number; cacheBytes?: number } = {},
  ) {
    const Reader = (globalThis as any).FileReaderSync;
    if (!Reader) {
      throw new Error("IfcBlobSource needs FileReaderSync: run it in a worker");
    }
    this._reader = new Reader();
    this._pageSize = pageSize;
    this._maxPages = Math.max(1, Math.floor(cacheBytes / pageSize));
  }

  get size() {
    return this._blob.size;
  }

  read(offset: number, length: number): Uint8Array {
    const end = Math.min(offset + length, this._blob.size);
    if (end <= offset) return new Uint8Array(0);

    const first = Math.floor(offset / this._pageSize);
    const last = Math.floor((end - 1) / this._pageSize);
    if (first === last) {
      const start = offset - first * this._pageSize;
      return this._page(first).subarray(start, start + end - offset);
    }

    // Straddles pages: assemble into scratch, which the contract lets us
    // reuse on the next read.
    if (this._scratch.length < end - offset) {
      this._scratch = new Uint8Array(end - offset);
    }
    const out = this._scratch.subarray(0, end - offset);
    let written = 0;
    for (let p = first; p <= last; p++) {
      const page = this._page(p);
      const from = p === first ? offset - p * this._pageSize : 0;
      const to = Math.min(page.length, end - p * this._pageSize);
      out.set(page.subarray(from, to), written);
      written += to - from;
    }
    return out;
  }

  /** Drop every cached page. */
  clear() {
    this._pages.clear();
    this._scratch = new Uint8Array(0);
  }

  private _page(index: number): Uint8Array {
    const cached = this._pages.get(index);
    if (cached) {
      this._pages.delete(index);
      this._pages.set(index, cached);
      return cached;
    }
    const start = index * this._pageSize;
    const slice = this._blob.slice(start, start + this._pageSize);
    const page = new Uint8Array(this._reader.readAsArrayBuffer(slice));
    this.fileReads++;
    if (this._pages.size >= this._maxPages) {
      this._pages.delete(this._pages.keys().next().value!);
    }
    this._pages.set(index, page);
    return page;
  }
}

/**
 * Chunks of `source`, in order, as a byte stream — for feeding
 * {@link IfcStatementScanner} from a reader rather than a `Blob`.
 */
export function byteSourceStream(
  source: IfcByteSource,
  chunkSize = 1024 * 1024,
): ReadableStream<Uint8Array> {
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= source.size) {
        controller.close();
        return;
      }
      // copied: the scanner may hold a view into a chunk past the next read
      const chunk = source.read(offset, chunkSize).slice();
      offset += chunk.length;
      controller.enqueue(chunk);
    },
  });
}
