/* MD
  ## Managing Your Fragments Visibility 👀
  ---
  [Some cool intro goes here]
  
  ### 🖖 Importing our Libraries
  First things first, let's install all necessary dependencies to make this little example work:
*/

import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import Stats from "stats.js";
// You have to import from "@thatopen/fragments"
import * as FRAGS from "../../..";

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
const workerUrl = "../../src/multithreading/fragments-thread.ts";
const fragments = new FRAGS.FragmentsModels(workerUrl);
world.camera.controls.addEventListener("rest", () => fragments.update(true));

fragments.models.list.onItemSet.add(({ value: model }) => {
  model.useCamera(world.camera.three);
  world.scene.three.add(model.object);
  fragments.update(true);
});

/* MD
  ### Loading a Fragments Model
*/

const file = await fetch("/resources/frags/medium_test.frag");
const buffer = await file.arrayBuffer();
const model = await fragments.load(buffer, { modelId: "example" });

/* MD
  ### Hiding Items
*/

const spaces = await model.getItemsOfCategory("IFCSPACE");
const spaceLocalIds = (
  await Promise.all(spaces.map((space) => space.getLocalId()))
).filter((localId) => typeof localId !== "undefined") as number[];

await model.setVisible(spaceLocalIds, false);
await fragments.update(true);

/* MD
  ### Toggle Items
*/

const toggleVisibilityByCategory = async (category: string) => {
  const items = await model.getItemsOfCategory(category);
  const localIds = (
    await Promise.all(items.map((wall) => wall.getLocalId()))
  ).filter((localId) => typeof localId !== "undefined") as number[];
  await model.toggleVisible(localIds);
  await fragments.update(true);
};

/* MD
  ### Get Visibility
*/

const getVisibilityByCategory = async (category: string) => {
  const items = await model.getItemsOfCategory(category);
  const localIds = (
    await Promise.all(items.map((wall) => wall.getLocalId()))
  ).filter((localId) => localId !== null) as number[];
  const result = await model.getVisible(localIds);
  const count = result.reduce(
    (acc, isVisible) => {
      if (isVisible) {
        acc.visible++;
      } else {
        acc.hidden++;
      }
      return acc;
    },
    { visible: 0, hidden: 0 },
  );
  return count;
};

/* MD
  ### Get By Visibility
*/

const getVisibilityCount = async () => {
  const visible = await model.getItemsByVisibility(true);
  const hidden = await model.getItemsByVisibility(false);
  return { visible: visible.length, hidden: hidden.length };
};

/* MD
  ### 🧩 Adding User Interface (optional)
  We will use the `@thatopen/ui` library to add some simple and cool UI elements to our app. First, we need to call the `init` method of the `BUI.Manager` class to initialize the library:
*/

BUI.Manager.init();

/* MD
Now we will add some UI to handle the logic of this tutorial. For more information about the UI library, you can check the specific documentation for it!
*/

const panel = BUI.Component.create<BUI.PanelSection>(() => {
  const onDisplayCountClick = async () => {
    const { visible, hidden } = await getVisibilityByCategory("IFCSLAB");
    window.alert(
      `Visible Slabs: ${visible}.
Hidden Slabs: ${hidden}.`,
    );
  };

  const onDisplayVisibilityCount = async () => {
    const { visible, hidden } = await getVisibilityCount();
    window.alert(
      `Visible: ${visible} items.
Hidden: ${hidden} items.`,
    );
  };

  return BUI.html`
    <bim-panel active label="Fragments Visibility" class="options-menu">
      <bim-panel-section fixed label="Controls">
        <bim-button label="Toggle Walls" @click=${() => toggleVisibilityByCategory("IFCWALLSTANDARDCASE")}></bim-button>  
        <bim-button label="Toggle Slabs" @click=${() => toggleVisibilityByCategory("IFCSLAB")}></bim-button>  
        <bim-button label="Display Slab Visibility" @click=${onDisplayCountClick}></bim-button>  
        <bim-button label="Display Visibility State" @click=${onDisplayVisibilityCount}></bim-button>  
      </bim-panel-section>
    </bim-panel>
  `;
});

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
