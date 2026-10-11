import type { UnstampedProbe } from "./types";

// The revision of a file lives in the JSON of `Model.metadata`, next to the
// generator and version. That field has been the first of the root table in
// every layout, so it is read here by hand, with no schema: it has to work on
// a file whose layout this package has no generated code for.
const METADATA_VTABLE_OFFSET = 4;

const decoder = new TextDecoder();

function viewOf(bytes: Uint8Array) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

/** Position of a field of the root table, or 0 when it is absent. */
function rootField(view: DataView, vtableOffset: number) {
  const root = view.getUint32(0, true);
  const vtable = root - view.getInt32(root, true);
  if (vtableOffset >= view.getUint16(vtable, true)) {
    return 0;
  }
  const offset = view.getUint16(vtable + vtableOffset, true);
  return offset === 0 ? 0 : root + offset;
}

/** The metadata of a raw (inflated) file, or `null` when it has none that parses. */
export function readMetadata(bytes: Uint8Array): Record<string, any> | null {
  try {
    const view = viewOf(bytes);
    const field = rootField(view, METADATA_VTABLE_OFFSET);
    if (field === 0) {
      return null;
    }
    const start = field + view.getUint32(field, true);
    const length = view.getUint32(start, true);
    const text = decoder.decode(bytes.subarray(start + 4, start + 4 + length));
    const metadata = JSON.parse(text);
    return metadata !== null && typeof metadata === "object" ? metadata : null;
  } catch {
    return null;
  }
}

/** The metadata of a file with its revision set, as the JSON to store. */
export function stampMetadata(metadata: unknown, revision: string) {
  let current: Record<string, unknown> = {};
  if (typeof metadata === "string") {
    current = JSON.parse(metadata);
  } else if (metadata !== null && typeof metadata === "object") {
    current = metadata as Record<string, unknown>;
  }
  return JSON.stringify({ ...current, revision });
}

function isText(bytes: Uint8Array, start: number, length: number) {
  const end = Math.min(start + length, start + 64);
  for (let i = start; i < end; i++) {
    const byte = bytes[i];
    if (byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d) {
      return false;
    }
  }
  return true;
}

/** What a migration can ask about a raw file that carries no revision. */
export function probeUnstamped(bytes: Uint8Array): UnstampedProbe {
  const view = viewOf(bytes);
  const size = bytes.length;
  const root = view.getUint32(0, true);
  const vtable = root - view.getInt32(root, true);
  const rootSlots = (view.getUint16(vtable, true) - 4) / 2;
  const has = (slot: number) => rootField(view, 4 + 2 * slot) !== 0;

  const isStringVector = (slot: number) => {
    const field = rootField(view, 4 + 2 * slot);
    if (field === 0) {
      return null;
    }
    try {
      const vector = field + view.getUint32(field, true);
      const length = view.getUint32(vector, true);
      if (length === 0) {
        return null;
      }
      if (vector + 4 + length * 4 > size) {
        return false;
      }
      // A string is a length, that many bytes of text and a zero. Anything
      // else read as one breaks at least one of the three within a few items.
      for (let i = 0; i < Math.min(length, 8); i++) {
        const item = vector + 4 + i * 4;
        const text = item + view.getUint32(item, true);
        const textLength = view.getUint32(text, true);
        const end = text + 4 + textLength;
        if (end >= size || bytes[end] !== 0) {
          return false;
        }
        if (!isText(bytes, text + 4, textLength)) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  };

  return { rootSlots, has, isStringVector, metadata: readMetadata(bytes) };
}
