// ---------------------------------------------------------------------------
// Byte-domain ISO 10303-21 statement scanner
// ---------------------------------------------------------------------------
// Every STEP delimiter — `#`, `=`, `;`, `'`, `(`, `/`, `*` — is ASCII, and
// UTF-8 is self-synchronising (every byte of a multi-byte sequence is >= 0x80),
// so statement boundaries, express ids and type names can all be found without
// decoding anything. That is what makes a byte-offset index possible: a decoded
// string has no idea where it came from in the file.
//
// The scanner never accumulates a statement that fits inside one chunk — it
// hands out a view into the caller's chunk — so it holds no more than the
// largest statement that happens to straddle a chunk boundary.
//
// The input must be ASCII-compatible (ASCII, UTF-8, Latin-1). UTF-16 would
// break every assumption here, which is why this takes bytes rather than the
// `encoding` a `TextDecoder` would accept.
// ---------------------------------------------------------------------------

/** A statement located in the byte stream. */
export interface StatementRef {
  /** Absolute byte offset of the statement's first non-blank byte. */
  offset: number;
  /** Byte length, through and including the terminating `;`. */
  length: number;
  /** Express id, or 0 when the statement has no `#N=TYPE` prefix. */
  id: number;
  /** Entity type name, or `""` when the statement has no `#N=TYPE` prefix. */
  type: string;
  /**
   * The statement's raw bytes, `;` included.
   *
   * A view into the chunk it was found in whenever the statement fits inside
   * one — which is almost always — and a private copy only when it straddles a
   * chunk boundary. So it stays valid for as long as the producing chunk does,
   * and must not be held past that: copy it if you need to keep it, or record
   * {@link offset}/{@link length} and slice the source later.
   */
  bytes: Uint8Array;
}

// A statement longer than this is not line-oriented IFC — bail out instead of
// growing the carry buffer without bound.
const maxStatementLength = 64 * 1024 * 1024;

// Prefix states, walked one byte at a time so a statement may straddle chunks.
const PHASE_NONE = 0; // between statements
const PHASE_ID = 1; // reading digits after "#"
const PHASE_AFTER_ID = 2; // blanks between the id and "="
const PHASE_AFTER_EQ = 3; // blanks between "=" and the type name
const PHASE_TYPE = 4; // reading the type name
const PHASE_BODY = 5; // prefix resolved, or never present

/**
 * Receives each statement {@link IfcStatementCursor} finds, as positional
 * arguments so that scanning a large file allocates nothing per statement.
 *
 * `chunk`/`start` locate the statement's bytes when it lies wholly inside the
 * chunk being written (`start >= 0`); otherwise, when the cursor keeps bytes,
 * they are in `carry` instead.
 */
export type StatementSink = (
  offset: number,
  length: number,
  id: number,
  type: string,
  chunk: Uint8Array,
  start: number,
  carry: Uint8Array | null,
) => void;

/**
 * The byte loop behind {@link IfcStatementScanner}, usable synchronously:
 * `write` the file's bytes in order, in chunks of any size, and it calls the
 * sink once per statement.
 */
export class IfcStatementCursor {
  // Absolute offset of the current chunk's first byte.
  private _baseOffset = 0;
  // Absolute offset of the open statement, -1 when between statements.
  private _stmtStart = -1;
  // Where the open statement starts inside the current chunk, -1 when it
  // began in an earlier one (and so already lives in `carry`).
  private _stmtStartInChunk = -1;

  private _carry = new Uint8Array(0);
  private _carryUsed = 0;
  // How much of an open statement has been scanned, when bytes aren't kept
  private _carriedLength = 0;

  private _inString = false;
  private _inComment = false;
  // `/*` and `*/` are two bytes and may straddle a chunk, so the first half
  // is remembered rather than looked ahead for.
  private _sawSlash = false;
  private _sawStar = false;
  // Whether the pending "/" is what opened the current statement — if it
  // turns out to open a comment instead, the statement un-starts.
  private _slashOpened = false;

  private _phase = PHASE_NONE;
  private _id = 0;
  private readonly _typeBytes: number[] = [];
  private _typeHash = 0;
  // Type names are interned by a hash of their bytes, taken while scanning,
  // so a file's millions of statements share a few hundred strings.
  private readonly _types = new Map<number, string>();

  /**
   * @param keepBytes Whether to assemble the bytes of statements that
   * straddle chunks. Without it, the sink gets offsets and lengths only for
   * those, which is all an index needs.
   */
  constructor(private readonly _keepBytes = true) {}

  /** Whether a statement is open: the input so far stops mid-statement. */
  get open() {
    return this._stmtStart !== -1;
  }

