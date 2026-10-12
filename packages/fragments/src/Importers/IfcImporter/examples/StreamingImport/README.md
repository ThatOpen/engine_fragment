# Converting large IFC files in the browser, without splitting

Proof of concept for [#310](https://github.com/ThatOpen/engine_fragment/issues/310): convert an IFC file of any size to one Fragments model on a web page, in workers, without the splitter and without running out of memory — and measure it.

## Result

Measured in headless Chrome on an M2 Max laptop (12 cores, 32 GB), converting each file from the upload's `File` in the demo page and loading the result into the viewer. "Legacy" is the importer as it was on `feat/advanced-stream-parsing` (file read into memory, opened twice in web-ifc); "parallel" is this POC with 8 geometry workers. RSS is the renderer process's peak resident memory, viewer included.

| Model | IFC | Legacy | Parallel | Speed-up | Legacy RSS | Parallel RSS | Largest web-ifc heap, legacy → parallel |
|---|---|---|---|---|---|---|---|
| IFC4, TrimBIM export | 586 MB | 85.1 s | 16.3 s | 5.2× | 6.4 GB | 6.0 GB | 1,189 → 160 MB |
| IFC4, TrimBIM export | 148 MB | 40.0 s | 6.7 s | 6.0× | 2.7 GB | 3.5 GB | 390 → 160 MB |
| Tekla (IFC2X3) | 139 MB | 219.4 s | 32.3 s | 6.8× | 3.6 GB | 3.5 GB | 779 → 160 MB |
| IFC4, in-house exporter | 116 MB | 42.7 s | 7.2 s | 5.9× | 2.6 GB | 3.2 GB | 314 → 160 MB |
| Tekla (IFC2X3) | 80 MB | 37.6 s | 8.6 s | 4.4× | 2.2 GB | 3.2 GB | 409 → 160 MB |
| AutoCAD Architecture (IFC2X3) | 67 MB | 46.6 s | 12.4 s | 3.8× | 1.6 GB | 4.2 GB | 192 → 160 MB |
| Tekla (IFC2X3) | 66 MB | 38.8 s | 7.9 s | 4.9× | 2.1 GB | 3.3 GB | 398 → 160 MB |
| Tekla (IFC2X3) | 61 MB | 14.3 s | 4.0 s | 3.6× | 2.3 GB | 2.9 GB | 230 → 160 MB |
| Tekla (IFC2X3) | 38 MB | 18.7 s | 4.6 s | 4.1× | 1.8 GB | 2.9 GB | 230 → 160 MB |
| 4× the 586 MB model (synthetic) | 2.4 GB | fails | 68.3 s | — | — | 5.4 GB | — → 160 MB |

At 2.4 GB the legacy importer cannot start: Chrome refuses to read a `Blob` over 2 GB into one `ArrayBuffer`. Reading the file in place and opening it as one web-ifc model gets past that, but did not finish in 25 minutes: its tape outgrows web-ifc's default 2 GiB `MEMORY_LIMIT`, and paging then thrashes (raising the limit instead meets wasm32's 4 GB ceiling). In parallel mode the same file converts in 68 s with 8 workers (61 s with the whole file held in memory), or in 163 s with 2 workers at 4.5 GB peak RSS, and its 491 MB model loads into the viewer in 14 s.

**Memory is a dial, not a wall.** No web-ifc heap exceeds one batch (160 MB here, whatever the file size), and the coordinating thread's JS heap stays small (170 MB for the 586 MB model, 424 MB for 2.4 GB), so no single heap grows toward a limit. Total memory is set by the number of workers — each costs ~330 MB, mostly a web-ifc heap plus web-ifc's schema tables — and by whether the file is held in memory (`residentBudget`, 1 GB by default) or paged. On the 586 MB model, conversion only:

Measured before batches were budgeted by cost, which changes where batches are cut but not what a worker holds:

| Geometry workers | 1 | 2 | 4 | 8 | one whole-file model |
|---|---|---|---|---|---|
| Conversion | 73.0 s | 39.6 s | 22.6 s | 15.8 s | 76.3 s |
| Peak RSS | 3.7 GB | 4.4 GB | 5.5 GB | 6.8 GB | 3.8 GB |
| Largest web-ifc heap | 160 MB | 160 MB | 160 MB | 160 MB | 1,189 MB |

