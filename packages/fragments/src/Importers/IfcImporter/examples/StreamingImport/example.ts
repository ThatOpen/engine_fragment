/// <reference types="vite/client" />
/* MD
  ## Converting large IFC files in workers
  ---
  Converts an uploaded IFC file to Fragments in Web Workers, without splitting it into several models, and shows the result in a viewer. The page reports progress and timings as it goes.

  Three pipelines can be compared from the dropdown:

  - **Parallel batches**: the file is indexed once, and its geometry is converted as many small, standalone IFC "projections", each holding only the statements its elements' geometry reads, in a pool of workers. Every web-ifc instance holds one batch rather than the whole file, so no single WASM heap grows with the file, and batches run in parallel. Properties are read from the index at the same time. The output matches a single whole-file pass exactly.
  - **Streaming, one model**: the file is read in place and opened in one web-ifc model; properties come from the index rather than a second web-ifc.
  - **Legacy**: the file is read into memory and opened twice in web-ifc, as `IfcImporter` always did.

  In all three, the `File` itself is handed to a worker, so the page never holds the IFC.

  With **Several models** ticked, parallel batches write the model as splits: geometry splits holding only what the viewer draws, a reference split with the grids and alignments, and one data split with every item's attributes, relations and GUIDs. Each split is loaded as soon as it is written, so the model appears while the rest of the file converts, and the data split goes to a thread group of its own. Click an element to read its data from the data split, found through the manifest.
*/

import * as OBC from "@thatopen/components";
import { Box3, Color, Object3D, Sphere, Vector2 } from "three";
import * as FRAGS from "../../../..";
import type {
  ConvertRequest,
  ImportMode,
  ImportStats,
  WorkerMessage,
} from "./protocol";

// --- viewer ------------------------------------------------------------------

const components = new OBC.Components();
const world = components
  .get(OBC.Worlds)
  .create<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>();
world.scene = new OBC.SimpleScene(components);
world.scene.setup();
world.scene.three.background = null;
const container = document.getElementById("container")!;
world.renderer = new OBC.SimpleRenderer(components, container);
world.camera = new OBC.SimpleCamera(components);
world.camera.controls.setLookAt(60, 40, 60, 0, 0, 0);
components.init();
components.get(OBC.Grids).create(world);

// The dev server serves the library unbundled, and the fragments thread does
// not survive that (circular imports), so dev uses the prebuilt copy.
const fragmentsWorkerUrl = import.meta.env.DEV
  ? "/resources/worker.mjs"
  : await FRAGS.FragmentsModels.getWorker();
// A worker is kept for data splits, so reading properties never waits behind
// the workers that are busy with geometry.
const fragments = new FRAGS.FragmentsModels(fragmentsWorkerUrl, {
  threadGroups: { data: 1 },
});
world.camera.controls.addEventListener("update", () => fragments.update());

// --- page state --------------------------------------------------------------

const params = new URLSearchParams(location.search);
const loadIntoViewer = params.get("view") !== "0";
// One core stays with the page; the import worker coordinates on another.
const workers = Number(
  params.get("workers") ??
    Math.max(1, Math.min(8, (navigator.hardwareConcurrency ?? 4) - 2)),
);
// Loader overrides for experiments, e.g. ?TAPE_SIZE=16777216&MEMORY_LIMIT=...
const webIfcSettings: Record<string, number> = {};
for (const key of ["TAPE_SIZE", "MEMORY_LIMIT"]) {
  if (params.has(key)) webIfcSettings[key] = Number(params.get(key));
}
const wasmPath =
  params.get("wasm") ??
  (import.meta.env.DEV
    ? new URL("/node_modules/web-ifc/", location.origin).href
    : "https://unpkg.com/web-ifc@0.0.77/");

// ?splitItems=20000&splitMB=256 size the splits; either one also ticks the box.
// ?splitLoad=after holds them back until the conversion is done, which times
// loading them on its own rather than alongside the conversion.
const splitSizes = {
  maxItems: params.has("splitItems")
    ? Number(params.get("splitItems"))
    : undefined,
  maxBytes: params.has("splitMB")
    ? Number(params.get("splitMB")) * 1024 * 1024
    : undefined,
};
const loadSplitsAfter = params.get("splitLoad") === "after";

