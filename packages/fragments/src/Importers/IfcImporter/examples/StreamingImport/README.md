# Converting large IFC files in the browser, without splitting

Proof of concept for [#310](https://github.com/ThatOpen/engine_fragment/issues/310): convert an IFC file of any size to one Fragments model on a web page, in workers, without the splitter and without running out of memory — and measure it.

## Result

Measured in headless Chrome on an M2 Max laptop (12 cores, 32 GB), converting each file from the upload's `File` in the demo page and loading the result into the viewer. "Legacy" is the importer as it was on `feat/advanced-stream-parsing` (file read into memory, opened twice in web-ifc); "parallel" is this POC with 8 geometry workers. RSS is the renderer process's peak resident memory, viewer included.

| Model | IFC | Legacy | Parallel | Speed-up | Legacy RSS | Parallel RSS | Largest web-ifc heap, legacy → parallel |
|---|---|---|---|---|---|---|---|
| IFC4, TrimBIM export | 586 MB | 85.1 s | 15.5 s | 5.5× | 6.4 GB | 6.7 GB | 1,189 → 160 MB |
| IFC4, TrimBIM export | 148 MB | 40.0 s | 6.5 s | 6.1× | 2.7 GB | 3.8 GB | 390 → 160 MB |
| Tekla (IFC2X3) | 139 MB | 219.4 s | 32.6 s | 6.7× | 3.6 GB | 4.2 GB | 779 → 160 MB |
| IFC4, in-house exporter | 116 MB | 42.7 s | 6.9 s | 6.2× | 2.6 GB | 4.0 GB | 314 → 160 MB |
| Tekla (IFC2X3) | 80 MB | 37.6 s | 8.6 s | 4.4× | 2.2 GB | 3.4 GB | 409 → 160 MB |
| AutoCAD Architecture (IFC2X3) | 67 MB | 46.6 s | 18.7 s | 2.5× | 1.6 GB | 3.6 GB | 192 → 160 MB |
| Tekla (IFC2X3) | 66 MB | 38.8 s | 10.9 s | 3.6× | 2.1 GB | 3.7 GB | 398 → 160 MB |
| Tekla (IFC2X3) | 61 MB | 14.3 s | 3.8 s | 3.7× | 2.3 GB | 3.1 GB | 230 → 160 MB |
| Tekla (IFC2X3) | 38 MB | 18.7 s | 6.7 s | 2.8× | 1.8 GB | 2.9 GB | 230 → 160 MB |
| 4× the 586 MB model (synthetic) | 2.4 GB | fails | 67.9 s | — | — | 6.1 GB | — → 160 MB |

At 2.4 GB the legacy importer cannot start: Chrome refuses to read a `Blob` over 2 GB into one `ArrayBuffer`. Reading the file in place and opening it as one web-ifc model gets past that, but did not finish in 25 minutes: its tape outgrows web-ifc's default 2 GiB `MEMORY_LIMIT`, and paging then thrashes (raising the limit instead meets wasm32's 4 GB ceiling). In parallel mode the same file converts in 68 s with 8 workers (61 s with the whole file held in memory), or in 163 s with 2 workers at 4.5 GB peak RSS, and its 491 MB model loads into the viewer in 14 s.

**Memory is a dial, not a wall.** No web-ifc heap exceeds one batch (160 MB here, whatever the file size), and the coordinating thread's JS heap stays small (170 MB for the 586 MB model, 424 MB for 2.4 GB), so no single heap grows toward a limit. Total memory is set by the number of workers — each costs ~330 MB, mostly a web-ifc heap plus web-ifc's schema tables — and by whether the file is held in memory (`residentBudget`, 1 GB by default) or paged. On the 586 MB model, conversion only:

| Geometry workers | 1 | 2 | 4 | 8 | one whole-file model |
|---|---|---|---|---|---|
| Conversion | 73.0 s | 39.6 s | 22.6 s | 15.8 s | 76.3 s |
| Peak RSS | 3.7 GB | 4.4 GB | 5.5 GB | 6.8 GB | 3.8 GB |
| Largest web-ifc heap | 160 MB | 160 MB | 160 MB | 160 MB | 1,189 MB |

With 8 workers the parallel pipeline uses somewhat more memory than legacy did on these files, in exchange for 2.5–6.7× the speed; with one worker it uses less than legacy and the same as a single whole-file model, but with a web-ifc heap that no longer grows with the file. The demo picks `cores − 2` workers, up to 8.

Where the time goes: web-ifc's C++ is 60–85% of single-threaded geometry time (on Tekla models, mostly boolean operations for holes), so it is what parallelism buys back. The JS side of geometry (shell building, dedup hashing, buffer copies) is 12–25%; of it, shell building itself is under 3% of the total, so rewriting it on typed arrays is worth doing but will not move these numbers much.

## How it works

```
File ──> index (scan once) ──┬──> plan projections ──> geometry workers (web-ifc) ──┐
 (read in place)             │     one small IFC per batch    extract, in parallel  │
                             │                                                      v
                             └──> properties (parsing layer) ──────────> assemble in order ──> .frag
```

