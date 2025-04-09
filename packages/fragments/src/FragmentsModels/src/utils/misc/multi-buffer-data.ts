import { DataBuffer } from "../../model/model-types";

type Filter = (data: any) => boolean;

interface BufferData<T> {
  position: number;
  size: number;
  data: T;
  past: BufferData<T> | null;
  following: BufferData<T> | null;
}

export class MultiBufferData<T> {
  private static _stash: Array<BufferData<any>> = [];
  private _first: BufferData<T>;
  private static _tempData = { position: 0, size: 0 } as BufferData<any>;
  private static _inf = 0xffffffff;

  constructor(size: number, firstElement: T) {
    this._first = this.newData(size, firstElement);
  }

  static getComplementary(
    data: any,
    callback: (position: number, size: number) => void,
  ) {
    let past = 0;
    const length = data.position.length;
    past = this.makeBufferComplementary(length, data, past, callback);
    if (past !== Infinity) {
      callback(past, Infinity);
    }
  }

  static get<T>(
    data: MultiBufferData<T>,
    positions: number[],
    filter?: Filter,
    callback?: (i: number, value: T) => void,
  ) {
    const { filtered, position, size } = this.getData(data, filter);
    this.setAllBufferData(filtered, positions, position, size, callback);
    return { position, size };
  }

  fullOf(data: T) {
    const followingItem = this._first.following;
    const first = this._first.data;
    const noFollowing = followingItem === null;
    const sameData = first === data;
    return noFollowing && sameData;
  }

  update(position: number, data: T) {
    const input = this.getBufferData(position);
    const isSame = input.data === data;
    if (!isSame) {
      const { a, c, b } = this.newBuffers(position, input, data);
      this.setupInputData(input, a, c);
      this.setupUpdateBuffers(a, b, c);
    }
  }

  size(filter?: Filter) {
    let index = 0;
    let data: any = this._first;
    while (data !== null) {
      const filterPass = this.doesFilterPass(filter, data);
      if (filterPass) {
        index++;
      }
      data = data.following;
    }
    return index;
  }

  private static setAllBufferData<T>(
    filtered: BufferData<T>[],
    positions: number[],
    position: Uint32Array,
    size: Uint32Array,
    callback?: (index: number, data: T) => void,
  ) {
    for (let i = 0; i < filtered.length; ++i) {
      const input = filtered[i];
      this.transform(input, positions);
      this.setBuffers(position, size, i);
      if (callback) {
        callback(i, input.data);
      }
    }
  }

  private static makeBufferComplementary(
    length: any,
    data: any,
    past: number,
    callback: (position: number, size: number) => void,
  ) {
    for (let i = 0; i < length; ++i) {
      const input = this.getBuffers(data, i);
      const { position, size } = input;
      if (position > past) {
        callback(past, position - past);
      }
      past = position + size;
    }
    return past;
  }

  private static setBuffers(position: DataBuffer, size: DataBuffer, i: number) {
    position[i] = this._tempData.position;
    const isInf = this._tempData.size === Infinity;
    if (isInf) {
      size[i] = this._inf;
    } else {
      size[i] = this._tempData.size;
    }
  }

  private add(position: number, size: number, data: T) {
    const stashExists = MultiBufferData._stash.length;
    if (!stashExists) {
      return this.newData(size, data, position);
    }
    const stashed = MultiBufferData._stash.pop();
    if (!stashed) {
      throw new Error("Fragments: No stash found");
    }
    stashed.position = position;
    stashed.size = size;
    stashed.data = data;
    return stashed;
  }

  private remove(data: BufferData<T>) {
    if (data) {
      data.following = null;
      data.past = null;
      MultiBufferData._stash.push(data);
    }
  }

  private static getData<T>(data: MultiBufferData<T>, filter?: Filter) {
    const filtered = data.filter(filter);
    const length = filtered.length;
    const position = new Uint32Array(length);
    const size = new Uint32Array(length);
    return { filtered, position, size };
  }