const fileInput = document.getElementById("file-input") as HTMLInputElement;
const uploadLabel = document.getElementById("upload-label")!;
const modeSelect = document.getElementById("mode") as HTMLSelectElement;
const splitsInput = document.getElementById("splits") as HTMLInputElement;
const selection = document.getElementById("selection")!;
const progressBar = document.getElementById("progress-bar")!;
const statusLine = document.getElementById("status")!;
const metrics = document.getElementById("metrics")!;
const downloadButton = document.getElementById(
  "download",
) as HTMLButtonElement;
const clearButton = document.getElementById("clear") as HTMLButtonElement;

if (params.has("mode")) modeSelect.value = params.get("mode")!;
splitsInput.checked =
  params.has("splits") || params.has("splitItems") || params.has("splitMB");
const syncSplitsInput = () => {
  splitsInput.disabled = modeSelect.value !== "parallel";
};
modeSelect.addEventListener("change", syncSplitsInput);
syncSplitsInput();

let lastOutput: { bytes: Uint8Array | string; name: string }[] = [];
// The manifest of the splits in the viewer, when that is what it shows
let manifest: FRAGS.IfcSplitManifest | null = null;
let modelCount = 0;

/** What the benchmark harness polls for; see bench.mjs. */
declare global {
  interface Window {
    __importResult?: {
      stats?: ImportStats;
      /** Loading into the viewer, from the end of the conversion. */
      viewerMs?: number;
      /** From choosing the file to the first geometry on screen. */
      firstVisibleMs?: number;
      /** From choosing the file to everything loaded. */
      endToEndMs?: number;
      /** With splits: an item's data, read back from the data split. */
      dataProbe?: unknown;
      error?: string;
    };
  }
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
};
const formatMs = (ms: number) =>
  ms < 1000 ? `${ms.toFixed(0)} ms` : `${(ms / 1000).toFixed(2)} s`;

const setBusy = (busy: boolean) => {
  uploadLabel.setAttribute("aria-disabled", String(busy));
  modeSelect.disabled = busy;
  fileInput.disabled = busy;
  splitsInput.disabled = busy || modeSelect.value !== "parallel";
};

const setProgress = (fraction: number, text: string) => {
  progressBar.style.width = `${Math.round(fraction * 100)}%`;
  progressBar.parentElement!.setAttribute(
    "aria-valuenow",
    String(Math.round(fraction * 100)),
  );
  statusLine.textContent = text;
  statusLine.classList.remove("error");
};

interface ViewerTimings {
  viewerMs?: number;
  firstVisibleMs?: number;
  endToEndMs?: number;
}

const renderMetrics = (stats: ImportStats, viewer: ViewerTimings = {}) => {
  const rows: [string, string][] = [
    ["Pipeline", stats.mode],
    ["IFC size", formatBytes(stats.fileBytes)],
    ["Fragments size", formatBytes(stats.outputBytes)],
    ["Conversion", formatMs(stats.totalMs)],
  ];
  const { viewerMs, firstVisibleMs, endToEndMs } = viewer;
  if (firstVisibleMs !== undefined) {
    rows.push(["First geometry on screen", formatMs(firstVisibleMs)]);
  }
  if (viewerMs !== undefined) {
    rows.push(["Viewer load, after conversion", formatMs(viewerMs)]);
  }
  if (endToEndMs !== undefined) {
    rows.push(["File to everything loaded", formatMs(endToEndMs)]);
  }
  // web-ifc's heap: this worker's for one whole-file model, the largest
  // geometry worker's for batches
  const wasmPeak = Math.max(
    stats.workerWasmHeap ?? 0,
    ...stats.wasmMemories,
  );
  rows.push(["Largest web-ifc heap", formatBytes(wasmPeak)]);
  if (stats.peakJsHeap !== null) {
    rows.push(["Worker JS heap (peak seen)", formatBytes(stats.peakJsHeap)]);
  }
  for (const [name, value] of Object.entries(stats.counts)) {
    rows.push([name, value.toLocaleString()]);
  }
  const phaseRows = stats.phases.map(
    ({ phase, ms }) => `<tr><th>${phase}</th><td>${formatMs(ms)}</td></tr>`,
  );
  metrics.innerHTML = `
    <table>${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}</table>
    <div class="section-title">Phases</div>
    <table>${phaseRows.join("")}</table>`;
};

