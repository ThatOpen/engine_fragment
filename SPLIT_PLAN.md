# Splitting #305 into reviewable PRs

How to land `feat/load-abort-signal` (#305) as a stack of six PRs on `upstream/main`. The boundaries were verified by replaying the commits onto `upstream/main` and running `tsc -p tsconfig-build.json` and `vitest` at each one, except where a commit is marked _not replayed_.

## Why the branch can't merge as it is

- **12 commits at the bottom are already upstream.** Everything up to `e80ba6f` is on `upstream/main`: #294, #304, and the fixes for issues #298–#303. Rebase onto `upstream/main` and drop them; the split covers the branch's own commits, from `4b39c26` on.
- **`_invoke` doesn't exist on main.** `b48ef60` introduces it, already routed by uid, so every typing commit conflicts on its own. A new mechanical commit, P0, adds `_invoke` routed by `modelId` so the typing can merge first.
- **The abort work has to land before the uid work.** `b48ef60` rewrites `load()`: cherry-picked without `4b39c26`–`d3f0b16` it conflicts in 8 files. Only `2d759f1` (restoring `abort(modelId)`) depends on uid.
- **Rebasing hides a hang.** Upstream `7516383` keys the `update(true)` fence by `request.modelId`, but after the uid change FINISH messages carry `uid`, so `update(true)` never resolves. Git merges it cleanly and `tsc` passes. Fold a fix of about 40 lines into the rebased `b48ef60`: `MeshManager` fences keyed by `ModelUid` and cleared in `_remove`, `RequestsManager.onFinish(seq, request.uid)`, `ViewManager.viewDispatched(model._uid, …)`. Port upstream's `mesh-manager-multi-model-fence.test.ts` with it.

## The stack

In merge order. Each PR stacks on the previous one.

| PR  | Scope                                            | Size                                                                    | Mergeable alone |
| --- | ------------------------------------------------ | ----------------------------------------------------------------------- | --------------- |
| 1   | Route model calls through `_invoke` (P0)         | 14 source files, +165/−309                                              | yes             |
| 2   | Typed RPC, and rebuilding what the worker copies | 2a: 14 source files, +258/−68; 2b: 19 source files, +205/−210           | on PR1          |
| 3   | `load({ signal })` and message-layer hardening   | 5 source files, +170/−95; tests +442                                    | on PR2          |
| 4   | uid and synchronous dispose                      | 34 source files, +744/−480, measured with `99be14b`, which moves to PR6 | on PR3          |
| 5   | Editor state by uid, `save()` and delta races    | 4 source files, +298/−156; CONTRIBUTING.md                              | on PR4          |
| 6   | Typed worker → main messages                     | not measured                                                            | on PR4          |

### PR1 — route model calls through `_invoke`

A new commit: every `threads.invoke(model.modelId, …)` goes through `FragmentsModel._invoke`, routed by `modelId`. The hunks are lifted from `b48ef60`, plus about 20 hand-written lines. No test changes.

Review: mechanical. The one behavior detail is that the delta model is looked up through `_getDeltaModel()` rather than by invoking `deltaModelId` directly.

### PR2 — typed RPC, and rebuilding what the worker copies

- 2a: `11e8e78` type `_invoke` · `6610477` transforms as `THREE.Matrix4` · `e434dda` drop dead `@ts-ignore` · `68fa665`′ `Cloned<T>` · `b9e85a1` `RemoteMethods` allowlist
- 2b: `7595c93`′ colors as `THREE.Color` · `8813c97` typed transform rebuild · `4d7e496` `getBuffer()` type · `a7606b7` attribute types as strings · `d2603f0` typed `any` methods, `getSequenced()` rebuild · `4f19562` drop the casts · `e090aa1` empty metadata instead of null (_not replayed_)

′ adapted from uid to `modelId` during the rebase (about 8 lines in `68fa665`).

Review: `Cloned<T>`; completeness of the `RemoteMethods` allowlist; worker signatures widened to accept `undefined` for "all items"; colors restored without a second sRGB conversion.

Public type changes: `AttributeData.type` and `ItemAttributes.setType()` take a string; `getBuffer()` resolves to `ArrayBuffer | Uint8Array`; `getSequenced()` can resolve to `null`.

### PR3 — `load({ signal })` and message-layer hardening

`4b39c26` load abort signal · `a2ca482` remove `abort()` · `bf1237e` guard against an unloaded model · `8a84f60` cleanup · `d3f0b16` fix types · `3e9cb9d` answer an uncopyable answer with an error

`bf1237e` and `d3f0b16` are tangled with `a2ca482` and `4b39c26`, so they can't be a prerequisites PR of their own.

Behavior: removes `abort()` until PR4 restores it, and loading a `modelId` that is in use throws. **Merge PR3 and PR4 back to back, with no release in between.**

### PR4 — uid and synchronous dispose

`b48ef60`′ key models by uid, with the fence fix folded in · `2d759f1` restore `abort(modelId)` · `f2a6ab5` don't copy a disposed model's tiles back · `c4ce4c4` name the `modelId` when a disposed call rejects

`b48ef60` is an atomic change of the key the main thread and the workers use for each other, and can't be split further. Rebased onto the typed code it shrinks from 45 source files to 34.

Review: uid used consistently on both threads; dispose semantics (`keepInScene`, `finalizeDispose`, materials); disposing aborts an in-flight load; a disposed model's FINISH still settles fences; the fence fix.

### PR5 — editor state by uid, `save()` and delta races

`e0fc555` editor state by uid · `2f7a1f2` `save()` teardown when the reload fails · `65526d9` carry element requests over `save()` · `118e068` the latest edit's delta model wins · `d1d3dc0` docs: `modelId` vs uid

Review: the edit numbering in `setDeltaModels()`, the `save()` failure path, the element requests carried over.

### PR6 — typed worker → main messages

`99be14b` type the requests workers send (_moved from PR4_) · `a628456` `getHighlight()` entries (_not replayed_) · `ac18a75` tile request types (_not replayed_) · `4c6cdaa` requests received as copies (_not replayed_)

Moving `99be14b` out of PR4 costs one trivial rename conflict. `a628456` belongs here rather than in PR2 because it types the `CREATE_MATERIAL` payload that `99be14b` introduces. PR5 and PR6 only need PR4; either can go first.

Public type changes: `getHighlight()` resolves to `(HighlightDefinition | undefined)[]`, and `highlight()` accepts a `HighlightDefinition`.

## Verification

Replayed on `upstream/main` (`26392b6`). `tsc` reported 0 errors at every boundary.

| Boundary                                          | Tests passing | Fence test |
| ------------------------------------------------- | ------------- | ---------- |
| upstream/main                                     | 140           | —          |
| PR1                                               | 140           | 2/2        |
| PR2a                                              | 143           | 2/2        |
| PR2b                                              | 149           | 2/2        |
| PR3                                               | 164           | 2/2        |
| `b48ef60` merged textually, without the fence fix | 175           | hangs      |
| `b48ef60` with the fence fix                      | 175           | 2/2        |
| PR4                                               | 181           | 2/2        |
| PR5                                               | 192           | 2/2        |

On the old base (`e80ba6f`), the same stack ends in a tree identical to `118e068`.

Not verified yet:

- The placement of `e090aa1`, `a628456`, `ac18a75` and `4c6cdaa` (marked _not replayed_).
- The vite build (`yarn build-core`) at each boundary.
- The fence test under happy-dom: it isn't installed locally, so it ran under Node with a `window` shim.
- P0 and the fence fix need their final authorship and commit messages.
