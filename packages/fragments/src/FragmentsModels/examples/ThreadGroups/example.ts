/* MD
  ## Routing Models to Thread Groups 🧵
  ---
  Loading a heavy data fragment (properties, relations, classifications) on the same worker that powers your visual updates can stall the camera while a property query runs. The default round-robin worker pool spreads load fairly, but it does not let you isolate a slow query path from the rendering path.

  Thread groups solve this by reserving a number of workers exclusively for a named group. A model loaded into a group always lands on that group's pool, and a model loaded without a group never lands on a reserved worker, so heavy data calls cannot block visual feedback.

  This tutorial covers declaring named thread groups at init time; reading the effective max worker count and the declared group sizes; loading models into named groups via `threadGroup`; reading the `threadGroup` of a loaded model; and the validation rules that prevent footguns.

  By the end, you'll have a fragments setup where a "data" model is pinned to its own worker, separate from the model serving your viewport.

  ### 🖖 Importing our Libraries
  First things first, let's install all necessary dependencies to make this example work:
*/

import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import Stats from "stats.js";
// You have to import * as FRAGS from "@thatopen/fragments"
import * as FRAGS from "../../..";

/* MD
  ### 🌎 Setting up a Simple Scene
  To get started, let's set up a basic ThreeJS scene. This will serve as the foundation for our application and allow us to visualize the 3D models effectively:
*/

const components = new OBC.Components();

const worlds = components.get(OBC.Worlds);
const world = worlds.create<
  OBC.SimpleScene,
  OBC.SimpleCamera,
  OBC.SimpleRenderer
>();

world.scene = new OBC.SimpleScene(components);
world.scene.setup();
world.scene.three.background = null;

const container = document.getElementById("container")!;
world.renderer = new OBC.SimpleRenderer(components, container);

world.camera = new OBC.SimpleCamera(components);
world.camera.controls.setLookAt(58, 22, -25, 13, 0, 4.2);

components.init();

const grids = components.get(OBC.Grids);
grids.create(world);

/* MD
  ### 🛠️ Setting Up Fragments with Thread Groups
  When constructing the FragmentsModels instance, we declare a `data` group with one reserved worker. The default pool keeps everything else. Workers are spawned lazily, so until a model is actually loaded into a group nothing has been spawned for it yet.

  :::tip Why declare groups?

  A model loaded with `threadGroup: "data"` always lands on that group's pool, and a default-pool load never lands on a reserved worker. That isolation means a long property query on the data model cannot pause the worker that's busy keeping your camera-driven LOD updates flowing.

  :::
*/

const workerUrl = await FRAGS.FragmentsModels.getWorker();
const fragments = new FRAGS.FragmentsModels(workerUrl, {
  // Optional: override the default of `navigator.hardwareConcurrency - 3`.
  // maxWorkers: 4,
  threadGroups: {
    data: 1,
  },
});

world.camera.controls.addEventListener("update", () => fragments.update());

fragments.models.list.onItemSet.add(({ value: model }) => {
  model.useCamera(world.camera.three);
  world.scene.three.add(model.object);
  fragments.update(true);
});

// Remove z fighting
fragments.models.materials.list.onItemSet.add(({ value: material }) => {
  if (!("isLodMaterial" in material && material.isLodMaterial)) {
    material.polygonOffset = true;
    material.polygonOffsetUnits = 1;
    material.polygonOffsetFactor = Math.random();
  }
});

/* MD
  ### 🔍 Inspecting Worker Capacity
  The new `maxWorkers` and `threadGroups` getters surface what the manager sees. `maxWorkers` is the effective cap (your override, or `hardwareConcurrency - 3` floored at 2), and `threadGroups` echoes back what you declared at init.
*/

console.log("Effective max workers:", fragments.maxWorkers);
console.log("Declared thread groups:", fragments.threadGroups);

