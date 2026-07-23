// ---------------------------------------------------------------------------
// Parse helpers — manual charCode-based extractors for speed on 37M+ lines
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// STEP argument tokenizer — produces web-ifc's raw tape shape, so the result
// can be fed straight into webIfc.FromRawLineData (the registry GetLine uses).
// Token type codes come from web-ifc's exported constants; verified against
// web-ifc's own GetRawLineData output:
//   - `$` (omitted)      → null
//   - `*` (derived)      → no slot at all
//   - `'text'`           → { type: STRING, value: <decoded text> }
//   - `.ENUM.`           → { type: ENUM, value: name }, `.T.`/`.F.`/`.U.`
//                          become true / false / undefined
//   - `1.5`, `"00FF"`    → { type: REAL, value: <raw literal text> }
//   - `42`               → { type: INTEGER, value: number }
//   - `#123`             → { type: REF, value: expressID }
//   - `IFCLABEL('x')`    → { type: LABEL, typecode, value: <inner primitive> }
//   - `( ... )`          → StepArgument[]
// ---------------------------------------------------------------------------
import * as webIfc from "web-ifc";

export interface LineMeta {
  id: number;
  type: string;
}

export function extractLineMeta(raw: string): LineMeta | null {
  if (raw.charCodeAt(0) !== 35) return null; // '#'
  let id = 0;
  let i = 1;
  while (i < raw.length) {
    const c = raw.charCodeAt(i);
    if (c >= 48 && c <= 57) {
      id = id * 10 + (c - 48);
      i++;
    } else break;
  }
  if (id === 0) return null;
  while (i < raw.length && raw.charCodeAt(i) <= 32) i++;
  if (raw.charCodeAt(i) !== 61) return null; // '='
  i++;
  while (i < raw.length && raw.charCodeAt(i) <= 32) i++;
  const ts = i;
  while (i < raw.length) {
    const c = raw.charCodeAt(i);
    if ((c >= 65 && c <= 90) || (c >= 48 && c <= 57) || c === 95) i++;
    else break;
  }
  if (i === ts) return null;
  return { id, type: raw.substring(ts, i) };
}

export function extractRefs(raw: string, skipId?: number): number[] {
  const refs: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    if (raw.charCodeAt(i) === 35) {
      // '#'
      let id = 0;
      i++;
      while (i < raw.length) {
        const c = raw.charCodeAt(i);
        if (c >= 48 && c <= 57) {
          id = id * 10 + (c - 48);
          i++;
        } else break;
      }
      if (id > 0 && id !== skipId) refs.push(id);
      i--; // outer loop will i++
    }
  }
  return refs;
}

