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

- `.frag` files are FlatBuffers. The schema lives at `packages/fragments/flatbuffers/index.fbs` and is generated into `src/Schema/`. Run `yarn fb` after changing it.
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

- **FlatBuffers schema changes** (`flatbuffers/index.fbs`) — run `yarn fb` to regenerate `src/Schema/`.
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
- **Existing `.frag` files don't auto-migrate.** If you change what gets serialized (keys, categories, relation names), document that re-import is required.

## When in doubt

Read the existing examples under `src/FragmentsModels/examples/` — they cover most of the public API and use patterns. For internal mechanics, the test files (`test.ts`) show low-level usage of APIs that aren't part of the public surface.