1. **The page never holds the file.** The upload's `File` goes to an import worker, which reads it through a synchronous reader: `FileReaderSync` pages (`IfcBlobSource`), or the file held as 256 MB chunks when it fits a budget (`IfcChunkedBytesSource`). One reader feeds web-ifc's load callback and the parsing layer.
2. **The file is indexed once.** A byte-level cursor finds every statement's id, type, offset and length at ~250 MB/s without decoding anything (`IfcStatementCursor`, `IfcLineIndex`).
3. **Geometry is converted as projections.** For a batch of elements, `IfcProjector` writes a standalone IFC holding exactly what their geometry reads: the elements and everything they refer to, plus the four kinds of statement web-ifc looks up in reverse (the openings that void an element — inherited through aggregation — the styles on its representation items, its material association, cut down to the batch, and the material's styled representation), plus the project's units. Each projection is opened in a web-ifc of its own, in a pool of workers (`serveIfcGeometryWorker`). No web-ifc heap ever holds more than one batch.
4. **Assembly replays a single pass.** Workers extract (web-ifc meshes, dedup hash, shell building); the coordinating thread assembles results in processing order, deduplicating geometry and transforms exactly as the single-model importer does (`IfcGeometryExtractor` / `IfcGeometryAssembler`). The model's origin is reproduced bit for bit: the first batch runs alone and reports which element set the origin, and every later batch streams that element first so web-ifc derives the same matrix.
5. **Properties come from the parsing layer, meanwhile.** The property pass reads through `IfcResolverLineApi` — the tape-reading subset of `IfcAPI`, served by the index — instead of opening the file in a second web-ifc, and runs while the geometry workers do.

## Correctness

The output is compared semantically with the original importer's: every item's category, GUID, attributes, relations, its place in the spatial tree, and every sample's geometry (hashed point for point), material and transforms (`parity.ts`). Across eight real models (38–148 MB, IFC2X3 and IFC4, from Tekla, AutoCAD Architecture and two IFC4 exporters, 99k–516k items each) projected batches match the original exactly, and `ifc-projector.test.ts` pins that batches of 1, 7 and 500 elements match a single pass on every fixture. `ifc-line-api.test.ts` pins the parsing layer against `IfcAPI.GetLine` for every line of every fixture.

## What changed in the library

Breaking changes were allowed; the ones made:

- `ProcessData` takes `file` (a `Blob`, read in place), `source` (any `IfcByteSource`) and `geometryBatches` (`{ createWorker, workers, batchBytes, batchElements, probeElements }`).
- `serveIfcGeometryWorker()` is the whole geometry worker script; the app owns the worker, so it bundles like any other.
- `IfcPropertyProcessor` splits into `prepare` and `finish`. Entities are still laid out items-with-geometry first, but GUIDs and relations are written in a different order than before (same content).
- `GridReader.read` takes an `IfcLineApi` and the coordination matrix. `FragmentsIfcUtils` takes `IfcLineApi`.
- Geometry records are typed arrays (`EncodedShell`), and the dedup key is a 64-bit digest.
- `IfcImporter.stats` reports batch counts and heap sizes; `IfcImporter.residentBudget` decides between reading the file into memory and paging it.

Also fixed on the way: embind handles leaked per element (`mesh.geometries`, id vectors, a swept-disk probe), an unused web-ifc instance created after every geometry pass, quadratic `unshift` loops over items, and an `indexOf` per child in the spatial walk.

## Limits and next steps

- **The coordinating thread plans batches serially.** Computing each projection reads statements through the index; for a paged 2.4 GB file that is 31 s (16 s held in memory) of a 68 s conversion, and the workers wait on it. Next: record references during indexing (an adjacency list alongside the index), so planning is a graph walk with no reads, or let workers plan their own batches from a shared index.
- **Geometry shared across batches is meshed once per batch.** A projection carries everything its elements reference, so a representation map used all over the model lands in every batch, and each batch's web-ifc meshes it again. On the 67 MB AutoCAD model projections add up to 1.2× the file at the default 32 MB budget, but 19× at 2 MB, and it gains least from parallelism (2.5×). Next: size batches by the bytes they add rather than their total, and cluster elements that share representation maps.
- **An element is never split across batches**, so a few very expensive elements (huge booleans) bound the speed-up of a model whose time they dominate.
- **The Fragments output caps model size.** The flatbuffers builder cannot grow past 1 GB, which a 2.4 GB IFC reaches halfway (491 MB); a model several times larger needs the format or the builder to change, not the importer.
- **Per-worker memory is mostly web-ifc's.** ~80 MB of each worker's JS heap is web-ifc's schema tables for all three schemas; loading only the file's schema (the subpath imports asked for in #289) would cut it.
- **web-ifc asks, from its source** (see the investigation behind this POC): bind `ResetCache` (defined, never bound); evict the least recently used tape chunk rather than the oldest; free the geometry processor's relation maps without closing the model; and, for D2/D3 in #310, let the loader take an index it did not scan. None is needed for this POC.
- **Not covered by projected batches yet:** second-level space boundaries (`processIfcRelSpaceBoundarySecondLevel`) need the whole model, so they are refused in batch mode; alignments are projected (the alignment, its nests and aggregates) but no test file has any.
- **Browser support:** geometry workers are started from the import worker (nested workers), which Chrome and Firefox support; Safari needs a recent version.

## Running it

```sh
yarn dev   # repo root
# open /packages/fragments/src/Importers/IfcImporter/examples/StreamingImport/example.html
```

Page parameters: `mode` (`parallel`, `streaming`, `legacy`), `workers`, `batchBytes`, `resident` (bytes of file to hold in memory), `pageMB`, `cacheMB`, `view=0` (skip the viewer).

Tools in this folder (Node, run with `yarn tsx` / `node` from `packages/fragments`):

- `bench.mjs --file <ifc> [--mode ...] [--query ...] [--heap out.json] [--profile out.cpuprofile] [--screenshot out.png]` drives Chrome over the DevTools protocol and reports timings, renderer RSS, and each worker's V8 heap and array buffers.
- `convert.ts <repo root> <in.ifc> <out.frag>` converts with any checkout's importer (`BATCH_ELEMENTS=2000` for projected batches).
- `parity.ts <a.frag> <b.frag>` compares two conversions semantically.
- `replicate.ts <in.ifc> <out.ifc> <copies>` builds a large synthetic file from a real one.
