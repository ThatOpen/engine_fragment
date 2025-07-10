/* MD
  ## Loading Fragment Models 🔼
  ---
  Before diving into the world of Fragments, the first step is to load your Fragment Models. This is a crucial step to unlock the full potential of working with Fragments. Let's explore how to do it effectively.
  
  ### 🖖 Importing our Libraries
  First things first, let's install all necessary dependencies to make this example work:
*/

import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import Stats from "stats.js";
// You have to import * as FRAGS from "@thatopen/fragments"
import * as FRAGS from "..";

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
world.camera.controls.setLookAt(58, 22, -25, 13, 0, 4.2); // convenient position for the model we will load

components.init();

const grids = components.get(OBC.Grids);
grids.create(world);

/* MD
  :::info Do I need @thatopen/components?

  Not necessarily! While @thatopen/components simplifies the process of setting up a scene, you can always use plain ThreeJS to create your own custom scene setup. It's entirely up to your preference and project requirements! 😉

  :::

  ### 🛠️ Setting Up Fragments
  Now, let's configure the Fragments library core. This will allow us to load models effortlessly and start manipulating them with ease:
*/

// You have to copy `/node_modules/@thatopen/fragments/dist/Worker/worker.mjs` to your project directory
// and provide the relative path in `workerUrl`
// We use here the internal route of the worker in the library for simplicity purposes
const workerUrl =
  "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
const fragments = new FRAGS.FragmentsModels(workerUrl);
world.camera.controls.addEventListener("rest", () => fragments.update(true));

// Once a model is available in the list, we can tell what camera to use
// in order to perform the culling and LOD operations.
// Also, we add the model to the 3D scene.
fragments.models.list.onItemSet.add(({ value: model }) => {
  model.useCamera(world.camera.three);
  world.scene.three.add(model.object);
  // At the end, you tell fragments to update so the model can be seen given
  // the initial camera position
  fragments.update(true);
});

/* MD
  ### 📂 Loading Fragments Models
  With the core setup complete, it's time to load a Fragments model into our scene. Fragments are optimized for fast loading and rendering, making them ideal for large-scale 3D models.

  :::info Where can I find Fragment files?

  You can use the sample Fragment files available in our repository for testing. If you have an IFC model you'd like to convert to Fragments, check out the IfcImporter tutorial for detailed instructions.

  :::

  To make things more convenient, let's create a helper function that will load the Fragments Model from a given URL:
*/

const loadFragmentFile = async (url: string, id: string) => {
  const file = await fetch(url);
  const buffer = await file.arrayBuffer();
  await fragments.load(buffer, { modelId: id });
};

/* MD
  At any point, you can retrieve the binary data of a loaded model for exporting. This is particularly useful when models are loaded automatically from a remote source, but you want to provide an option to download the data locally for further use:
*/

const getBinaryData = async (id: string) => {
  const model = fragments.models.list.get(id);
  if (!model) return null;
  const buffer = await model.getBuffer(false);
  return { name: model.modelId, buffer };
};

/* MD
  Now that all Fragments Models are loaded with unique IDs, let's create a helper function to retrieve these IDs. This will make it easier to manage models, such as loading, disposing, or performing other operations on them.
*/

const getModelsIds = () => {
  const models = fragments.models.list.values();
  const ids = [...models].map((model) => model.modelId);
  return ids;
};

/* MD
  ### 🛡️ Prevent Memory Leaks
  Proper memory management is crucial to ensure your application remains performant and stable. While Fragments Models are optimized for efficiency, it's important to dispose of unused models to prevent memory leaks. Here's a utility function to help you manage this effectively:
*/

const disposeModels = async (ids = getModelsIds()) => {
  const promises = [];
  for (const id of ids) promises.push(fragments.disposeModel(id));
  await Promise.all(promises);
};

/* MD
  ### 🧩 Adding User Interface (optional)
  We will use the `@thatopen/ui` library to add some simple and cool UI elements to our app. First, we need to call the `init` method of the `BUI.Manager` class to initialize the library:
*/

BUI.Manager.init();

/* MD
Now we will add some UI to handle the logic of this tutorial. For more information about the UI library, you can check the specific documentation for it!
*/

