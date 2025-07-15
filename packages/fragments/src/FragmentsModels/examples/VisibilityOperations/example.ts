/* MD
  ## Managing Your Fragments Visibility 👀
  ---
  Managing visibility—whether it's hiding, showing, or toggling—is a fundamental feature in any 3D application. In this tutorial, you'll learn how to effectively manage the visibility of your Fragments models!
  
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
const githubUrl =
  "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
const fetchedUrl = await fetch(githubUrl);
const workerBlob = await fetchedUrl.blob();
const workerFile = new File([workerBlob], "worker.mjs", {
  type: "text/javascript",
});
const workerUrl = URL.createObjectURL(workerFile);
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
  ### 📂 Loading a Fragments Model
  With the core setup complete, it's time to load a Fragments model into our scene. Fragments are optimized for fast loading and rendering, making them ideal for large-scale 3D models.

  :::info Where can I find Fragment files?

  You can use the sample Fragment files available in our repository for testing. If you have an IFC model you'd like to convert to Fragments, check out the IfcImporter tutorial for detailed instructions.

  :::
*/

const file = await fetch(
  "https://thatopen.github.io/engine_fragment/resources/frags/school_arq.frag",
);
const buffer = await file.arrayBuffer();
const model = await fragments.load(buffer, { modelId: "example" });

/* MD
  ### ❎ Hiding
  Hiding specific items in the model can be crucial for focusing on certain elements or decluttering the view. Here's how you can easily hide all `IfcRoof` elements immediately after the model has been loaded:
*/

const roofs = await model.getItemsOfCategories([/ROOF/]);
const roofLocalIds = Object.values(roofs).flat();
await model.setVisible(roofLocalIds, false);
await fragments.update(true);

/* MD
  ### 🔄 Toggling
  Toggling the visibility of items is a common requirement in 3D applications. To make this functionality reusable and efficient, let's create a function that toggles the visibility of items based on their category:
*/

const toggleVisibilityByCategory = async (category: string) => {
  const items = await model.getItemsOfCategories([new RegExp(`^${category}$`)]);
  const localIds = Object.values(items).flat();
  await model.toggleVisible(localIds);
  await fragments.update(true);
};

/* MD
  ### 👁️ Getting Current Visibility
  Knowing whether an item is visible or not can be crucial for various operations, such as displaying the names of visible items only. Here's a function to retrieve the visibility status of items based on their category:
*/

const getVisibilityByCategory = async (category: string) => {
  const items = await model.getItemsOfCategories([new RegExp(`^${category}$`)]);
  const localIds = Object.values(items).flat();
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
  In addition to the above, you can retrieve a list of `localIds` for all visible or hidden items in the entire model. Here's a function to get the count of visible and hidden elements efficiently:
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
        <bim-button label="Toggle Roofs" @click=${() => toggleVisibilityByCategory("IFCROOF")}></bim-button>  
        <bim-button label="Toggle Walls" @click=${() => toggleVisibilityByCategory("IFCWALL")}></bim-button>  
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
  ### 🎉 Congratulations!
  You've successfully mastered visibility management in Fragments!

  By following this tutorial, you've learned how to:
  - Hide specific elements in your 3D models.
  - Toggle visibility dynamically based on categories.
  - Retrieve visibility states for better control and insights.
  - Add a user-friendly interface to manage visibility operations.
  - Measure performance to ensure a smooth user experience.

  Keep experimenting and building amazing 3D applications with Fragments. 🚀
*/
