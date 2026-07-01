#!/usr/bin/env node
import { openAsBlob } from "fs";
import { mkdir, open } from "node:fs/promises";
import { dirname } from "node:path";
import { Writable } from "node:stream";
import { IfcDecoderStream } from "../ifc-stream";
import { IfcSplitter } from "./index";

export class IfcSplitterNode extends IfcSplitter {
  constructor() {
    super({
      readableStream: async (path) =>
        (await openAsBlob(path, { type: "text/plain" }))
          .stream()
          .pipeThrough(new IfcDecoderStream()),

      writableStream: async (path) => {
        await mkdir(dirname(path), { recursive: true });
        const fileHandle = await open(path, "w");
        const nodeWritable = fileHandle.createWriteStream();
        return Writable.toWeb(nodeWritable) as WritableStream<string>;
      },
    });
  }
}