  private filter(filter?: Filter) {
    const found = [];
    let data: BufferData<T> | null = this._first;
    while (data !== null) {
      const filterPass = this.doesFilterPass(filter, data);
      if (filterPass) {
        found.push(data);
      }
      data = data.following;
    }
    return found;
  }

  private static transform(input: BufferData<any>, positions: number[]) {
    const result = this.getTempData();
    const finalPosition = input.position + input.size;
    const isFinal = finalPosition === positions.length;
    result.position = positions[input.position];
    if (isFinal) {
      result.size = Infinity;
    } else {
      const total = positions[finalPosition];
      result.size = total - result.position;
    }
    return result;
  }

  private static getBuffers(data: any, i: number) {
    const position = data.position[i];
    const isInf = data.size[i] === this._inf;
    let size: number;
    if (isInf) {
      size = Infinity;
    } else {
      size = data.size[i];
    }
    return { position, size };
  }

  private static getTempData() {
    if (!this._tempData) {
      return { position: 0, size: 0 } as BufferData<any>;
    }
    return this._tempData;
  }

  private doesFilterPass(filter: Filter | undefined, data: BufferData<T>) {
    const noFilter = !filter;
    const filterPass = noFilter || filter(data.data);
    return filterPass;
  }

  private setupUpdateBuffers(
    a: BufferData<any>,
    b: BufferData<any>,
    c: BufferData<any>,
  ) {
    this.chainBuffers(a, b, c);
    this.setupFirstBuffer(a, b);
    this.setupLastBuffer(c, b);
    this.setupMiddleBufferStart(b);
    this.setupMiddleBufferEnd(b);
  }

  private setupMiddleBufferEnd(b: BufferData<any>) {
    if (b.following?.data === b.data) {
      if (!b.following) {
        return;
      }
      const newSize = b.following.size + b.size;
      const following = b.following.following;
      b.size = newSize;
      this.remove(b.following);
      b.following = following;
      if (b.following) {
        b.following.past = b;
      }
    }
  }

  private setupFirstBuffer(a: BufferData<any>, b: BufferData<any>) {
    if (!a.size) {
      if (a.past) {
        a.past.following = b;
      } else {
        this._first = b;
      }
      b.past = a.past;
      this.remove(a);
    }
  }

  private setupMiddleBufferStart(b: BufferData<any>) {
    if (b.past?.data === b.data) {
      if (!b.past) {
        return;
      }
      b.size = b.past.size + b.size;
      b.position = b.past.position;
      const past = b.past.past;
      this.remove(b.past);
      b.past = past;
      if (b.past) {
        b.past.following = b;
      } else {
        this._first = b;
      }
    }
  }

  private chainBuffers(
    a: BufferData<any>,
    b: BufferData<any>,
    c: BufferData<any>,
  ) {
    a.following = b;
    b.past = a;
    b.following = c;
    c.past = b;
  }

  private setupLastBuffer(c: BufferData<any>, b: BufferData<any>) {
    if (!c.size) {
      if (c.following) {
        c.following.past = b;
      }
      b.following = c.following;
      this.remove(c);
    }
  }

  private newBuffers(position: number, input: any, data: T) {
    const aSize = position - input.position;
    const a = this.add(input.position, aSize, input.data);
    const b = this.add(position, 1, data);
    const cSize = input.size - a.size - 1;
    const c = this.add(position + 1, cSize, input.data);
    return { a, c, b };
  }

  private setupInputData(input: any, a: BufferData<any>, c: BufferData<any>) {
    if (input.past) {
      input.past.following = a;
      a.past = input.past;
    } else {
      this._first = a;
    }

    if (input.following) {
      input.following.past = c;
      c.following = input.following;
    }

    this.remove(input);
  }

  private newData(size: number, data: T, position = 0) {
    return {
      position,
      size,
      past: null,
      following: null,
      data,
    } as BufferData<T>;
  }

  private getBufferData(index: number) {
    let found: any = this._first;
    while (true) {
      const notFound = found === null;
      const lessThanIndex = found.position <= index;
      const inScope = index < found.position + found.size;
      const scoped = lessThanIndex && inScope;
      if (notFound || scoped) {
        return found;
      }
      found = found.following;
    }
  }
}
