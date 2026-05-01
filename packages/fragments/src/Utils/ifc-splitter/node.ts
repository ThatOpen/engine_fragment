#!/usr/bin/env node
import { openAsBlob } from "fs";
import { open } from "node:fs/promises";
import { Writable } from "node:stream";
import { TextDecoderStream } from "node:stream/web";
import { IfcSplitter } from "./index";

export class IfcSplitterNode extends IfcSplitter {
  constructor() {
    super({
      readableStream: async (path) =>
        (await openAsBlob(path, { type: "text/plain" }))
          .stream()
          .pipeThrough(
            new TextDecoderStream() as unknown as TransformStream<
              Uint8Array,
              string
            >,
          ),
      writableStream: async (path) => {
        const fileHandle = await open(path, "w");
        const nodeWritable = fileHandle.createWriteStream();
        return Writable.toWeb(nodeWritable) as WritableStream<string>;
      },
    });
  }
}
