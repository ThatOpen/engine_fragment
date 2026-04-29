import * as FB from "flatbuffers";
import * as TFB from "../../Schema";
import { RawIndexData } from "./edit-types";

/**
 * Build a fresh `ModelIndex` flatbuffer from a {@link RawIndexData} payload.
 *
 * Mode is inferred from which fields the payload populates:
 *
 *   - keys-only:        only `keys`.
 *   - 1:1:              `keys` + `values`, no `start`/`end`.
 *   - 1:N linear:       `keys` + `values` + `end`.
 *   - 1:N non-linear:   `keys` + `values` + `start` + `end`.
 *
 * Keys must be homogeneous. Empty key arrays are accepted and emit an empty
 * vector; the schema permits it.
 */
export function buildIndex(
  builder: FB.Builder,
  data: RawIndexData,
): FB.Offset {
  const nameOffset = builder.createString(data.name);

  const { keysOffset, isStringKey } = createKeysVector(builder, data.keys);
  const { valuesOffset, isStringValue } = createValuesVector(
    builder,
    data.values,
  );
  const endOffset = data.end?.length
    ? TFB.ModelIndex.createEndVector(builder, data.end)
    : null;
  const startOffset = data.start?.length
    ? TFB.ModelIndex.createStartVector(builder, data.start)
    : null;

  TFB.ModelIndex.startModelIndex(builder);
  TFB.ModelIndex.addName(builder, nameOffset);
  if (isStringKey) {
    TFB.ModelIndex.addStringKeys(builder, keysOffset);
  } else {
    TFB.ModelIndex.addNumberKeys(builder, keysOffset);
  }
  if (valuesOffset !== null) {
    if (isStringValue) {
      TFB.ModelIndex.addStringValues(builder, valuesOffset);
    } else {
      TFB.ModelIndex.addNumberValues(builder, valuesOffset);
    }
  }
  if (endOffset !== null) TFB.ModelIndex.addEnd(builder, endOffset);
  if (startOffset !== null) TFB.ModelIndex.addStart(builder, startOffset);
  return TFB.ModelIndex.endModelIndex(builder);
}

/**
 * Copy an existing `ModelIndex` from a source model into the builder unchanged.
 * Used by the edit pipeline to carry through indexes that aren't being
 * deleted or replaced by an upsert.
 */
export function copyIndex(
  builder: FB.Builder,
  src: TFB.ModelIndex,
): FB.Offset {
  const data = readIndex(src);
  return buildIndex(builder, data);
}

function readIndex(src: TFB.ModelIndex): RawIndexData {
  const name = src.name() ?? "";
  const stringKeysLen = src.stringKeysLength();
  const stringValuesLen = src.stringValuesLength();
  const numberValuesLen = src.numberValuesLength();
  const endLen = src.endLength();
  const startLen = src.startLength();

  let keys: number[] | string[];
  if (stringKeysLen > 0) {
    const arr = new Array<string>(stringKeysLen);
    for (let i = 0; i < stringKeysLen; i++) arr[i] = src.stringKeys(i) ?? "";
    keys = arr;
  } else {
    const numberKeys = src.numberKeysArray();
    keys = numberKeys ? Array.from(numberKeys) : [];
  }

  let values: number[] | string[] | undefined;
  if (stringValuesLen > 0) {
    const arr = new Array<string>(stringValuesLen);
    for (let i = 0; i < stringValuesLen; i++) {
      arr[i] = src.stringValues(i) ?? "";
    }
    values = arr;
  } else if (numberValuesLen > 0) {
    const numberValues = src.numberValuesArray();
    values = numberValues ? Array.from(numberValues) : [];
  }

  let end: number[] | undefined;
  if (endLen > 0) {
    const arr = src.endArray();
    end = arr ? Array.from(arr) : [];
  }

  let start: number[] | undefined;
  if (startLen > 0) {
    const arr = src.startArray();
    start = arr ? Array.from(arr) : [];
  }

  return { name, keys, values, end, start };
}

function createKeysVector(
  builder: FB.Builder,
  keys: number[] | string[],
): { keysOffset: FB.Offset; isStringKey: boolean } {
  if (keys.length === 0) {
    // Empty: emit a number vector by convention; the keyType isn't observable
    // when there are no keys to inspect.
    return {
      keysOffset: TFB.ModelIndex.createNumberKeysVector(builder, []),
      isStringKey: false,
    };
  }
  if (typeof keys[0] === "string") {
    const offsets = (keys as string[]).map((s) => builder.createString(s));
    return {
      keysOffset: TFB.ModelIndex.createStringKeysVector(builder, offsets),
      isStringKey: true,
    };
  }
  return {
    keysOffset: TFB.ModelIndex.createNumberKeysVector(
      builder,
      keys as number[],
    ),
    isStringKey: false,
  };
}

function createValuesVector(
  builder: FB.Builder,
  values: number[] | string[] | undefined,
): { valuesOffset: FB.Offset | null; isStringValue: boolean } {
  if (!values || values.length === 0) {
    return { valuesOffset: null, isStringValue: false };
  }
  if (typeof values[0] === "string") {
    const offsets = (values as string[]).map((s) => builder.createString(s));
    return {
      valuesOffset: TFB.ModelIndex.createStringValuesVector(builder, offsets),
      isStringValue: true,
    };
  }
  return {
    valuesOffset: TFB.ModelIndex.createNumberValuesVector(
      builder,
      values as number[],
    ),
    isStringValue: false,
  };
}
