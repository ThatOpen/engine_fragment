#!/usr/bin/env node
import { openAsBlob } from "fs";
import { open } from "node:fs/promises";
import { Writable } from "node:stream";
import { TextDecoderStream } from "node:stream/web";
import { IfcSplitter } from "./index.ts";

export class IfcSplitterNode extends IfcSplitter {
  constructor() {
    super({
      readableStream: async (path) =>
        (await openAsBlob(path, { type: "text/plain" }))
          .stream()
          .pipeThrough(new TextDecoderStream()),
      writableStream: async (path) => {
        const fileHandle = await open(path, "w");
        const nodeWritable = fileHandle.createWriteStream();
        return Writable.toWeb(nodeWritable);
      },
    });
  }
}