// --- conversion --------------------------------------------------------------

type Converted = Extract<WorkerMessage, { type: "done" }>;

const convert = ({
  file,
  mode,
  onSplit,
}: {
  file: File;
  mode: ImportMode;
  /** Given, the model is written as splits, and each is handed over here. */
  onSplit?: (split: FRAGS.IfcSplit) => void;
}) =>
  new Promise<Converted>((resolve, reject) => {
    // A fresh worker per file: terminating it is the only way to hand its
    // WebAssembly memory back, since a WASM heap never shrinks.
    const worker = new Worker(new URL("./import-worker.ts", import.meta.url), {
      type: "module",
    });
    const started = performance.now();
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      if (message.type === "progress") {
        const detail = message.detail ? ` · ${message.detail}` : "";
        const elapsed = formatMs(performance.now() - started);
        setProgress(message.fraction, `${elapsed} · ${message.phase}${detail}`);
        return;
      }
      if (message.type === "split") {
        onSplit?.(message.split);
        return;
      }
      // ?keepWorker=1 leaves it alive for a profiler to collect from
      if (!params.has("keepWorker")) worker.terminate();
      if (message.type === "done") resolve(message);
      else reject(Object.assign(new Error(message.message), message));
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || "Import worker crashed"));
    };
    const request: ConvertRequest = {
      type: "convert",
      file,
      mode,
      wasmPath,
      webIfcSettings,
      workers,
      batchBytes: params.has("batchBytes")
        ? Number(params.get("batchBytes"))
        : undefined,
      splits: onSplit && splitSizes,
      residentBudget: params.has("resident")
        ? Number(params.get("resident"))
        : undefined,
      pages: {
        pageSize: params.has("pageMB")
          ? Number(params.get("pageMB")) * 1024 * 1024
          : undefined,
        cacheBytes: params.has("cacheMB")
          ? Number(params.get("cacheMB")) * 1024 * 1024
          : undefined,
      },
    };
    worker.postMessage(request);
  });

// --- viewer -------------------------------------------------------------------

const fitToModels = () => {
  const box = new Box3();
  for (const model of fragments.models.list.values()) box.union(model.box);
  if (box.isEmpty()) return;
  const sphere = box.getBoundingSphere(new Sphere());
  world.camera.controls.fitToSphere(sphere, true);
};

// --- reading data across splits ----------------------------------------------

/**
 * The model that holds an item's data: with splits, the data split the
 * manifest names for it, and otherwise the model it was picked in.
 */
const dataModelOf = (model: FRAGS.FragmentsModel, localId: number) => {
  if (!manifest) return model;
  const position = FRAGS.findItemSplits(manifest, localId)?.data ?? -1;
  if (position === -1) return undefined;
  return fragments.models.list.get(manifest.splits[position].id);
};

const readItem = async (model: FRAGS.FragmentsModel, localId: number) => {
  const [item] = await model.getItemsData([localId], {
    attributesDefault: true,
    relations: { IsDefinedBy: { attributes: true, relations: false } },
  });
  return item;
};

/** Reads the first item that has geometry back from its data split. */
const probeData = async (manifest: FRAGS.IfcSplitManifest) => {
  const { localIds, geometry } = manifest.index;
  const localId = localIds[geometry.findIndex((position) => position !== -1)];
  if (localId === undefined) return null;
  const { data } = FRAGS.findItemSplits(manifest, localId)!;
  const model = fragments.models.list.get(manifest.splits[data]?.id);
  return model ? readItem(model, localId) : null;
};

const highlight: FRAGS.MaterialDefinition = {
  color: new Color("gold"),
  renderedFaces: FRAGS.RenderedFaces.TWO,
  opacity: 1,
  transparent: false,
};
let selected: { model: FRAGS.FragmentsModel; localId: number } | null = null;