const [panel, updatePanel] = BUI.Component.create<BUI.PanelSection, any>(
  (_) => {
    const ids = getModelsIds();

    const onLoadModel = async ({ target }: { target: BUI.Button }) => {
      const name = target.getAttribute("data-name");
      if (!name) return;
      const id = `school_${name}`;
      target.loading = true;
      if (ids.includes(id)) {
        await disposeModels([id]);
      } else {
        await loadFragmentFile(
          `https://thatopen.github.io/engine_fragment/resources/frags/${id}.frag`,
          id,
        );
      }
      target.loading = false;
    };

    const onDisposeModels = () => disposeModels();

    const onDownloadModel = async ({ target }: { target: BUI.Button }) => {
      const name = target.getAttribute("data-name");
      if (!name) return;
      const id = `school_${name}`;
      target.loading = true;
      const result = await getBinaryData(id);
      if (result) {
        const { name, buffer } = result;
        const a = document.createElement("a");
        const file = new File([buffer], `${name}.frag`);
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(a.href);
      }
      target.loading = false;
    };

    const arqLoaded = ids.some((id) => id.includes("arq"));
    const strLoaded = ids.some((id) => id.includes("str"));
    const mepLoaded = ids.some((id) => id.includes("mep"));

    const arqLabel = arqLoaded ? "Remove Architecture" : "Load Architecture";
    const strLabel = strLoaded ? "Remove Structure" : "Load Structure";
    const mepLabel = mepLoaded ? "Remove Systems" : "Load Systems";

    return BUI.html`
    <bim-panel id="controls-panel" active label="Fragments Models" class="options-menu">
      <bim-panel-section label="Controls">
        <div style="display: flex; gap: 0.25rem">
          <bim-button data-name="arq" label=${arqLabel} @click=${onLoadModel}></bim-button>
          ${arqLoaded ? BUI.html`<bim-button data-name="arq" label="Download" @click=${onDownloadModel}></bim-button>` : null}
        </div>
        <div style="display: flex; gap: 0.25rem">
          <bim-button data-name="str" label=${strLabel} @click=${onLoadModel}></bim-button>
          ${strLoaded ? BUI.html`<bim-button data-name="str" label="Download" @click=${onDownloadModel}></bim-button>` : null}
        </div>
        <div style="display: flex; gap: 0.25rem">
          <bim-button data-name="mep" label=${mepLabel} @click=${onLoadModel}></bim-button>
          ${mepLoaded ? BUI.html`<bim-button data-name="mep" label="Download" @click=${onDownloadModel}></bim-button>` : null}
        </div>
        <bim-button ?disabled=${ids.length === 0} label="Remove All" @click=${onDisposeModels}></bim-button>
      </bim-panel-section>
    </bim-panel>
  `;
  },
  {},
);

fragments.models.list.onItemSet.add(() => updatePanel());
fragments.models.list.onItemDeleted.add(() => updatePanel());

document.body.append(panel);

/* MD
  And we will make some logic that adds a button to the screen when the user is visiting our app from their phone, allowing to show or hide the menu. Otherwise, the menu would make the app unusable.
*/

const button = BUI.Component.create<BUI.PanelSection>(() => {
  const onClick = () => {
    if (panel.classList.contains("options-menu-visible")) {
      panel.classList.remove("options-menu-visible");
    } else {
      panel.classList.add("options-menu-visible");
    }
  };

  return BUI.html`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${onClick}>
    </bim-button>
  `;
});

document.body.append(button);

/* MD
  ### ⏱️ Measuring the performance (optional)
  We'll use the [Stats.js](https://github.com/mrdoob/stats.js) to measure the performance of our app. We will add it to the top left corner of the viewport. This way, we'll make sure that the memory consumption and the FPS of our app are under control.
*/

const stats = new Stats();
stats.showPanel(2);
document.body.append(stats.dom);
stats.dom.style.left = "0px";
stats.dom.style.zIndex = "unset";
world.renderer.onBeforeUpdate.add(() => stats.begin());
world.renderer.onAfterUpdate.add(() => stats.end());

/* MD
  ### 🎉 Congratulations!
  You've successfully learned how to load and manage Fragments Models! 🚀

  By following this guide, you've set up a robust foundation for working with 3D models in your application. From loading and disposing of models to adding a user-friendly interface and optimizing performance, you're now equipped to take your project to the next level.

  Keep exploring, experimenting, and building amazing things with Fragments! 🌟
*/
