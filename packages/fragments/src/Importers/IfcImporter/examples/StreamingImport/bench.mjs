#!/usr/bin/env node
// Benchmarks the StreamingImport example in a real Chrome, from the outside.
//
// The page reports its own timings and WASM heap sizes; what it cannot see is
// the V8 heap of its workers or the renderer's resident memory, so this drives
// Chrome over the DevTools protocol and samples both while the conversion runs.
// No dependencies: Node's built-in WebSocket talks CDP directly.
//
// usage:
//   yarn dev   # repo root, serves the example
//   node bench.mjs --file model.ifc [--mode streaming|legacy] [--view 0]
//                  [--url http://localhost:5173/...] [--chrome <path>]
//                  [--timeout <seconds>] [--headed] [--console]
//                  [--query <extra page params>] [--screenshot <out.png>]

import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .join(" ")
    .split(/\s*--/)
    .filter(Boolean)
    .map((pair) => {
      const [key, ...rest] = pair.split(" ");
      return [key, rest.join(" ") || "true"];
    }),
);

const file = args.file && resolve(args.file);
if (!file || !existsSync(file)) {
  console.error("--file <path to .ifc> is required");
  process.exit(2);
}
const mode = args.mode ?? "parallel";
const view = args.view ?? "1";
const timeoutMs = Number(args.timeout ?? 1800) * 1000;
const pageUrl = new URL(
  args.url ??
    "http://localhost:5173/packages/fragments/src/Importers/IfcImporter/examples/StreamingImport/example.html",
);
pageUrl.searchParams.set("mode", mode);
pageUrl.searchParams.set("view", view);
// extra page parameters, e.g. --query TAPE_SIZE=16777216&MEMORY_LIMIT=268435456
for (const [key, value] of new URLSearchParams(args.query ?? "")) {
  pageUrl.searchParams.set(key, value);
}
const chromePath =
  args.chrome ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// --- chrome ------------------------------------------------------------------

const profile = mkdtempSync(join(tmpdir(), "ifc-bench-"));
const chrome = spawn(
  chromePath,
  [
    ...(args.headed ? [] : ["--headless=new"]),
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--enable-precise-memory-info",
    "about:blank",
  ],
  { stdio: "ignore" },
);

const cleanup = () => {
  chrome.kill("SIGKILL");
  rmSync(profile, { recursive: true, force: true });
};
process.on("exit", cleanup);
process.on("SIGINT", () => process.exit(130));

let activePort = null;
for (let i = 0; i < 100 && !activePort; i++) {
  await sleep(100);
  const path = join(profile, "DevToolsActivePort");
  if (existsSync(path)) activePort = readFileSync(path, "utf8").split("\n");
}
if (!activePort) throw new Error("Chrome did not open a debugging port");
const [port, browserPath] = activePort;

// --- cdp ---------------------------------------------------------------------

const socket = new WebSocket(`ws://127.0.0.1:${port}${browserPath}`);
await new Promise((ok, fail) => {
  socket.onopen = ok;
  socket.onerror = fail;
});

let nextId = 1;
const pending = new Map();
const listeners = [];
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && pending.has(message.id)) {
    const { ok, fail } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) fail(new Error(message.error.message));
    else ok(message.result);
    return;
  }
  for (const listener of listeners) listener(message);
};

const send = (method, params = {}, sessionId, timeout = 0) =>
  new Promise((ok, fail) => {
    const id = nextId++;
    pending.set(id, { ok, fail });
    socket.send(JSON.stringify({ id, method, params, sessionId }));
    if (timeout) {
      setTimeout(() => {
        if (!pending.has(id)) return;
        pending.delete(id);
        fail(new Error(`${method} timed out`));
      }, timeout);
    }
  });

// --- page and workers --------------------------------------------------------

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId: page } = await send("Target.attachToTarget", {
  targetId,
  flatten: true,
});

