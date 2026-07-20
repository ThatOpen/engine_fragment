// ---------------------------------------------------------------------------
// Parse helpers — manual charCode-based extractors for speed on 37M+ lines
// ---------------------------------------------------------------------------
interface LineMeta {
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

/** STEP tape type codes (mirrors web-ifc internals) */
enum StepTapeType {
  String = 1, // 'foo'
  Label = 2, // IFCLABEL('foo') — typed value / select
  Enum = 3, // .SOMEVALUE.
  Real = 4, // 3.14
  Ref = 5, // #123
  Empty = 6, // $
  Int = 10,
}

type TapeItem =
  | {
      type: StepTapeType.String | StepTapeType.Label | StepTapeType.Enum;
      value: string;
      name?: string;
    }
  | { type: StepTapeType.Real | StepTapeType.Int; value: number }
  | { type: StepTapeType.Ref; value: number }
  | { type: StepTapeType.Empty; value: null }
  | TapeItem[];

/** Recursive descent through a STEP token stream. */
function parseList(
  src: string,
  pos: number,
  end: number,
): { items: TapeItem[]; pos: number } {
  const items: TapeItem[] = [];

  while (pos < end) {
    // skip whitespace and commas
    while (pos < end && (src[pos] === "," || src[pos] === " ")) pos++;
    if (pos >= end) break;

    const ch = src[pos];

    // end of the enclosing list — the caller consumes the ")"
    if (ch === ")") break;

    if (ch === "$") {
      // omitted / null attribute
      items.push({ type: StepTapeType.Empty, value: null });
      pos++;
    } else if (ch === "*") {
      // redeclared attribute (treat same as omitted)
      items.push({ type: StepTapeType.Empty, value: null });
      pos++;
    } else if (ch === "#") {
      // entity reference: #12345
      pos++;
      let numStr = "";
      while (pos < end && src[pos] >= "0" && src[pos] <= "9")
        numStr += src[pos++];
      items.push({ type: StepTapeType.Ref, value: parseInt(numStr, 10) });
    } else if (ch === ".") {
      // enum: .SOMEVALUE.
      pos++;
      let name = "";
      while (pos < end && src[pos] !== ".") name += src[pos++];
      pos++; // consume closing "."
      items.push({ type: StepTapeType.Enum, value: name });
    } else if (ch === "'") {
      // string: 'hello world'  ('' is an escaped single quote)
      pos++;
      let value = "";
      while (pos < end) {
        if (src[pos] === "'" && src[pos + 1] === "'") {
          value += "'";
          pos += 2;
        } else if (src[pos] === "'") {
          pos++;
          break;
        } else {
          value += src[pos++];
        }
      }
      items.push({ type: StepTapeType.String, value });
    } else if (ch === "(") {
      // aggregate / list: (item, item, ...)
      const inner = parseList(src, pos + 1, end);
      pos = inner.pos + 1; // skip closing ")"
      items.push(inner.items as unknown as TapeItem);
    } else if (ch === "-" || (ch >= "0" && ch <= "9")) {
      // numeric: integer or real
      let numStr = "";
      if (ch === "-") {
        numStr += "-";
        pos++;
      }
      while (
        pos < end &&
        ((src[pos] >= "0" && src[pos] <= "9") ||
          src[pos] === "." ||
          src[pos] === "E" ||
          src[pos] === "e" ||
          src[pos] === "+" ||
          src[pos] === "-")
      ) {
        numStr += src[pos++];
      }
      const isReal = numStr.includes(".") || numStr.toUpperCase().includes("E");
      items.push(
        isReal
          ? { type: StepTapeType.Real, value: parseFloat(numStr) }
          : { type: StepTapeType.Int, value: parseInt(numStr, 10) },
      );
    } else if ((ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z")) {
      // typed value / select: IFCLABEL('foo') or IFCLENGTHMEASURE(3.14)
      let name = "";
      while (pos < end && src[pos] !== "(") name += src[pos++];
      pos++; // consume "("
      const inner = parseList(src, pos, end);
      pos = inner.pos + 1; // skip ")"

      // A typed value wraps a single primitive as a LABEL tape item
      items.push({
        type: StepTapeType.Label,
        value: inner.items[0] as any,
        name,
      });
    } else {
      pos++; // skip unexpected character
    }
  }

  return { items, pos };
}

/** Parse the argument list of a STEP data line into a web-ifc tape. */
export function parseStepArguments(line: string): TapeItem[] {
  // Extract the argument substring: #ID=TYPENAME(args);
  const args = extractArgsString(line);
  if (args === null) return [];
  return parseList(args, 0, args.length).items;
}
