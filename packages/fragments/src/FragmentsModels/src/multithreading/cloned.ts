type Method = (...args: any[]) => any;

// Copied as they are.
type Kept =
  | string
  | number
  | bigint
  | boolean
  | symbol
  | null
  | undefined
  | void
  | ArrayBufferLike
  | ArrayBufferView
  | Date
  | RegExp;

/**
 * What a value becomes once it is sent to another thread: postMessage()
 * copies it the way structuredClone() does, so class instances lose their
 * prototype and only their own data fields arrive. A THREE.Matrix4 arrives
 * as `{ elements, isMatrix4 }`, which is not a THREE.Matrix4, and has to be
 * rebuilt before it is handed out as one.
 *
 * A getter is typed like a data field but lives on the prototype, so it
 * doesn't arrive either. This type keeps it.
 */
export type Cloned<T> = 0 extends 1 & T
  ? T // any
  : unknown extends T
    ? T
    : T extends Kept
      ? T
      : T extends Map<infer K, infer V>
        ? Map<Cloned<K>, Cloned<V>>
        : T extends Set<infer V>
          ? Set<Cloned<V>>
          : T extends readonly unknown[]
            ? { [I in keyof T]: Cloned<T[I]> }
            : {
                [K in keyof T as T[K] extends Method ? never : K]: Cloned<T[K]>;
              };