export function splitIfcArgs(s: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let inStr = false;
  let current = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "'" && !inStr) {
      inStr = true;
      current += ch;
    } else if (ch === "'" && inStr) {
      inStr = false;
      current += ch;
    } else if (inStr) {
      current += ch;
    } else if (ch === "(") {
      depth++;
      current += ch;
    } else if (ch === ")") {
      depth--;
      current += ch;
    } else if (ch === "," && depth === 0) {
      args.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

export function parseHashRef(s: string): number | null {
  const m = s.trim().match(/^#(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

export function extractArgsString(raw: string | undefined): string | null {
  if (!raw) return null;
  const idx = raw.indexOf("(");
  if (idx < 0) return null;
  const lastParen = raw.lastIndexOf(")");
  if (lastParen < 0) return null;
  return raw.substring(idx + 1, lastParen);
}

const { STRING, LABEL, ENUM, REAL, REF, INTEGER } = webIfc;

export type StepArgument =
  | null
  | StepArgument[]
  | {
      type: number;
      value?: string | number | boolean | StepArgument[];
      typecode?: number;
    };

/** Decode a raw STEP string body: `''`, `\\`, `\S\c`, `\X\hh`, `\X2\…\X0\`. */
export function decodeStepString(raw: string): string {
  if (raw.indexOf("'") === -1 && raw.indexOf("\\") === -1) return raw;
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    if (c === 39) {
      // '' — escaped quote
      out += "'";
      i++;
    } else if (c === 92) {
      // "\"
      const next = raw[i + 1];
      if (next === "\\") {
        out += "\\";
        i++;
      } else if (next === "S" && raw[i + 2] === "\\") {
        // \S\c — ISO 8859 upper half
        out += String.fromCharCode(raw.charCodeAt(i + 3) + 0x80);
        i += 3;
      } else if (next === "P" && raw[i + 3] === "\\") {
        // \PA\ — codepage directive; consumed, \S\ decodes as ISO 8859-1
        i += 3;
      } else if (next === "X" && raw[i + 2] === "\\") {
        // \X\hh — single ISO 8859-1 byte
        out += String.fromCharCode(parseInt(raw.substr(i + 3, 2), 16));
        i += 4;
      } else if (next === "X" && (raw[i + 2] === "2" || raw[i + 2] === "4")) {
        // \X2\hhhh…\X0\ (UTF-16 units) or \X4\hhhhhhhh…\X0\ (code points)
        const width = raw[i + 2] === "2" ? 4 : 8;
        const close = raw.indexOf("\\X0\\", i + 4);
        const hex = raw.substring(i + 4, close === -1 ? raw.length : close);
        for (let k = 0; k + width <= hex.length; k += width) {
          const code = parseInt(hex.substr(k, width), 16);
          out +=
            width === 4
              ? String.fromCharCode(code)
              : String.fromCodePoint(code);
        }
        i = close === -1 ? raw.length : close + 3;
      } else {
        out += raw[i];
      }
    } else {
      out += raw[i];
    }
  }
  return out;
}

function parseError(src: string, pos: number, reason: string): Error {
  return new Error(
    `Invalid Ifc argument at position ${pos} (${reason}): ${src.slice(Math.max(0, pos - 20), pos + 20)}`,
  );
}

/** Recursive descent through a STEP token stream. */
function parseList(
  src: string,
  pos: number,
  end: number,
): { items: StepArgument[]; pos: number } {
  const items: StepArgument[] = [];

  while (pos < end) {
    // skip whitespace, commas, and /* */ comments between tokens
    while (pos < end) {
      const c = src.charCodeAt(pos);
      if (c === 44 || c <= 32) {
        // "," or whitespace
        pos++;
      } else if (c === 47 && src.charCodeAt(pos + 1) === 42) {
        // "/*"
        const close = src.indexOf("*/", pos + 2);
        if (close === -1 || close >= end) {
          throw parseError(src, pos, "unterminated comment");
        }
        pos = close + 2;
      } else break;
    }
    if (pos >= end) break;

    const c = src.charCodeAt(pos);

    // end of the enclosing list — the caller consumes the ")"
    if (c === 41) break;

    if (c === 36) {
      // "$" — omitted attribute: null, like web-ifc's tape
      items.push(null);
      pos++;
    } else if (c === 42) {
      // "*" — derived attribute: web-ifc emits no slot for it
      pos++;
    } else if (c === 35) {
      // "#" — entity reference
      pos++;
      const digitsStart = pos;
      let id = 0;
      while (pos < end) {
        const d = src.charCodeAt(pos);
        if (d >= 48 && d <= 57) {
          id = id * 10 + (d - 48);
          pos++;
        } else break;
      }
      if (pos === digitsStart)
        throw parseError(src, pos, "expected digits after '#'");
      items.push({ type: REF, value: id });
    } else if (c === 46) {
      // "." — enum: .SOMEVALUE.
      pos++;
      const nameStart = pos;
      while (pos < end && src.charCodeAt(pos) !== 46) pos++;
      if (pos >= end) throw parseError(src, nameStart, "unterminated enum");
      const name = src.substring(nameStart, pos);
      pos++; // consume closing "."
      if (name === "T") items.push({ type: ENUM, value: true });
      else if (name === "F") items.push({ type: ENUM, value: false });
      else if (name === "U") items.push({ type: ENUM, value: undefined });
      else items.push({ type: ENUM, value: name });
    } else if (c === 39) {
      // "'" — string; find the closing quote, treating '' as an escape
      pos++;
      let i = pos;
      while (i < end) {
        if (src.charCodeAt(i) === 39) {
          if (src.charCodeAt(i + 1) === 39 && i + 1 < end) i += 2;
          else break;
        } else i++;
      }
      if (i >= end) throw parseError(src, pos, "unterminated string");
      items.push({
        type: STRING,
        value: decodeStepString(src.substring(pos, i)),
      });
      pos = i + 1;
    } else if (c === 34) {
      // '"' — binary literal; web-ifc tapes it as REAL with the raw hex text
      pos++;
      const hexStart = pos;
      while (pos < end && src.charCodeAt(pos) !== 34) pos++;
      if (pos >= end)
        throw parseError(src, hexStart, "unterminated binary literal");
      items.push({ type: REAL, value: src.substring(hexStart, pos) });
      pos++;
    } else if (c === 40) {
      // "(" — aggregate / list
      const inner = parseList(src, pos + 1, end);
      if (inner.pos >= end || src.charCodeAt(inner.pos) !== 41) {
        throw parseError(src, pos, "unterminated aggregate");
      }
      pos = inner.pos + 1;
      items.push(inner.items);
    } else if (c === 45 || c === 43 || (c >= 48 && c <= 57)) {
      // numeric: integer, or real kept as its raw literal text (web-ifc parity)
      const numStart = pos;
      if (c === 45 || c === 43) pos++;
      let hasDigits = false;
      let isReal = false;
      while (pos < end) {
        const d = src.charCodeAt(pos);
        if (d >= 48 && d <= 57) {
          hasDigits = true;
          pos++;
        } else if (d === 46) {
          // "."
          isReal = true;
          pos++;
        } else if (d === 69 || d === 101) {
          // "E" / "e" with optional sign
          isReal = true;
          pos++;
          const s = src.charCodeAt(pos);
          if (s === 43 || s === 45) pos++;
        } else break;
      }
      if (!hasDigits) throw parseError(src, numStart, "malformed number");
      items.push(
        isReal
          ? { type: REAL, value: src.substring(numStart, pos) }
          : {
              type: INTEGER,
              value: parseInt(src.substring(numStart, pos), 10),
            },
      );
    } else if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) {
      // typed value / select: IFCLABEL('foo') or IFCLENGTHMEASURE(3.14)
      const nameStart = pos;
      while (pos < end) {
        const d = src.charCodeAt(pos);
        if (
          (d >= 65 && d <= 90) ||
          (d >= 97 && d <= 122) ||
          (d >= 48 && d <= 57) ||
          d === 95
        )
          pos++;
        else break;
      }
      const name = src.substring(nameStart, pos);
      while (pos < end && src.charCodeAt(pos) <= 32) pos++;
      if (pos >= end || src.charCodeAt(pos) !== 40) {
        throw parseError(src, nameStart, `expected '(' after '${name}'`);
      }
      const inner = parseList(src, pos + 1, end);
      if (inner.pos >= end || src.charCodeAt(inner.pos) !== 41) {
        throw parseError(src, pos, "unterminated typed value");
      }
      pos = inner.pos + 1;

      // web-ifc flattens a typed value to its numeric typecode + inner primitive
      const typecode = (webIfc as Record<string, unknown>)[name.toUpperCase()];
      const first = inner.items[0];
      items.push({
        type: LABEL,
        typecode: typeof typecode === "number" ? typecode : undefined,
        value:
          first === null || Array.isArray(first)
            ? first ?? undefined
            : first.value,
      });
    } else {
      throw parseError(src, pos, `unexpected character '${src[pos]}'`);
    }
  }

  return { items, pos };
}

/**
 * Parse the argument list of a STEP data statement (`#ID=TYPENAME(args);`)
 * into web-ifc's raw tape shape, suitable for `webIfc.FromRawLineData`.
 * Throws on malformed arguments.
 */
export function parseStepArguments(line: string): StepArgument[] {
  const start = line.indexOf("(");
  if (start < 0) return [];
  const end = line.lastIndexOf(")");
  if (end < start) return [];
  return parseList(line, start + 1, end).items;
}