const select = async (mouse: Vector2) => {
  let hit: typeof selected = null;
  let nearest = Infinity;
  for (const model of fragments.models.list.values()) {
    const result = await model.raycast({
      camera: world.camera.three,
      mouse,
      dom: world.renderer!.three.domElement,
    });
    if (!result || result.distance >= nearest) continue;
    nearest = result.distance;
    hit = { model, localId: result.localId };
  }

  if (selected) await selected.model.resetHighlight([selected.localId]);
  selected = hit;
  selection.innerHTML = "";
  if (hit) await hit.model.highlight([hit.localId], highlight);
  await fragments.update(true);
  if (!hit) return;

  const dataModel = dataModelOf(hit.model, hit.localId);
  const item = dataModel && (await readItem(dataModel, hit.localId));
  const value = (attribute: unknown) =>
    String((attribute as { value?: unknown } | undefined)?.value ?? "—");
  const sets = (item?.IsDefinedBy as FRAGS.ItemData[] | undefined) ?? [];
  const rows: [string, string][] = [
    ["Picked in", hit.model.modelId.slice(-8)],
    ["Data read from", dataModel?.modelId.slice(-8) ?? "—"],
    ["Local id", String(hit.localId)],
    ["Category", value(item?._category)],
    ["Name", value(item?.Name)],
    ["GUID", value(item?._guid)],
    ["Property sets", sets.map((set) => value(set.Name)).join(", ") || "—"],
  ];
  selection.innerHTML = `
    <div class="section-title">Selected item</div>
    <table>${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}</table>`;
};

// A click, not the end of a drag
let pressedAt: Vector2 | null = null;
container.addEventListener("pointerdown", (event) => {
  pressedAt = new Vector2(event.clientX, event.clientY);
});
container.addEventListener("pointerup", (event) => {
  const mouse = new Vector2(event.clientX, event.clientY);
  if (pressedAt && pressedAt.distanceTo(mouse) < 4) select(mouse);
  pressedAt = null;
});

// --- conversion to viewer ----------------------------------------------------

// Grids and alignments are data the viewer turns into lines, so they are
// drawn from whichever model holds them: the one model, or with splits, the
// reference split.
const references: Object3D[] = [];
const drawReferences = async (model: FRAGS.FragmentsModel) => {
  const drawn = await Promise.all([model.getGrids(), model.getAlignments()]);
  model.getGridMaterial().color.set("#5b6770");
  world.scene.three.add(...drawn);
  references.push(...drawn);
};

/**
 * Loads a model into the viewer. A split is drawn as what it holds: meshes,
 * grids and alignments, or for a data split nothing, which is only loaded
 * into its thread group.
 */
const loadModel = async ({
  id,
  bytes,
  group = null,
  kind,
  onProgress,
}: {
  id: string;
  bytes: Uint8Array;
  group?: string | null;
  /** Left out for a model that is the whole conversion. */
  kind?: FRAGS.IfcSplit["kind"];
  onProgress?: (fraction: number, stage: string) => void;
}) => {
  const model = await fragments.load(bytes, {
    modelId: id,
    camera: world.camera.three,
    threadGroup: group ?? undefined,
    onProgress: ({ stage, progress }) => {
      if (stage === "decompressing") onProgress?.(0.05 * progress, stage);
      else if (stage === "parsing") onProgress?.(0.1, stage);
      else if (stage === "generating") {
        onProgress?.(0.1 + 0.85 * progress, stage);
      }
    },
  });
  if (kind === undefined || kind === "reference") await drawReferences(model);
  if (kind === undefined || kind === "geometry") {
    world.scene.three.add(model.object);
    onProgress?.(0.95, "first render");
    await fragments.update(true);
  }
  return model;
};

