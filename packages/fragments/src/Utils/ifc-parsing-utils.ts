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
