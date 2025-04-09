/* eslint-disable no-bitwise */
/* eslint-disable no-prototype-builtins */

import { MaterialDefinition } from "../../model/model-types";
import { CRCData } from "./crc-data";
import { IntHelper } from "./int-helper";

// src: https://stackoverflow.com/questions/27939882/fast-crc-algorithm

type SupportedType = "number" | "boolean" | "string" | "object";

export class CRC {
  private static readonly _polynomial = 0x82f63b78;
  private readonly _core = new CRCData();
  private readonly _handlers: {
    [key: string]: (input: any) => void;
  };

  private _result = ~0;

  get value() {
    return ~this._result;
  }

  constructor() {
    this._handlers = this.newHandlers();
  }

  fromMaterialData(
    data: {
      modelId: string;
      objectClass: number;
      currentLod: number;
      templateId?: any;
    } & MaterialDefinition,
  ) {
    const {
      modelId,
      objectClass,
      currentLod,
      templateId,
      ...materialDefinition
    } = data;
    this.reset();
    this.compute(modelId);
    this.compute(objectClass);
    this.compute(materialDefinition);
    this.compute(currentLod);
    this.compute(templateId !== undefined);
  }

  generate(input: (number | boolean | string | object)[]) {
    this.reset();
    for (const item of input) {
      this.compute(item);
    }
    return this.value;
  }

  compute(input: number | boolean | string | object) {
    const handler = this.getHandler(input);
    handler(input);
    return this;
  }

  reset() {
    this._result = ~0;
    return this;
  }

  private getHandler(input: string | number | boolean | object) {
    const inputType = typeof input as SupportedType;
    const handler = this._handlers[inputType];
    if (!handler) {
      throw new Error("Fragments: Unsupported input type");
    }
    return handler;
  }

  private newHandlers() {
    return {
      number: this.handleNumber,
      boolean: this.handleBoolean,
      string: this.handleString,
      object: this.handleObject,
    };
  }

  private handleObject = (input: any) => {
    const keys = Object.keys(input);
    for (const key of keys) {
      if (!input.hasOwnProperty(key)) {
        continue;
      }
      this.compute(input[key]);
    }
  };

  private handleString = (input: string) => {
    const size = input.length;
    for (let i = 0; i < size; ++i) {
      const result = input.codePointAt(i)!;
      this._core.int[0] = result;
      this.update();
    }
  };

  private handleBoolean = (input: boolean) => {
    if (input) {
      this._core.int[0] = 1;
    } else {
      this._core.int[0] = 0;
    }
    this.update();
  };

  private handleNumber = (input: number) => {
    const isInt = IntHelper.check(input);
    const target = isInt ? this._core.int : this._core.float;
    target[0] = input;
    this.update();
  };

  private update() {
    for (let i = 0; i < this._core.s1; ++i) {
      this._result ^= this._core.buffer[i];
      for (let j = 0; j < this._core.s2; ++j) {
        if (this._result & 1) {
          this._result = (this._result >> 1) ^ CRC._polynomial;
        } else {
          this._result >>= 1;
        }
      }
    }
  }
}