const onFile = async (file: File) => {
  const mode = modeSelect.value as ImportMode;
  const asSplits = mode === "parallel" && splitsInput.checked;
  window.__importResult = undefined;
  setBusy(true);
  metrics.innerHTML = "";
  setProgress(0, `Converting ${file.name} (${formatBytes(file.size)})…`);
  const started = performance.now();
  const name = file.name.replace(/\.ifc$/i, "");
  try {
    // Splits are loaded as they arrive, while the conversion carries on
    const splits: FRAGS.IfcSplit[] = [];
    const loads: Promise<void>[] = [];
    let loaded = 0;
    let firstVisibleMs: number | undefined;
    const loadSplit = async (split: FRAGS.IfcSplit) => {
      // `load` transfers its buffer to the fragments worker, so hand it a
      // copy and keep the original for the download button.
      await loadModel({ ...split, bytes: split.bytes.slice() });
      loaded++;
      if (split.kind !== "geometry" || firstVisibleMs !== undefined) return;
      firstVisibleMs = performance.now() - started;
      fitToModels();
    };

    const converted = await convert({
      file,
      mode,
      onSplit: asSplits
        ? (split) => {
            splits.push(split);
            if (loadIntoViewer && !loadSplitsAfter)
              loads.push(loadSplit(split));
          }
        : undefined,
    });
    const { bytes, stats } = converted;
    renderMetrics(stats);
    lastOutput = bytes
      ? [{ bytes, name: `${name}.frag` }]
      : [
          ...splits.map(({ id, bytes }) => ({
            bytes,
            name: `${name}${id.slice(id.lastIndexOf("."))}.frag`,
          })),
          {
            // the index is typed arrays, which JSON would write as objects
            bytes: JSON.stringify(converted.manifest, (_key, value) =>
              value instanceof Uint32Array || value instanceof Int32Array
                ? Array.from(value)
                : value,
            ),
            name: `${name}.manifest.json`,
          },
        ];
    downloadButton.disabled = false;

    const viewer: ViewerTimings = {};
    let dataProbe: unknown;
    if (loadIntoViewer) {
      const start = performance.now();
      // The bar starts over for the viewer: the fragments worker reports
      // parsing the model, then generating its meshes.
      const showViewerProgress = (fraction: number, stage: string) => {
        const elapsed = formatMs(performance.now() - start);
        const percent = Math.round(fraction * 100);
        setProgress(
          fraction,
          `${elapsed} · loading into the viewer · ${stage} ${percent}%`,
        );
      };
      if (bytes) {
        showViewerProgress(0, "sending");
        await loadModel({
          id: `model-${modelCount++}`,
          bytes: bytes.slice(),
          onProgress: showViewerProgress,
        });
        firstVisibleMs = performance.now() - started;
        manifest = null;
      } else {
        if (loadSplitsAfter) loads.push(...splits.map(loadSplit));
        const waiting = setInterval(() => {
          showViewerProgress(loaded / splits.length, `${loaded} splits`);
        }, 100);
        try {
          await Promise.all(loads);
        } finally {
          clearInterval(waiting);
        }
        manifest = converted.manifest!;
        dataProbe = await probeData(manifest);
      }
      viewer.viewerMs = performance.now() - start;
      viewer.firstVisibleMs = firstVisibleMs;
      viewer.endToEndMs = performance.now() - started;
      clearButton.disabled = false;
      fitToModels();
    }
    renderMetrics(stats, viewer);
    setProgress(1, `Done in ${formatMs(stats.totalMs)}`);
    window.__importResult = { stats, ...viewer, dataProbe };
  } catch (error) {
    const message = (error as Error).message ?? String(error);
    statusLine.textContent = `Failed: ${message}`;
    statusLine.classList.add("error");
    window.__importResult = { error: message };
  } finally {
    setBusy(false);
    fileInput.value = "";
  }
};

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) onFile(file);
});

// One file for a single model; for splits, one each and the manifest
downloadButton.addEventListener("click", () => {
  for (const { bytes, name } of lastOutput) {
    const url = URL.createObjectURL(new Blob([bytes]));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
});

clearButton.addEventListener("click", async () => {
  for (const id of [...fragments.models.list.keys()]) {
    await fragments.disposeModel(id);
  }
  for (const drawn of references.splice(0)) drawn.removeFromParent();
  manifest = null;
  selected = null;
  selection.innerHTML = "";
  clearButton.disabled = true;
});
