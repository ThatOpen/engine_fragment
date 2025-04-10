// Disable no extraneous dependencies as this is just for the examples
/* eslint-disable import/no-extraneous-dependencies */

/* MD
  ## Items finder 🧐
  ---
  [Some cool intro goes here]
  
  ### 🖖 Importing our Libraries
  First things first, let's install all necessary dependencies to make this little example work:
*/

import * as THREE from "three";
import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import Stats from "stats.js";
import { FragmentsModels } from "../..";
// You have to import from "@thatopen/fragments"

/* MD
  ### 🌎 Setting up a Simple Scene
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
world.camera.controls.setLookAt(80, 25, -52, 11, -9.5, -3); // convenient position for the model we will load

components.init();

const grids = components.get(OBC.Grids);
grids.create(world);

/* MD
  :::info Do I need @thatopen/components?

  Not really! We use @thatopen/components for convenience as it is really easy to setup a scene with it. However, you can use plain ThreeJS to create your own scene setup 😉

  :::

  ### Setting Up Fragments
  */

// You have to copy `node_modules/@thatopen/fragments/dist/Worker/worker.mjs` to your project directory
// and provide the relative path in `workerUrl`
const workerUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
const fragments = new FragmentsModels(workerUrl);
world.camera.controls.addEventListener("rest", () => fragments.update(true));

fragments.models.list.onItemSet.add(async ({ value: model }) => {
  model.useCamera(world.camera.three);
  world.scene.three.add(model.object);
  await fragments.update(true);
  setTimeout(async () => {
    const sphere = new THREE.Sphere();
    const box = model.box;
    box.getBoundingSphere(sphere);
    await world.camera.controls.fitToSphere(sphere, true);
  }, 1000);
});

/* MD
  ### Loading a Fragments Model
*/

const loadFragmentFile = async (url: string, id: string) => {
  const file = await fetch(url);
  const buffer = await file.arrayBuffer();
  await fragments.load(buffer, { modelId: id });
};

const getBinaryData = async (id: string) => {
  const model = fragments.models.list.get(id);
  if (!model) return null;
  const buffer = await model.getBuffer(false);
  return { name: model.modelId, buffer };
};

const getModelsIds = () => {
  const models = fragments.models.list.values();
  const ids = [...models].map((model) => model.modelId);
  return ids;
};

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
        await loadFragmentFile(`/resources/frags/${id}.frag`, id);
      }
      target.loading = false;
    };

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

    const onDisposeModels = () => disposeModels();

    const arqLoaded = ids.some((id) => id.includes("arq"));

    const arqLabel = arqLoaded ? "Remove Architecture" : "Load Architecture";

    return BUI.html`
    <bim-panel id="controls-panel" active label="Fragments Models" class="options-menu">
      <bim-panel-section label="Controls">
        <div style="display: flex; gap: 0.25rem">
          <bim-button data-name="arq" label=${arqLabel} @click=${onLoadModel}></bim-button>
           ${arqLoaded ? BUI.html`<bim-button data-name="arq" label="Download" @click=${onDownloadModel}></bim-button>` : null}
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
  ### ⏱️ Congratulations!
*/
