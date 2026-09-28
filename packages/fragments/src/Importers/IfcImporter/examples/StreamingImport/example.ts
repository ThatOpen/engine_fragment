/// <reference types="vite/client" />
/* MD
  ## Streaming IFC import in a worker
  ---
  Converts an uploaded IFC file to Fragments inside a Web Worker, reports progress and timings as it goes, and shows the result in a viewer. The worker reads the `File` straight from disk, so the page never holds the IFC in memory.
*/

import * as OBC from "@thatopen/components";
import { Sphere } from "three";
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
const fragments = new FRAGS.FragmentsModels(fragmentsWorkerUrl);
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

const fileInput = document.getElementById("file-input") as HTMLInputElement;
const uploadLabel = document.getElementById("upload-label")!;
const modeSelect = document.getElementById("mode") as HTMLSelectElement;
const progressBar = document.getElementById("progress-bar")!;
const statusLine = document.getElementById("status")!;
const metrics = document.getElementById("metrics")!;
const downloadButton = document.getElementById(
  "download",
) as HTMLButtonElement;
const clearButton = document.getElementById("clear") as HTMLButtonElement;

if (params.has("mode")) modeSelect.value = params.get("mode")!;

let lastOutput: { bytes: Uint8Array; name: string } | null = null;
let modelCount = 0;

/** What the benchmark harness polls for; see bench/ifc-import-bench.mjs. */
declare global {
  interface Window {
    __importResult?: {
      stats?: ImportStats;
      viewerMs?: number;
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

const renderMetrics = (stats: ImportStats, viewerMs?: number) => {
  const rows: [string, string][] = [
    ["Pipeline", stats.mode],
    ["IFC size", formatBytes(stats.fileBytes)],
    ["Fragments size", formatBytes(stats.outputBytes)],
    ["Conversion", formatMs(stats.totalMs)],
  ];
  if (viewerMs !== undefined) rows.push(["Viewer load", formatMs(viewerMs)]);
  const wasmPeak = stats.wasmMemories.reduce((a, b) => Math.max(a, b), 0);
  rows.push(["Largest WASM heap", formatBytes(wasmPeak)]);
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

const convert = (file: File, mode: ImportMode) =>
  new Promise<{ bytes: Uint8Array; stats: ImportStats }>((resolve, reject) => {
    // A fresh worker per file: terminating it is the only way to hand its
    // WebAssembly memory back, since a WASM heap never shrinks.
    const worker = new Worker(new URL("./import-worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      if (message.type === "progress") {
        const detail = message.detail ? ` · ${message.detail}` : "";
        setProgress(message.fraction, `${message.phase}${detail}`);
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
    };
    worker.postMessage(request);
  });

const onFile = async (file: File) => {
  const mode = modeSelect.value as ImportMode;
  window.__importResult = undefined;
  setBusy(true);
  metrics.innerHTML = "";
  setProgress(0, `Converting ${file.name} (${formatBytes(file.size)})…`);
  try {
    const { bytes, stats } = await convert(file, mode);
    renderMetrics(stats);
    lastOutput = { bytes, name: file.name.replace(/\.ifc$/i, ".frag") };
    downloadButton.disabled = false;

    let viewerMs: number | undefined;
    if (loadIntoViewer) {
      setProgress(1, "Loading into the viewer…");
      const start = performance.now();
      // `load` transfers its buffer to the fragments worker, so hand it a copy
      // and keep the original for the download button.
      const model = await fragments.load(bytes.slice(), {
        modelId: `model-${modelCount++}`,
        camera: world.camera.three,
      });
      world.scene.three.add(model.object);
      await fragments.update(true);
      viewerMs = performance.now() - start;
      clearButton.disabled = false;
      fitToModel(model);
    }
    renderMetrics(stats, viewerMs);
    setProgress(1, `Done in ${formatMs(stats.totalMs)}`);
    window.__importResult = { stats, viewerMs };
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

const fitToModel = (model: FRAGS.FragmentsModel) => {
  const box = model.box;
  if (box.isEmpty()) return;
  const sphere = box.getBoundingSphere(new Sphere());
  world.camera.controls.fitToSphere(sphere, true);
};

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) onFile(file);
});

downloadButton.addEventListener("click", () => {
  if (!lastOutput) return;
  const url = URL.createObjectURL(new Blob([lastOutput.bytes]));
  const a = document.createElement("a");
  a.href = url;
  a.download = lastOutput.name;
  a.click();
  URL.revokeObjectURL(url);
});

clearButton.addEventListener("click", async () => {
  for (const id of [...fragments.models.list.keys()]) {
    await fragments.disposeModel(id);
  }
  clearButton.disabled = true;
});