With 8 workers the parallel pipeline uses more memory than legacy did on most of these files, in exchange for 3.6–6.8× the speed; with one worker it uses less than legacy and the same as a single whole-file model, but with a web-ifc heap that no longer grows with the file. The demo picks `cores − 2` workers, up to 8.

Where the time goes: web-ifc's C++ is 70–85% of single-threaded geometry time (on Tekla models, mostly boolean operations for holes), so it is what parallelism buys back. The JS side of geometry (shell building, dedup hashing, buffer copies) is 12–25%; of it, shell building itself is under 3% of the total, so rewriting it on typed arrays is worth doing but will not move these numbers much.

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

## How batches are planned

Batches are consecutive slices of the single pass's processing order — element classes by ascending type code (annotations last), ids ascending within a class — so results can be assembled as they arrive, in order, with only batches that finish early waiting their turn.

1. **The first batch runs alone.** 32 elements, opened as usual, streamed one at a time so it can report which element set the model's origin (the "primer"). Every later batch includes the primer's closure and streams it first.
2. **Each next batch is planned when a worker is free.** It starts from the project's closure (units, contexts) and the primer, then takes elements in order, each adding everything its geometry reads that is not in yet. It is cut at the first of three caps: an element count (at most 2,000, and at most a quarter of an even share per worker), a projection size (32 MB, which bounds the worker's web-ifc heap), and an **estimated cost**.
3. **Cost is estimated while walking each element's closure**: a base per element, geometry bytes, boolean operations and openings (what makes Tekla members slow), and for each `IfcMappedItem`, its representation map again. The weights are rough milliseconds from measured models; finished batches calibrate how many milliseconds a unit is actually worth on this machine, and each batch is cut at a cost worth `targetBatchMs` (1 s).

Cost matters because exporters write similar elements next to each other. Cut by count, one batch held a run of 1,344 boolean operations on one model, and 150 instances of a 22,746-face mapped BREP on another, and that one batch bounded the whole conversion. Cut by cost, the same runs spread over the workers: on the three models where it mattered, 18.7 → 11.7 s, 6.7 → 4.6 s and 10.9 → 7.9 s, with no change on the rest.

**What batching duplicates.** Statements shared by elements in different batches — units, styles, materials, shared representation maps — go into each batch that needs them, so each batch's web-ifc parses them again. It does not mesh them again because of batching: web-ifc clears its geometry after every element (`StreamMeshes` calls `Clear()`), so even a single whole-file pass meshes a mapped representation once per instance. At the default budgets projections add up to 1.05–1.2× the file; cost budgeting raises that where it splits a run of instances (8× on the model with the mapped BREP), which is a good trade because meshing, not parsing, dominates. The JS side does rebuild a shell another batch already built; a set of known dedup digests broadcast to the workers would stop that.

**Why not cluster, as the splitter does.** The splitter clusters for correctness — a host with its openings and their fillers, an aggregate with its parts — then bin-packs clusters by element count, largest first. Projections do not need the correctness clusters: they pull in the openings and aggregate voids an element's geometry reads, whatever batch it is in. And clustering by shared geometry would be the wrong direction: the elements sharing a large mapped BREP are exactly the costly ones, so putting them together recreates the slow batch. What carries over from the splitter is its bin packing, with cost instead of count as the weight — which is what the cost budget does along the processing order. Reordering elements across batches (clustering proper, or longest-first scheduling) would conflict with in-order assembly: it means either holding every result until the order is complete, or giving up byte-for-byte parity for equivalent output.

**The larger fix is upstream**: a web-ifc mesh cache for mapped representations that survives `Clear()` — mesh a representation map once per model rather than once per instance. On the model with the mapped BREP that is 150 meshings of 110 ms each becoming one, in any pipeline.

## Writing several models

