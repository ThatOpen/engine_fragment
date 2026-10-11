# Contributing to @thatopen/fragments

Thanks for your interest in contributing. This guide covers how the repo is laid out, how to run it locally, and a few gotchas that aren't obvious from reading the code.

For general guidelines shared across all That Open Company repos (ask-first policy, conventional commits, JSDoc rules, example code rules), read [docs.thatopen.com/contributing](https://docs.thatopen.com/contributing) first. This file only covers what's specific to `engine_fragment`.

## What this is

Fragments is the BIM visualization and persistence layer: a compact file format (`.frag`, a FlatBuffers binary) plus the runtime that loads, renders, edits, and queries it. The runtime splits across the main thread and a Web Worker, with the worker owning the model data and streaming tiles to the main thread for rendering.

## Repo layout

```
packages/fragments/src/
├── FragmentsModels/
│   ├── index.ts              # FragmentsModels: entry point (load, dispose, update)
│   ├── src/
│   │   ├── model/            # FragmentsModel (main thread): raycast, highlight, visibility, edit wrappers
│   │   ├── multithreading/   # Main↔worker messaging (Connection, ThreadController)
│   │   ├── virtual-model/    # Worker-side state: VirtualFragmentsModel, tiles, boxes, materials
│   │   ├── edit/             # Editor + EditHelper: delta models, save/reset/undo/redo
│   │   └── single-threading/ # SingleThreadedFragmentsModel: Node.js / worker-less read+edit
│   ├── examples/             # Runnable tutorials (one folder per feature)
│   └── example.ts            # Standalone dev entry point
├── Importers/
│   └── IfcImporter/          # IFC → .frag conversion
│       ├── index.ts          # IfcImporter: classes to include, relations to index, settings
│       └── src/              # geometry readers (civil, grids, shells), property processor
├── Schema/                   # FlatBuffers-generated TS (don't edit by hand; see `yarn fb`)
├── Migrations/               # Changes to .frag files, and what applies them to older files
│   ├── list/                 # One directory per change: migration, layout snapshot, diff
│   ├── gate.ts               # Generated: what the worker needs to tell that a file is behind
│   ├── registry.ts           # Generated: the steps with their layouts and migrations, loaded on demand
│   └── src/                  # migrate(), and the copier that rewrites a file between layouts
├── Utils/                    # Shared helpers: edit-types, ifc-relations-map, shells, splitter
│   └── ifc-splitter/         # Stream-split a large IFC into smaller files
└── GeometryEngine/           # Primitive geometry (H-profiles, extrusions)
```

### Data model glossary

These four terms appear constantly in the codebase and mean very specific things. Confusing them is the single biggest source of wasted time when working on the worker-side code.

| Term | What it is | Where |
|---|---|---|
| **localId** | BIM identifier (e.g., IFC `expressID`). User-facing. May be sparse. | `Model.local_ids: [uint]` |
| **itemId** | Dense index (0..N) into the parallel arrays `meshes_items`, `global_transforms`, `material_ids`, `representation_ids`, etc. One per unique BIM object. | Array position, not a stored field |
| **sampleId** | Index into `Meshes.samples[]`. A render instance carrying `item + material + representation + local_transform`. Multiple samples can reference the same item. | `Meshes.samples[]` |
| **representationId** | Index into `Meshes.representations[]`. The geometry shape (SHELL, CIRCLE_EXTRUSION). | `Meshes.representations[]` |

Key conversions — **do NOT rebuild these, they already exist:**

- **itemId → localId:** `local_ids[meshes_items[itemId]]`. `meshes_items` is literally an itemId-indexed array of localIdIndices. See `raycast-controller.ts`'s `localIdsFromItemIds` for the canonical two-lookup pattern.
- **sampleId → itemId:** `samples[sampleId].item`.
- **sampleId → representationId:** `samples[sampleId].representation`.

Before adding any `Map<number, number>` or `Uint32Array` inverse index inside the worker, check whether the flatbuffer already encodes what you need. Most of the time it does.

### Key mental model

- `.frag` files are FlatBuffers. The schema lives at `packages/fragments/flatbuffers/index.fbs` and is generated into `src/Schema/`. Run `yarn fb` after changing it, then `yarn migration:new` (see [Changing what a .frag holds](#changing-what-a-frag-holds)).
- **Main thread** (`src/FragmentsModels/src/model/`) exposes the public API (`model.raycast()`, `model.highlight()`, etc.) and forwards most calls to the worker.
- **Worker** (`src/FragmentsModels/src/virtual-model/` + `multithreading/`) holds the flatbuffer, builds tiles, runs raycasts, serves queries. Messages flow as `model.threads.invoke(modelId, "methodName", args)`.
- **Edits produce a delta model.** `editor.edit()` generates a separate `.frag` delta buffer that's loaded as its own `FragmentsModel` alongside the base. Reads must consider both (raycast, highlight, etc.). `editor.save()` flattens delta into a new committed buffer and reloads.
- **The IfcImporter is separable.** It runs independently of the runtime and can be used in Node (`node-example.ts`). It produces `.frag` bytes, nothing else.

## Setting up

```bash
git clone https://github.com/ThatOpen/engine_fragment.git
cd engine_fragment
yarn install
yarn dev
```

`yarn dev` starts a Vite server that serves every `example.ts` in the repo. Browse to the printed URL and pick one. Changes to source files hot-reload.

## Running examples locally against your changes

Examples import fragments from `../../../index` (source), so edits to `packages/fragments/src/` show up immediately without rebuilding.

Two exceptions that need explicit builds:

- **FlatBuffers schema changes** (`flatbuffers/index.fbs`) — run `yarn fb` to regenerate `src/Schema/`. It runs flatc 25.2.10 on any platform: the binary is downloaded once into `.tmp/` and checked against a pinned hash (set `FLATC` to use your own).
- **Worker changes** — the worker is bundled separately. If you change anything under `FragmentsModels/src/virtual-model/` or `multithreading/`, and your example points at the pre-built worker URL, you need:
  ```bash
  yarn workspace @thatopen/fragments build
  ```
  Most examples in this repo point the worker at the local source (`"./src/multithreading/fragments-thread.ts"` or equivalent), which hot-reloads like the rest.

## Adding a feature

1. Open an issue first (ask-first policy, per [docs.thatopen.com/contributing](https://docs.thatopen.com/contributing)).
2. Branch from `main`.
3. Code + add or update an example under `src/FragmentsModels/examples/<feature>/` with an `example.ts` and `example.html`. Examples double as docs (they're deployed to the docs site) and as regression tests.
4. Update `CHANGELOG.md` under an `## Unreleased` heading if the change is user-visible. Mark breaking changes explicitly with `### ⚠ BREAKING CHANGES`.
5. `yarn build-core` to verify the library still builds.
6. Open a PR with a conventional-commits title (`feat:`, `fix:`, `feat!:` for breaking, etc.).

## Fixing a bug

1. Try to reproduce against `src/Importers/IfcImporter/test.ts` or `src/FragmentsModels/test.ts` first — both are gitignored sandboxes meant for ad-hoc experiments. If you need an IFC or `.frag` to reproduce, drop it in `resources/` and reference it by relative URL.
2. If reproduction needs new library behavior, write the minimal patch + a test case in `example.ts` (or a dedicated example if the feature warrants one).
3. PR title: `fix: <one-line description>`.

## Gotchas

- **Delta models are separate `FragmentsModel` entries in `fragments.models.list`.** Raycasting or highlighting must iterate the list, not just call on the base model, or edited items will be missed.
- **`getItemsWithGeometry()` returns `Item` objects, not `localId` numbers.** These have a back-reference to the `FragmentsModel` and can't be passed through `postMessage`. Call `item.getLocalId()` first.
- **`representationFromGeometry()` expects a `Uint32Array` index.** `THREE.BoxGeometry` and friends use `Uint16Array` by default; cast explicitly or normals/indices will be misread.
- **Edit request `tempId`s only live within a single `editor.edit()` batch.** Split across two calls and the second can't reference entities created in the first.
- **`CREATE_SAMPLE.data.item` is the global transform's tempId, not the item's.** Common footgun.
- **Existing `.frag` files only follow a change if a migration carries them.** If you change what gets serialized (the schema, but also keys, categories, relation names), add one: see [Changing what a .frag holds](#changing-what-a-frag-holds).

## Changing what a .frag holds

Apps store `.frag` files and keep loading them after they update this package, so a change to what a file holds needs a migration for the files written before it. Migrations live in `packages/fragments/src/Migrations/list/`, one directory per change, named `<UTC timestamp>_<slug>`. A file records the timestamp of the newest one its writer knew as `metadata.revision`, and `load()` (or `migrate()` in Node) runs the ones it is behind on.

```bash
yarn workspace @thatopen/fragments migration:new <slug>
```

What you get depends on whether `index.fbs` changed since the newest directory:

| The schema | The directory holds | You write |
|---|---|---|
| did not change | `migration.ts`, `migration.test.ts` | the migration and its test |
| only grew (fields added at the end of a table) | `schema.fbs`, `schema.json`, `diff.json` | nothing: old files just lack the new fields |
| broke (a field removed, moved, retyped; any change to a struct) | the above plus `types.ts`, `migration.ts`, `migration.test.ts` | one handler per field `types.ts` lists as required, and the test |

`schema.json` is the binary layout of the schema at that point. It is what lets this package read a file of a layout it no longer has generated code for, so nothing in `src/Schema/` is kept for old files. `diff.json` and `types.ts` are derived from two consecutive layouts; never edit them, run `yarn workspace @thatopen/fragments migration:sync`.

Only a small gate is part of every load: the ids of the steps, whether each has work to do, and the probes below (`src/Migrations/gate.ts`, generated). The worker holds it and answers whether a file is behind. Everything else here (layouts, copier, migrations) is loaded by the main thread through a dynamic import, the first time a file needs it: the file comes back from the worker, the main thread runs the copies, and what the edit steps ask for goes back with the file for the worker to apply, since the worker has the editor. Keep it that way: nothing the worker or the entry imports statically may import `registry.ts`, `src/core.ts` or a `migration.ts`, and nothing in that lazy part may import the model classes (`src/Migrations/lazy.test.ts` checks both).

A migration has up to two steps, which share a `ctx` created per file:

- **`layout`**: handlers by `Type.field`, called while the file is copied to the new layout. The copier carries every field it can by name, so a field that only moved needs nothing. A field that was removed needs a handler returning `drop`, a new required field or one that changed type needs a handler returning its value. A handler receives the node of the old file that owns the field. You can also give one for a field that did not change, to change its content: that is one pass over the bytes and the cheap way to do it.
- **`edit`**: `(ctx) => requests`, for changes that need the editor's bookkeeping (items, relations, samples). It runs after every `layout` step and works from what `layout` left in `ctx`. It is not given the file: a handler can read any field while the file is copied, where a model to read from would cost building one (6 s on a 190 MB model). The requests are applied with `edit()`, a full rewrite that took 5 s on that model against 0.7 s for a copy, so reach for it only when a handler cannot do the job.

`report(ctx)` is what the app is told about the file, through `onModelMigrated`.

Rules that are easy to miss:

- **Layout steps all run before edit steps.** A `layout` handler cannot count on the `edit` of an older migration having run.
- **Test with a file of the previous revision.** For a layout from a released version, convert an IFC from `resources/ifc/` with that version off npm and commit it under `fixtures/`. `Copier.write(schema, object)` writes a file of any layout from plain objects when no real one has the data you need.
- **A file with no revision is placed by probes.** Files written before the revision stamp carry nothing to tell them by, so a step older than the stamp can have a `probe.ts` next to its migration: a function that says whether such a file predates the step. It is part of the gate, so it must import nothing but its type.
- **Ids only go up.** CI fails a migration older than one already on the base branch, because every file written in between would skip it. Rename the directory with a current timestamp after rebasing.
- **`yarn workspace @thatopen/fragments migration:check`** is what CI runs. It fails when `index.fbs` changed without a migration, when a migration leaves a field of its schema change undecided or has a handler for a field that does not exist, when a generated file is stale, and when a scaffold still has its `TODO`. For each schema change it prints what became of every field: decided by a handler, carried by the copier, or new and left for older files to lack.

## When in doubt

Read the existing examples under `src/FragmentsModels/examples/` — they cover most of the public API and use patterns. For internal mechanics, the test files (`test.ts`) show low-level usage of APIs that aren't part of the public surface.