const workers = new Map(); // sessionId -> { url, peakUsed, peakTotal }
const profiled = []; // worker sessions being CPU-profiled (--profile <out>)
// Import worker sessions whose live allocations are sampled (--heap <out>).
// The largest sample seen approximates the heap at its peak.
const heapSampled = [];
let heapPeak = { total: 0, profile: null, at: 0 };
let lastHeapSample = 0;
let crashed = false;
listeners.push(({ method, params, sessionId }) => {
  if (method === "Target.attachedToTarget") {
    const { sessionId: child, targetInfo } = params;
    if (targetInfo.type === "worker") {
      workers.set(child, {
        url: targetInfo.url,
        peakUsed: 0,
        peakTotal: 0,
        peakBacking: 0,
      });
    }
    if (args.console) send("Runtime.enable", {}, child).catch(() => {});
    // workers the import worker starts are its children, not the page's
    send(
      "Target.setAutoAttach",
      { autoAttach: true, waitForDebuggerOnStart: false, flatten: true },
      child,
    ).catch(() => {});
    if (args.heap && targetInfo.url.includes("import-worker")) {
      heapSampled.push(child);
      send("HeapProfiler.enable", {}, child)
        .then(() =>
          send(
            "HeapProfiler.startSampling",
            { samplingInterval: 256 * 1024 },
            child,
          ),
        )
        .catch(() => {});
    }
    if (args.profile && targetInfo.url.includes("import-worker")) {
      profiled.push(child);
      send("Profiler.enable", {}, child)
        .then(() =>
          send("Profiler.setSamplingInterval", { interval: 1000 }, child),
        )
        .then(() => send("Profiler.start", {}, child))
        .catch(() => {});
    }
    send("Runtime.runIfWaitingForDebugger", {}, child).catch(() => {});
  }
  if (method === "Target.detachedFromTarget" && workers.has(params.sessionId)) {
    // keep its peaks for the report; just stop sampling it
    workers.get(params.sessionId).detached = true;
  }
  if (args.console && method === "Runtime.consoleAPICalled") {
    const text = params.args
      .map((a) => a.value ?? a.description ?? a.type)
      .join(" ");
    console.error(`[console.${params.type}] ${text}`.slice(0, 500));
  }
  if (method === "Runtime.exceptionThrown") {
    const { exceptionDetails: e } = params;
    console.error(
      `[exception] ${e.exception?.description ?? e.text}`.slice(0, 1500),
    );
  }
  if (method === "Inspector.targetCrashed" && sessionId === page) {
    crashed = true;
  }
});

await send("Inspector.enable", {}, page);
await send("Page.enable", {}, page);
await send(
  "Emulation.setDeviceMetricsOverride",
  { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false },
  page,
);
await send("Runtime.enable", {}, page);
await send(
  "Target.setAutoAttach",
  { autoAttach: true, waitForDebuggerOnStart: false, flatten: true },
  page,
);

const loaded = new Promise((ok) =>
  listeners.push(({ method, sessionId }) => {
    if (method === "Page.loadEventFired" && sessionId === page) ok();
  }),
);
await send("Page.navigate", { url: pageUrl.href }, page);
await loaded;

const { root } = await send("DOM.getDocument", {}, page);
let input = 0;
for (let i = 0; i < 100 && !input; i++) {
  ({ nodeId: input } = await send(
    "DOM.querySelector",
    { nodeId: root.nodeId, selector: "#file-input" },
    page,
  ));
  if (!input) await sleep(100);
}
if (!input) throw new Error("#file-input not found; is the dev server up?");

// --- sampling ----------------------------------------------------------------

const rendererPids = async () => {
  const { processInfo } = await send("SystemInfo.getProcessInfo");
  return processInfo.filter((p) => p.type === "renderer").map((p) => p.id);
};

const rssOf = (pids) => {
  if (pids.length === 0) return 0;
  try {
    const out = execFileSync("ps", ["-o", "rss=", "-p", pids.join(",")], {
      encoding: "utf8",
    });
    return out
      .split("\n")
      .filter(Boolean)
      .reduce((sum, kb) => sum + Number(kb) * 1024, 0);
  } catch {
    return 0; // the process went away between listing and sampling
  }
};

let peakRss = 0;
const rssSeries = [];
const started = Date.now();
await send("DOM.setFileInputFiles", { files: [file], nodeId: input }, page);