  private appendCarry(chunk: Uint8Array, from: number, to: number) {
    const extra = to - from;
    if (extra <= 0) return;
    if (!this._keepBytes) {
      this._carriedLength += extra;
      return;
    }
    const needed = this._carryUsed + extra;
    if (needed > this._carry.length) {
      const grown = new Uint8Array(
        Math.max(this._carry.length * 2, needed, 4 * 1024),
      );
      grown.set(this._carry.subarray(0, this._carryUsed));
      this._carry = grown;
    }
    this._carry.set(chunk.subarray(from, to), this._carryUsed);
    this._carryUsed = needed;
  }

  private typeName() {
    const bytes = this._typeBytes;
    const cached = this._types.get(this._typeHash);
    if (cached !== undefined && cached.length === bytes.length) {
      let same = true;
      for (let i = 0; i < bytes.length && same; i++) {
        same = cached.charCodeAt(i) === bytes[i];
      }
      if (same) return cached;
    }
    const name = String.fromCharCode(...bytes);
    if (cached === undefined) this._types.set(this._typeHash, name);
    return name;
  }

  /**
   * Scan the next chunk of the file.
   *
   * @throws when a statement grows past the maximum length.
   */
  write(chunk: Uint8Array, sink: StatementSink) {
    // The hot loop works on locals, written back when it ends: field access
    // per byte measurably slows a scan of hundreds of megabytes.
    const baseOffset = this._baseOffset;
    let stmtStart = this._stmtStart;
    let stmtStartInChunk = this._stmtStartInChunk;
    let inString = this._inString;
    let inComment = this._inComment;
    let sawSlash = this._sawSlash;
    let sawStar = this._sawStar;
    let slashOpened = this._slashOpened;
    let phase = this._phase;
    let id = this._id;
    let typeHash = this._typeHash;
    const typeBytes = this._typeBytes;
    // (Resetting is written out inline below: a closure over these locals
    // would move them into a heap context and slow every byte down.)

    const length = chunk.length;
    for (let i = 0; i < length; i++) {
      const c = chunk[i];

      // --- comment and string bodies, which swallow everything else ---------
      if (inComment) {
        if (sawStar && c === 47) {
          // "*/"
          inComment = false;
          sawStar = false;
        } else sawStar = c === 42; // "*"
        continue;
      }
      if (inString) {
        // '' pairs toggle twice, so plain toggling tracks them correctly
        if (c === 39) inString = false;
        continue;
      }
      if (sawSlash) {
        sawSlash = false;
        if (c === 42) {
          // "/*" — a comment. If the "/" was also what opened the
          // statement, nothing of substance has been seen yet, so the
          // statement un-starts and its offset is re-taken later.
          inComment = true;
          sawStar = false;
          if (slashOpened) {
            stmtStart = -1;
            stmtStartInChunk = -1;
            this._carryUsed = 0;
            this._carriedLength = 0;
            phase = PHASE_NONE;
            id = 0;
            typeBytes.length = 0;
            typeHash = 0;
          }
          continue;
        }
        // a lone "/" was content after all — carry on and handle `c` below
      }
      if (c === 47) {
        // "/" — opens a comment only if the next byte is "*"
        slashOpened = stmtStart === -1;
        if (slashOpened) {
          stmtStart = baseOffset + i;
          stmtStartInChunk = i;
          phase = PHASE_BODY;
        }
        sawSlash = true;
        continue;
      }

      // --- statement framing ------------------------------------------------
      if (stmtStart === -1) {
        if (c <= 32) continue; // blanks between statements belong to none
        // A UTF-8 BOM is not content; left in, it would look like the first
        // byte of the first statement and shift every offset by three.
        if (baseOffset + i < 3 && (c === 0xef || c === 0xbb || c === 0xbf)) {
          continue;
        }
        if (c === 59) continue; // ";" — an empty statement, nothing to emit
        stmtStart = baseOffset + i;
        stmtStartInChunk = i;
        phase = c === 35 ? PHASE_ID : PHASE_BODY; // "#"
        if (phase === PHASE_ID) continue;
      }

      if (c === 39) {
        // "'" — opens a string
        inString = true;
        phase = PHASE_BODY;
        continue;
      }

      if (c === 59) {
        // ";" — the statement ends here
        const end = i + 1;
        let carry: Uint8Array | null = null;
        const inChunk = stmtStartInChunk >= 0 && this._carryUsed === 0;
        if (!inChunk && this._keepBytes) {
          this.appendCarry(chunk, 0, end);
          carry = this._carry.subarray(0, this._carryUsed);
        }
        // An id without a type name is not an entity statement, so the two
        // are reported together or not at all.
        const named = typeBytes.length > 0;
        this._typeHash = typeHash;
        sink(
          stmtStart,
          baseOffset + end - stmtStart,
          named ? id : 0,
          named ? this.typeName() : "",
          chunk,
          inChunk ? stmtStartInChunk : -1,
          carry,
        );
        stmtStart = -1;
        stmtStartInChunk = -1;
        this._carryUsed = 0;
        this._carriedLength = 0;
        phase = PHASE_NONE;
        id = 0;
        typeBytes.length = 0;
        typeHash = 0;
        continue;
      }

      // --- `#N=TYPE` prefix, resolved a byte at a time -----------------------
      if (phase === PHASE_BODY) {
        // Most of a file is statement bodies, where only a quote, a ";" or a
        // "/" can matter: skip straight to the next of those.
        while (i + 1 < length) {
          const next = chunk[i + 1];
          if (next === 39 || next === 59 || next === 47) break;
          i++;
        }
        continue;
      }
      if (phase === PHASE_ID) {
        if (c >= 48 && c <= 57) id = id * 10 + (c - 48);
        else if (id > 0 && c === 61)
          phase = PHASE_AFTER_EQ; // "="
        else if (id > 0 && c <= 32) phase = PHASE_AFTER_ID;
        else {
          // "#" not followed by an id: not an entity statement
          phase = PHASE_BODY;
          id = 0;
        }
      } else if (phase === PHASE_AFTER_ID) {
        if (c === 61) phase = PHASE_AFTER_EQ;
        else if (c > 32) {
          phase = PHASE_BODY;
          id = 0;
        }
      } else if (phase === PHASE_AFTER_EQ) {
        if ((c >= 65 && c <= 90) || c === 95) {
          phase = PHASE_TYPE;
          typeBytes.push(c);
          typeHash = Math.imul(typeHash ^ c, 16777619);
        } else if (c > 32) {
          phase = PHASE_BODY;
          id = 0;
        }
      } else if (phase === PHASE_TYPE) {
        if ((c >= 65 && c <= 90) || (c >= 48 && c <= 57) || c === 95) {
          typeBytes.push(c);
          typeHash = Math.imul(typeHash ^ c, 16777619);
        } else phase = PHASE_BODY;
      }
    }

    this._stmtStart = stmtStart;
    this._inString = inString;
    this._inComment = inComment;
    this._sawSlash = sawSlash;
    this._sawStar = sawStar;
    this._slashOpened = slashOpened;
    this._phase = phase;
    this._id = id;
    this._typeHash = typeHash;

    // Anything still open has to survive into the next chunk.
    if (stmtStart !== -1) {
      this.appendCarry(
        chunk,
        stmtStartInChunk >= 0 ? stmtStartInChunk : 0,
        chunk.length,
      );
      stmtStartInChunk = -1;
      if (this._carryUsed + this._carriedLength > maxStatementLength) {
        this._stmtStartInChunk = stmtStartInChunk;
        throw new Error("Ifc statement exceeds maximum length");
      }
    }
    this._stmtStartInChunk = stmtStartInChunk;
    this._baseOffset += chunk.length;
  }
}