One model in one file gives the viewer nothing to draw until all of it is loaded, in one worker, properties included. `splits` writes a conversion as several models instead — what cutting the IFC up with the splitter and converting each piece gives, but from one conversion, so with one origin, one set of local ids, and no element converted twice:

```ts
const manifest = await importer.process({
  file,
  geometryBatches: { createWorker },
  splits: {
    geometry: { maxItems: 20_000 },
    onSplit: (split) => store(split.id, split.bytes), // as each is written
  },
});
```

- **Geometry splits** hold what drawing, picking and hiding read: the meshes, and the local id and category of the item each belongs to. Nothing else.
- **The reference split** holds the grids and alignments. The viewer draws those from their attributes (`getGrids`, `getAlignments`), so they belong with what is drawn: a small model (95 KB for the 20 grids of the 148 MB file) that needs nothing from the data split, and is left out of a conversion that has neither.
- **The data split** holds everything else, for every item, elements included: attributes, relations, GUIDs, the spatial structure and the metadata. It has no meshes. As far as queries go it is the whole model: `getItemsData` with its relations, `getSpatialStructure` and GUID lookups answer as they do on a single file, and it can be loaded into a thread group of its own, away from the workers that draw.
- **The manifest** lists the splits and says where each item is: `findItemSplits(manifest, localId)` gives the split with its geometry and the split with its attributes. Local ids are the same in every split, so an item picked in a geometry split is read from the data split by the same id.

**Why all data moves out, and not only property sets.** What a converted model is made of, in raw bytes, measured on a single pass:

| Model | IFC | Raw .frag | Geometry | Relations | GUIDs | Elements' attributes | Other attributes | Spatial structure |
|---|---|---|---|---|---|---|---|---|
| Tekla (IFC2X3) | 38 MB | 29 MB | 32% | 27% | 11% | 17% | 2% | 7% |
| AutoCAD Architecture (IFC2X3) | 67 MB | 22 MB | 42% | 26% | 16% | 3% | 4% | 4% |
| Tekla (IFC2X3) | 139 MB | 121 MB | 42% | 23% | 9% | 14% | 2% | 7% |
| IFC4, TrimBIM export | 148 MB | 82 MB | 20% | 28% | 12% | 18% | 7% | 8% |

Geometry is 20–42% of a model. Property sets, types and materials ("other attributes") are 2–7%: most of what rendering never reads belongs to the elements themselves — their relations, GUIDs and attributes. So a geometry split keeps an element's meshes and identity, and its data goes where the rest of the data is.

**How splits are planned.** With the batches. Elements are counted into the current split in processing order, and the batch that would overfill it is cut short, so a split is a run of consecutive batches and no batch belongs to two. A split is also ended when its model passes `maxBytes`, which only shows once its geometry is written. Each split is assembled on its own, into a builder of its own, and handed to `onSplit` as soon as its last batch is assembled, while later batches are still in the workers; `onSplit` is awaited, so a slow consumer holds the conversion back rather than letting splits pile up. The property pass writes the data split into its own builder too: nothing ties the two passes any more, since "items with geometry first" was only ever a constraint within one model. Grids and alignments come from the end of the geometry pass, and are handed out then, as the reference split. The data split is last, once the property pass has laid it out.

**What it buys.** Same machine and setup as above; splits of 20,000 elements, loaded with up to 8 fragments workers and one more for the data split. Measured before grids and alignments had a split of their own, which adds one small model to load on the files that have them. "Viewer load" hands the viewer everything after the conversion, as one model or as all its splits together. The other two columns load splits as they are written, which is what the demo does:

| Model | IFC | Splits | Viewer load, one model → splits | First geometry on screen | File to everything loaded | Output |
|---|---|---|---|---|---|---|
| Tekla (IFC2X3) | 38 MB | 3 + data | 3.1 → 2.3 s | 7.9 → 3.8 s | 7.9 → 5.2 s | 29 → 30 MB |
| IFC4, TrimBIM export | 148 MB | 10 + data | 2.6 → 0.8 s | 9.4 → 3.6 s | 9.4 → 7.5 s | 82 → 84 MB |
| Tekla (IFC2X3) | 139 MB | 11 + data | 16.5 → 3.6 s | 48.5 → 8.3 s | 48.5 → 33.4 s | 121 → 126 MB |
| IFC4, TrimBIM export | 586 MB | 10 + data | 4.1 → 1.0 s | 20.0 → 5.7 s | 20.0 → 17.0 s | 276 → 279 MB |

