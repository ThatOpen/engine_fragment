// Makes a large synthetic IFC by repeating a real one's DATA section, each
// copy with its express ids shifted clear of the others. For testing how the
// importer behaves past a size no real fixture reaches.
//
// Every copy keeps its own spatial tree but shares the first copy's
// IfcProject, since web-ifc reads the model's units from the project and
// ignores them when there is more than one.
//
// usage: yarn tsx replicate.ts <in.ifc> <out.ifc> <copies>

import { createReadStream, createWriteStream } from "node:fs";
import { IfcStatementCursor } from "../../../../Utils/ifc-scanner";

const [input, output, copiesArg] = process.argv.slice(2);
const copies = Number(copiesArg);
if (!(input && output && copies >= 1)) {
  console.error("usage: replicate.ts <in.ifc> <out.ifc> <copies>");
  process.exit(2);
}

type Statement = { id: number; type: string; bytes: Uint8Array };

/**
 * Every statement of the file, in order, with its bytes; `afterChunk` runs
 * between input chunks, where output can be flushed.
 */
async function forEachStatement(
  fn: (statement: Statement) => void,
  afterChunk: () => Promise<void> = async () => {},
) {
  const cursor = new IfcStatementCursor();
  const chunks = createReadStream(input, {
    highWaterMark: 16 * 1024 * 1024,
  }) as unknown as AsyncIterable<Uint8Array>;
  for await (const chunk of chunks) {
    cursor.write(chunk, (_offset, length, id, type, bytes, start, carry) => {
      fn({
        id,
        type,
        bytes: start >= 0 ? bytes.subarray(start, start + length) : carry!,
      });
    });
    await afterChunk();
  }
}

let maxId = 0;
const projects = new Set<number>();
const header: Uint8Array[] = [];
let inHeader = true;
const decoder = new TextDecoder();
await forEachStatement(({ id, type, bytes }) => {
  if (id) {
    maxId = Math.max(maxId, id);
    if (type === "IFCPROJECT") projects.add(id);
  } else if (inHeader) {
    const text = decoder.decode(bytes);
    if (text.startsWith("DATA")) inHeader = false;
    else header.push(bytes.slice());
  }
});
const stride = 10 ** Math.ceil(Math.log10(maxId + 1));

const out = createWriteStream(output);
const pending: Uint8Array[] = [];
const write = (bytes: Uint8Array) => {
  pending.push(bytes);
};
const flush = async () => {
  if (pending.length === 0) return;
  const block = Buffer.concat(pending);
  pending.length = 0;
  if (!out.write(block)) {
    await new Promise((resolve) => out.once("drain", resolve));
  }
};
const newline = new Uint8Array([10]);

/** `bytes` with every `#N` outside strings moved by `shift`. */
function shiftIds(bytes: Uint8Array, shift: number) {
  const text = decoder.decode(bytes);
  let result = "";
  let last = 0;
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 39) inString = !inString;
    if (inString || c !== 35) continue;
    let j = i + 1;
    while (j < text.length && text.charCodeAt(j) >= 48 && text.charCodeAt(j) <= 57) {
      j++;
    }
    if (j === i + 1) continue;
    const id = Number(text.slice(i + 1, j));
    // the shared project keeps its first-copy id
    const moved = projects.has(id) ? id : id + shift;
    result += `${text.slice(last, i)}#${moved}`;
    last = j;
    i = j - 1;
  }
  return new TextEncoder().encode(result + text.slice(last));
}

for (const statement of header) {
  write(statement);
  write(newline);
}
write(new TextEncoder().encode("DATA;\n"));
for (let copy = 0; copy < copies; copy++) {
  const shift = copy * stride;
  await forEachStatement(({ id, type, bytes }) => {
    if (!id) return;
    if (copy > 0 && type === "IFCPROJECT") return;
    write(copy === 0 ? bytes.slice() : shiftIds(bytes, shift));
    write(newline);
  }, flush);
  console.error(`copy ${copy + 1}/${copies} written`);
}
write(new TextEncoder().encode("ENDSEC;\nEND-ISO-10303-21;\n"));
await flush();
out.end();