/* MD
  ### 📂 Loading Models into Groups
  Pass `threadGroup` on the load options to route a model to its pool. Models without `threadGroup` go to the default pool. The example below loads the same school file twice with different IDs: one into the `data` group, one into the default pool. The viewport uses the second one.

  :::warning Undeclared groups throw

  Loading with `threadGroup: "x"` when `"x"` was never declared at init is a hard error. Catches typos before they silently leak across pools.

  :::
*/

const fileUrl =
  "https://thatopen.github.io/engine_fragment/resources/frags/school_arq.frag";
const file = await fetch(fileUrl);
const buffer = await file.arrayBuffer();

// fragments.load transfers the ArrayBuffer to the worker (zero-copy), which
// detaches it on the main thread. Use a slice() per call so each load gets
// its own backing buffer. In a real app you'd usually load distinct files,
// so this is just an artifact of reusing the same .frag for the demo.
const dataModel = await fragments.load(buffer.slice(0), {
  modelId: "school-data",
  threadGroup: "data",
});
const viewModel = await fragments.load(buffer.slice(0), {
  modelId: "school-view",
});

/* MD
  ### 🧾 Reading `threadGroup` per Model
  Every loaded model exposes the group it was assigned to. `undefined` means it landed on the default pool. Useful for filtering `fragments.models.list` (e.g. "dispose all data models").
*/

console.log("Data model group:", dataModel.threadGroup); // "data"
console.log("View model group:", viewModel.threadGroup); // undefined

/* MD
  ### 🧩 Adding User Interface (optional)
  A small panel that prints the current capacity, group sizes, and per-model group assignments at the click of a button.
*/

BUI.Manager.init();

const panel = BUI.Component.create<BUI.PanelSection>(() => {
  const onShowCapacity = () => {
    const groups = Object.entries(fragments.threadGroups)
      .map(([name, size]) => `${name}: ${size}`)
      .join(", ");
    window.alert(
      `Max workers: ${fragments.maxWorkers}.
Declared groups: ${groups || "(none)"}.`,
    );
  };

  const onShowAssignments = () => {
    const lines: string[] = [];
    for (const model of fragments.models.list.values()) {
      lines.push(`${model.modelId} -> ${model.threadGroup ?? "(default)"}`);
    }
    window.alert(lines.join("\n") || "No models loaded.");
  };

  return BUI.html`
    <bim-panel active label="Thread Groups" class="options-menu">
      <bim-panel-section fixed label="Controls">
        <bim-button label="Show Capacity" @click=${onShowCapacity}></bim-button>
        <bim-button label="Show Model Assignments" @click=${onShowAssignments}></bim-button>
      </bim-panel-section>
    </bim-panel>
  `;
});

document.body.append(panel);

/* MD
  And the standard phone-menu toggler so the panel works on small screens too:
*/

const button = BUI.Component.create<BUI.PanelSection>(() => {
  return BUI.html`
      <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
        @click="${() => {
          if (panel.classList.contains("options-menu-visible")) {
            panel.classList.remove("options-menu-visible");
          } else {
            panel.classList.add("options-menu-visible");
          }
        }}">
      </bim-button>
    `;
});

document.body.append(button);

/* MD
  ### ⏱️ Measuring the performance (optional)
  Stats.js to keep an eye on FPS and memory while the two models share the scene.
*/

const stats = new Stats();
stats.showPanel(2);
document.body.append(stats.dom);
stats.dom.style.left = "0px";
stats.dom.style.zIndex = "unset";
world.renderer.onBeforeUpdate.add(() => stats.begin());
world.renderer.onAfterUpdate.add(() => stats.end());

/* MD
  ### 🎉 Wrap up
  That's the full thread-groups setup: declare reserved capacity at init, route models with `threadGroup` on load, and read back the assignment from each model. Backwards-compatible by design: a manager constructed without `threadGroups` and `load()` calls without `threadGroup` behave exactly like before.
*/