Loading is 1.3–4.6× faster, the first geometry is on screen in a sixth to a half of the time, and everything is loaded 0.5–0.7 s after the conversion ends instead of a whole viewer load after it. Conversion itself took 2–4% longer. These are single runs.

Split size is the dial. Viewer load at 50,000 / 20,000 / 10,000 elements per split: 2.9 / 2.3 / 1.0 s, 0.8 / 0.8 / 0.7 s, 7.7 / 3.6 / 4.3 s and 1.1 / 1.0 / 1.0 s for the four models above. Smaller splits help until there are more of them than workers to load them; 20,000 is the default because it is where the heaviest model stopped improving.

**What it costs.**

- **Geometry is deduplicated within a split, not across them**, so a shape used in two splits is stored in both: 1–4% more output on these models.
- **Memory.** Each split loads in a fragments worker of its own while there are workers to spare, so peak RSS during the run was 0.4–0.5 GB higher on the three smaller models (2.6 → 3.1, 3.2 → 3.6 and 4.0 → 4.5 GB) and unchanged on the largest.
- **The app routes.** The library writes the splits and the manifest; nothing in `FragmentsModels` loads a manifest yet. The app loads each split as a model and sends a request to the right one — highlight to the geometry split, properties to the data split — as the demo does when an element is clicked. The `loadSplit` discussed in [#180](https://github.com/ThatOpen/engine_fragment/issues/180) would hide that.
- **A geometry split answers data queries with nothing**, not with an error: no attributes, no GUIDs, an empty spatial structure. Editing or saving one has not been tried; the edit code reads attributes for every item, which a geometry split does not have.

## Correctness

The output is compared semantically with the original importer's: every item's category, GUID, attributes, relations, its place in the spatial tree, and every sample's geometry (hashed point for point), material and transforms (`parity.ts`). Across nine real models (38–586 MB, IFC2X3 and IFC4, from Tekla, AutoCAD Architecture and two IFC4 exporters, 99k–516k items each) projected batches match the original exactly, and `ifc-projector.test.ts` pins that batches of 1, 7 and 500 elements match a single pass on every fixture. `ifc-line-api.test.ts` pins the parsing layer against `IfcAPI.GetLine` for every line of every fixture.

Splits are compared with the single model they replace by putting them back together: each item's data from the data split, its geometry from the geometry split the manifest names (`dumpSplits`). `splits.test.ts` pins that on every fixture for splits cut by count and by size, checks the manifest against what each split holds, and loads every split in the viewer's model. On four of the real models (38–148 MB; 99k, 100k, 357k and 516k items) the splits hold exactly the single model's items, attributes, relations, GUIDs, spatial structure, placements, materials and transforms.

Shells are compared as shapes rather than as lists of numbers, because splitting changes which copy of a shape is stored. Geometry is deduplicated by a key made of a mesh's vertices rounded to 0.1 mm and of its size, not of its triangles. A single model stores two meshes with the same key once, as the first of them; when a split boundary falls between the two, each is stored as itself. On those four models 4,751, 0, 40,241 and 2,894 items have such a shell. Its points are within 0.2 mm of the single model's, point for point on all but 3,476 of them: fasteners in one model, whose 12- to 60-point shells hold the same points in another order, 57 of them with a flat face cut into loops another way. The comparison counts these (`tolerated`) and fails on anything else. Grids and alignments are compared by what they hold, since their local ids come after the last one geometry used, and splits use a few more ids than one model does; and they are checked to be in the reference split and nowhere else. Only grids, though: no test file has an alignment.

## What changed in the library

Breaking changes were allowed; the ones made:

- `ProcessData` takes `file` (a `Blob`, read in place), `source` (any `IfcByteSource`) and `geometryBatches` (`{ createWorker, workers, batchBytes, batchElements, probeElements, targetBatchMs }`).
- `serveIfcGeometryWorker()` is the whole geometry worker script; the app owns the worker, so it bundles like any other.
- `IfcPropertyProcessor` splits into `prepare` and `finish`. Entities are still laid out items-with-geometry first, but GUIDs and relations are written in a different order than before (same content).
- `GridReader` and `FragmentsIfcUtils` read through an `IfcLineApi`, which web-ifc's `IfcAPI` satisfies, so existing calls are unchanged. `new GridReader(lines, modelId, coordinationMatrix)` reads grids from the parsing layer, with no web-ifc model open, and `IfcLineApi` has `GetRawLineData` for it.
- Geometry records are typed arrays (`EncodedShell`), and the dedup key is a 64-bit digest.
- `IfcImporter.stats` reports batch counts, per-batch times and heap sizes; `IfcImporter.residentBudget` decides between reading the file into memory and paging it.
- `ProcessData` takes `splits` (`{ geometry: { maxItems, maxBytes }, data: { group }, onSplit }`), and `process` then resolves to an `IfcSplitManifest` instead of a model: geometry splits, a reference split for grids and alignments, and a data split. `findItemSplits` looks an item up in it. The shape follows the `splits` config discussed in #180, with two differences: what is data is decided by the importer rather than by a `splitBy` callback, because an element's geometry and its data go to different splits; and `maxSize` is `maxItems`, next to a `maxBytes`. Grouping elements by a `splitBy` (by storey, say) is left for later.
- Writing a model's `Meshes` table moved out of `IfcGeometryProcessor` into `MeshesWriter`, one per model written.

Also fixed on the way: embind handles leaked per element (`mesh.geometries`, id vectors, a swept-disk probe), an unused web-ifc instance created after every geometry pass, quadratic `unshift` loops over items, and an `indexOf` per child in the spatial walk.

## Answers to the plan's questions for web-ifc's source

From reading web-ifc 0.0.77 (tag `0.77`):

1. **What persists after `StreamMeshes`?** Per element, nothing: it calls `IfcGeometryProcessor::Clear()` after each one — which also means shared geometry, including mapped representations, is meshed again for every element that uses it. What leaks are embind handles JS never deletes (`mesh.geometries`, `GetGeometry` copies, id vectors), fixed here. `ResetCache` is defined in C++ but never bound, hence "is not a function".
2. **What does open cost per statement?** About 48–52 bytes of line index (a heap `IfcLine`, a hash-map entry, a per-type id), plus the tape at ~0.9× the file. `MEMORY_LIMIT` can page the tape but never the index. The six relation maps are built lazily with the geometry processor, at ~52–56 bytes per key.
3. **How is the origin picked?** From vertex 0 of the first geometry with any vertices, in the first element flattened. `SetGeometryTransformation` does not reproduce it exactly: it multiplies in a different order, and rounding then flips a few stored transforms (seen on 10 of 231k items). Streaming the element that set it first does reproduce it exactly.
4. **Which reverse edges does geometry follow?** `IfcRelVoidsElement` (also given to aggregated children of a voided parent), `IfcStyledItem`, `IfcRelAssociatesMaterial`, `IfcMaterialDefinitionRepresentation`; `IfcRelNests`/`IfcRelAggregates` only for alignments. The project's units are read once.
5. **Does geometry read lines only through the loader's id API, and could the index be supplied?** It reads through the loader's id-based API; the index and maps are built by scanning and cannot be supplied without a change (D2).
6. **Which calls can page?** `GetLine`, `GetHeaderLine`, `StreamMeshes`/`GetFlatMesh`, and building the geometry processor; not `GetLineIDsWithType`/`GetAllTypesOfModel`. Eviction drops the oldest chunk, not the least recently used, and with the defaults (64 MB tape chunks, 2 GiB limit) nothing pages below a ~2.2 GB file.
7. **Can the tokenizer append to a model?** No; opening reads the file twice (a newline count to size the index, then tokenizing). Projections sidestep D3's asks: each batch is a small file opened as usual.

## Limits and next steps

- **The coordinating thread plans batches serially.** Computing each projection reads statements through the index; for a paged 2.4 GB file that is 31 s (16 s held in memory) of a 68 s conversion, and the workers wait on it. Next: record references during indexing (an adjacency list alongside the index), so planning is a graph walk with no reads, or let workers plan their own batches from a shared index.
- **Batch cost is estimated, then calibrated.** The weights are from a handful of models; a model whose cost comes from something they do not count (a curve-heavy or tessellation-heavy exporter) is balanced by the calibration only after its first slow batches. An element is never split, so a single very expensive element still bounds a conversion.
- **The Fragments output caps model size at 1 GiB.** The flatbuffers JS builder grows by doubling and refuses to grow past 1 GiB (`growByteBuffer` throws once the buffer has bit 30 set), and the format's signed 32-bit offsets would cap a buffer at 2 GiB anyway. How soon that bites depends on the exporter: output was 0.2× the IFC on the TrimBIM exports but 0.65–0.87× on the Tekla ones, so a detailed steel model reaches the cap at about 1.2–1.5 GB of IFC — before any importer memory limit. The last doubling also briefly holds 1.5× the buffer. With `splits`, geometry no longer meets the cap: each geometry split has a builder of its own and is ended at `maxBytes`. The data split is still one builder, and data was 58–80% of these models, so the cap moves out by a factor of 1.25–1.7 rather than away. Past that the data has to be cut up as well.
- **Data is one split.** Cutting it up means relations that point from one split into another, and nothing in the viewer follows those: `getItemsData` resolves a relation within the model it is asked in. That needs the router from #180 first, and then a plan for which items go together — an element with the property sets only it uses, shared types and materials apart.
- **Splits follow processing order**, so each holds a run of one or two element classes, spread over the whole building. That is enough for loading in parallel, and useless for loading a part of the building first. A `splitBy` that groups elements by storey or by discipline before they are batched is the next step for the config.
- **Per-worker memory is mostly web-ifc's.** Each geometry worker's JS heap reaches ~80 MB, much of it web-ifc's JS module, which carries all three schemas' tables; loading only the file's schema (the subpath imports asked for in #289) should cut it.
- **web-ifc asks, from its source** (see the investigation behind this POC): bind `ResetCache` (defined, never bound); evict the least recently used tape chunk rather than the oldest; free the geometry processor's relation maps without closing the model; and, for D2/D3 in #310, let the loader take an index it did not scan. None is needed for this POC.
- **Not covered by projected batches yet:** second-level space boundaries (`processIfcRelSpaceBoundarySecondLevel`) need the whole model, so they are refused in batch mode; alignments are projected (the alignment, its nests and aggregates) but no test file has any.
- **Browser support:** geometry workers are started from the import worker (nested workers), which Chrome and Firefox support; Safari needs a recent version.

## Running it

```sh
yarn dev   # repo root
# open /packages/fragments/src/Importers/IfcImporter/examples/StreamingImport/example.html
```

Page parameters: `mode` (`parallel`, `streaming`, `legacy`), `workers`, `batchBytes`, `resident` (bytes of file to hold in memory), `pageMB`, `cacheMB`, `view=0` (skip the viewer); `splits` (write several models, as the checkbox does), `splitItems` and `splitMB` (their size), `splitLoad=after` (load them when the conversion is done, not as they are written).

Tools in this folder (Node, run with `yarn tsx` / `node` from `packages/fragments`):

- `bench.mjs --file <ifc> [--mode ...] [--query ...] [--heap out.json] [--profile out.cpuprofile] [--screenshot out.png]` drives Chrome over the DevTools protocol and reports timings, renderer RSS, and each worker's V8 heap and array buffers.
- `convert.ts <repo root> <in.ifc> <out.frag>` converts with any checkout's importer (`BATCH_ELEMENTS=2000` for projected batches; `SPLIT_ITEMS=20000` writes splits and `<out>.manifest.json`).
- `parity.ts <a.frag> <b.frag>` compares two conversions semantically. Either side can be a manifest, compared as the model its splits add up to.
- `replicate.ts <in.ifc> <out.ifc> <copies>` builds a large synthetic file from a real one.