/**
 * Splits a byte stream into ISO 10303-21 statements, reporting where each one
 * lives in the file.
 *
 * Statements may span physical lines, share a line, or be interleaved with
 * `/* ... *\/` comments and blank lines. The stream errors if the input stops
 * mid-statement, so a truncated file is not mistaken for a complete one.
 *
 * @example
 * ```ts
 * const builder = new IfcLineIndexBuilder();
 * for await (const statement of streamAsyncIterator(
 *   blob.stream().pipeThrough(new IfcStatementScanner()),
 * )) {
 *   if (statement.id) builder.add(statement);
 * }
 * const index = builder.finalize();
 * ```
 */
export class IfcStatementScanner extends TransformStream<
  Uint8Array,
  StatementRef
> {
  constructor() {
    const cursor = new IfcStatementCursor();
    super({
      transform(chunk, controller) {
        try {
          cursor.write(chunk, (offset, length, id, type, bytes, start, carry) =>
            controller.enqueue({
              offset,
              length,
              id,
              type,
              // `carry` is reused by the next statement that straddles a
              // boundary, so this has to be a copy rather than a view — the
              // consumer may not read it until long after that has happened.
              bytes:
                start >= 0 ? bytes.subarray(start, start + length) : carry!.slice(),
            }),
          );
        } catch (error) {
          controller.error(error);
        }
      },

      flush(controller) {
        // A statement left open means the input stops mid-statement: the file
        // is truncated, or it was never IFC to begin with.
        if (cursor.open) {
          controller.error(new Error("Unexpected end of Ifc stream"));
        }
      },
    });
  }
}