let result = null;
while (!result && !crashed && Date.now() - started < timeoutMs) {
  await sleep(250);
  const pids = await rendererPids().catch(() => []);
  const rss = rssOf(pids);
  peakRss = Math.max(peakRss, rss);
  rssSeries.push([Date.now() - started, rss]);

  await Promise.all(
    [...workers].map(async ([sessionId, worker]) => {
      if (worker.detached) return;
      try {
        const usage = await send(
          "Runtime.getHeapUsage",
          {},
          sessionId,
          1000,
        );
        worker.peakUsed = Math.max(worker.peakUsed, usage.usedSize);
        worker.peakTotal = Math.max(worker.peakTotal, usage.totalSize);
        worker.peakBacking = Math.max(
          worker.peakBacking,
          usage.backingStorageSize ?? 0,
        );
      } catch {
        // a busy or finished worker; the next sample catches up
      }
    }),
  );

  if (heapSampled.length && Date.now() - lastHeapSample > 2000) {
    lastHeapSample = Date.now();
    for (const sessionId of heapSampled) {
      try {
        const { profile } = await send(
          "HeapProfiler.getSamplingProfile",
          {},
          sessionId,
          10000,
        );
        let total = 0;
        const walk = (node) => {
          total += node.selfSize;
          node.children.forEach(walk);
        };
        walk(profile.head);
        if (total > heapPeak.total) {
          heapPeak = { total, profile, at: (Date.now() - started) / 1000 };
        }
      } catch {
        // busy or gone
      }
    }
  }

  try {
    const { result: value } = await send(
      "Runtime.evaluate",
      {
        expression: "JSON.stringify(window.__importResult ?? null)",
        returnByValue: true,
      },
      page,
      2000,
    );
    result = JSON.parse(value.value);
  } catch {
    // the main thread is busy; try again next tick
  }
}

if (args.heap && heapPeak.profile) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(args.heap, JSON.stringify(heapPeak.profile));
  console.error(
    `heap sample (${Math.round(heapPeak.total / 1048576)} MB live at ${heapPeak.at} s) written to ${args.heap}`,
  );
}

if (args.screenshot && result) {
  // let the viewer settle on the fitted camera first
  await sleep(1500);
  const { data } = await send(
    "Page.captureScreenshot",
    { format: "png" },
    page,
    30000,
  );
  const { writeFileSync } = await import("node:fs");
  writeFileSync(args.screenshot, Buffer.from(data, "base64"));
  console.error(`screenshot written to ${args.screenshot}`);
}

if (args.profile) {
  // The import worker is terminated once it posts its result, which ends its
  // session, so the page is told to keep it alive only when profiling.
  for (const sessionId of profiled) {
    try {
      const { profile } = await send("Profiler.stop", {}, sessionId, 30000);
      const { writeFileSync } = await import("node:fs");
      writeFileSync(args.profile, JSON.stringify(profile));
      console.error(`profile written to ${args.profile}`);
    } catch (error) {
      console.error(`profile lost: ${error.message}`);
    }
  }
}

const mb = (bytes) => Math.round(bytes / 1024 / 1024);
const summary = {
  file,
  fileMB: mb(Number(execFileSync("stat", ["-f", "%z", file], { encoding: "utf8" }))),
  mode,
  query: args.query ?? "",
  outcome: crashed
    ? "renderer crashed"
    : result?.error
      ? `error: ${result.error}`
      : result
        ? "ok"
        : "timeout",
  wallSeconds: (Date.now() - started) / 1000,
  conversionSeconds: result?.stats ? result.stats.totalMs / 1000 : null,
  viewerSeconds: result?.viewerMs ? result.viewerMs / 1000 : null,
  outputMB: result?.stats ? mb(result.stats.outputBytes) : null,
  phases: result?.stats?.phases.map(({ phase, ms }) => [
    phase,
    Math.round(ms) / 1000,
  ]),
  wasmHeapsMB: result?.stats?.wasmMemories.map(mb),
  workerWasmHeapMB: result?.stats?.workerWasmHeap
    ? mb(result.stats.workerWasmHeap)
    : null,
  counts: result?.stats?.counts,
  peakRendererRssMB: mb(peakRss),
  workerHeapsMB: [...workers.values()].map((w) => ({
    url: w.url.split("/").pop(),
    peakUsed: mb(w.peakUsed),
    peakTotal: mb(w.peakTotal),
    peakArrayBuffers: mb(w.peakBacking),
  })),
  cores: (await import("node:os")).cpus().length,
};
console.log(JSON.stringify(summary, null, 2));
if (args.series) {
  console.log(
    JSON.stringify(rssSeries.map(([t, rss]) => [t / 1000, mb(rss)])),
  );
}
process.exit(summary.outcome === "ok" ? 0 : 1);
