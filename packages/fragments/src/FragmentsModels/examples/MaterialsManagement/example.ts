/* MD
  ## Managing Model Materials 🧐
  ---
  Making the models appear how you want is important! In this guide, we will explore how to manage and manipulate materials in a Fragments Model. Whether you're a beginner or an experienced developer, this tutorial will walk you through the process of setting up a scene, interacting with 3D objects, and customizing their appearance.
  
  ### 🖖 Importing our Libraries
  First things first, let's install all necessary dependencies to make this example work:
*/

import * as THREE from "three";
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
world.camera.controls.setLookAt(183, 11, -102, 27, -52, -11); // convenient position for the model we will load

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
const workerUrl = "../../src/multithreading/fragments-thread.ts";
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

const file = await fetch("/resources/frags/school_arq.frag");
const buffer = await file.arrayBuffer();
const model = await fragments.load(buffer, { modelId: "example" });

/* MD
  ### 🤏 Setup Material Changes via Raycasting
  One of the most common operations when working with materials is changing them based on user interactions, such as clicking on objects. This provides visual feedback to the user, indicating that an element has been selected and is ready for further interaction. Let's begin by defining variables for some basic information:
*/

// In Fragments, the localId is the equivalent to the expressId in IFCs
// It uniquely identifies an item within Fragments Model
// We will assign the localId a value based on the result given by the raycasting
let localId: number | null = null;
let previousDefinition: FRAGS.MaterialDefinition | null = null;

/* MD
  :::info What is a material definition?

  A material definition is a lightweight representation of a material in ThreeJS. It includes essential properties such as color, face rendering options, opacity, and a custom identifier (`customId`). This abstraction allows for efficient material management and customization in 3D scenes when passing data to the fragments worker.

  :::

  Let's now create a helper function to store the previously assigned material definition for an item. This allows us to modify the material temporarily and revert to the original definition when needed:
*/

// Asynchronously retrieves and stores the previous material definition for a given local ID.
// This function checks if a `localId` is defined. If so, it fetches the material definition
// associated with the `localId` using the `model.getHighlight` method. The retrieved material
// definition is then stored in the `previousDefinition` variable. If no material definition
// is found, `previousDefinition` is set to `null`.
const storePreviousDefinition = async () => {
  if (!localId) return;
  const [materialDefinition] = await model.getHighlight([localId]);
  previousDefinition = materialDefinition ?? null;
};

/* MD
  Next, let's define a function that will reset the material definition of an item to its previous state. This ensures that any temporary changes made to the material can be reverted seamlessly:
*/

// Resets the highlight state of a specific model element identified by `localId`.
// If a `previousDefinition` exists, it applies the highlight using the previous definition
// and then clears the `previousDefinition`. Otherwise, it resets the highlight for the element.
const resetHighlight = async () => {
  if (!localId) return;
  if (previousDefinition) {
    await model.highlight([localId], previousDefinition);
    previousDefinition = null;
  } else {
    await model.resetHighlight([localId]);
  }
};

/* MD
  Great! Now that we have the helper functions ready, let's define the material definition that will be used for item selection. This material will provide a clear visual indication of the selected item:
*/

let highlightMaterial: FRAGS.MaterialDefinition = {
  color: new THREE.Color("gold"),
  renderedFaces: FRAGS.RenderedFaces.TWO,
  opacity: 1,
  transparent: false,
  customId: "selection",
};

/* MD
  Now, for demonstration purposes, let's add functionality to dynamically change the color of the currently selected item's material definition. This will allow users to customize the highlight color interactively:
*/

const setHighlightColor = (color: THREE.Color) => {
  const material = [...fragments.models.materials.list.values()].find(
    (material) => material.userData.customId === "selection",
  );
  // Make sure is not a LOD Material
  if (material && "color" in material) {
    material.color = color;
  } else {
    highlightMaterial = { ...highlightMaterial, color };
  }
};

/* MD
  Now that we have the material definition ready, let's set up raycasting. This will allow us to detect which object the user clicks on, assign the corresponding `localId`, and update the material definition to visually indicate selection:
*/

// To change the material definition of a model, use the `highlight` method and provide the list
// of `localIds` whose material definitions you want to update.
const highlight = async () => {
  if (!localId) return;
  await model.highlight([localId], highlightMaterial);
};

const mouse = new THREE.Vector2();
container.addEventListener("click", async (event) => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
  const result = await model.raycast({
    camera: world.camera.three,
    mouse,
    dom: world.renderer!.three.domElement!,
  });
  const promises = [];
  if (result) {
    promises.push(resetHighlight());
    localId = result.localId;
    promises.push(storePreviousDefinition(), highlight());
  } else {
    promises.push(resetHighlight());
    localId = null;
  }
  promises.push(fragments.update(true));
  Promise.all(promises);
});

/* MD
  Awesome! With the setup above, you can now click on any element in the model, and its material will dynamically change to reflect the selection. This provides a clear visual indication of the selected object, enhancing user interaction and experience.

  ### 🖌️ Assigning Materials to Model Elements
  In addition to selection-based material changes, you can programmatically assign materials to specific elements within the model. This allows for further customization and control over the appearance of your 3D scene.

  For example, you can easily assign colors to specific categories of elements, or apply random colors to all categories. These utilities make it easy to experiment with different visual styles and highlight important elements in your model.

  To start, let's create a function creates a new material definition with a random color:
*/

const randomDefinition = (customId?: string) => {
  const hexColor = `#${Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, "0")}`;

  const definition: FRAGS.MaterialDefinition = {
    color: new THREE.Color(hexColor),
    renderedFaces: FRAGS.RenderedFaces.TWO,
    opacity: 1,
    transparent: false,
    customId,
  };

  return definition;
};

/* MD
  Next, let's create a function that applies a specific color to all elements of a given category. If no color is provided, a random material definition will be generated for the category:
*/

let onCategoryColorSet = (_category: string, _color: THREE.Color) => {};
const setCategoriesColor = async (
  categories: string[],
  color?: THREE.Color,
) => {
  const promises = [];
  for (const category of categories) {
    const items = await model.getItemsOfCategory(category);
    const localIds = (
      await Promise.all(items.map((item) => item.getLocalId()))
    ).filter((localId) => localId !== null) as number[];
    if (localIds.length === 0) continue;
    let definition: FRAGS.MaterialDefinition;
    if (color) {
      definition = {
        color,
        renderedFaces: FRAGS.RenderedFaces.TWO,
        opacity: 1,
        transparent: false,
        customId: category,
      };
    } else {
      definition = randomDefinition(category);
    }
    promises.push(model.highlight(localIds, definition));
    onCategoryColorSet(category, definition.color);
    if (localId && localIds.includes(localId)) previousDefinition = definition;
  }
  if (localId) promises.push(highlight());
  promises.push(fragments.update(true));
  await Promise.all(promises);
};

/* MD
  Let's create a function that applies random colors to all categories in the model. This is a great way to visualize the different categories and their elements in a colorful and engaging manner:
*/

const setRandomCategoryColors = async () => {
  const categories = await model.getCategories();
  await setCategoriesColor(categories);
};

/* MD
  ### 📊 Additional Material Changing Operations
  There is more you can do about materials in your model. It might come a time in your app where you want to restore all the original colors in your model. Fortunately, this is straightforward to achieve:
*/

let onResetColors = () => {};
const resetColors = async () => {
  await model.resetHighlight();
  onResetColors();
  // If an element was selected based on the raycasting operation set before
  // do not clear the selection definition
  if (!localId) return;
  previousDefinition = null;
  await model.highlight([localId], highlightMaterial);
};

/* MD
  Another cool feature is that you can retrieve the `localId` of elements that currently have a material definition applied. This can be useful for debugging or for applying further operations on those elements:
*/

const getColorizedLocalIds = async () => {
  const localIds = (await model.getHighlightItemIds()).filter(
    (id) => id !== localId,
  );
  return localIds;
};

/* MD
  ### 🧩 Adding User Interface (optional)
  We will use the `@thatopen/ui` library to add some simple and cool UI elements to our app. First, we need to call the `init` method of the `BUI.Manager` class to initialize the library:
*/

BUI.Manager.init();

/* MD
Now we will add some UI to handle the logic of this tutorial. For more information about the UI library, you can check the specific documentation for it!
*/

let wallsColor = "#ffffff";
let platesColor = "#ffffff";

const [panel, updatePanel] = BUI.Component.create<BUI.PanelSection, any>(
  (_) => {
    const onRandomColors = async ({ target }: { target: BUI.Button }) => {
      target.loading = true;
      await setRandomCategoryColors();
      target.loading = false;
    };

    const onResetColors = async () => {
      await resetColors();
      await fragments.update(true);
    };

    const onHighlightColor = ({ target }: { target: BUI.ColorInput }) => {
      const color = new THREE.Color(target.color);
      setHighlightColor(color);
    };

    const onCategoryColor = (
      { target }: { target: BUI.ColorInput },
      categories: string[],
    ) => {
      const color = new THREE.Color(target.color);
      setCategoriesColor(categories, color);
    };

    const onLogColorized = async () => {
      const localIds = await getColorizedLocalIds();
      console.log(localIds);
    };

    return BUI.html`
    <bim-panel id="controls-panel" active label="Materials Management" class="options-menu">
      <bim-panel-section label="Controls">
        <bim-color-input color="#ffd700" label="Highlight Color" @input=${onHighlightColor}></bim-color-input>
        <bim-button label="Apply Random Colors" @click=${onRandomColors}></bim-button>
        <bim-button label="Reset Colors" @click=${onResetColors}></bim-button>
      </bim-panel-section>
      <bim-panel-section label="Category Colors">
        <bim-color-input color=${wallsColor} label="IfcWall" @input=${(e: any) => onCategoryColor(e, ["IFCWALL", "IFCWALLSTANDARDCASE"])}></bim-color-input>
        <bim-color-input color=${platesColor} label="IfcPlate" @input=${(e: any) => onCategoryColor(e, ["IFCPLATE"])}></bim-color-input>
      </bim-panel-section>
      <bim-panel-section label="Other">
        <bim-label style="white-space: normal;">💡 To better experience this section, open your browser console to see the data logs.</bim-label>
        <bim-button label="Log Colorized Ids" @click=${onLogColorized}></bim-button>
      </bim-panel-section>
    </bim-panel>
  `;
  },
  {},
);

onResetColors = () => {
  wallsColor = "#ffffff";
  platesColor = "#ffffff";
  updatePanel();
};

onCategoryColorSet = (category, color) => {
  let colorSet = false;
  if (category === "IFCWALL") {
    wallsColor = `#${color.getHexString()}`;
    colorSet = true;
  } else if (category === "IFCPLATE") {
    platesColor = `#${color.getHexString()}`;
    colorSet = true;
  }
  if (colorSet) updatePanel();
};

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
  ### 🥳 Congratulations!
  You're now a master in manipulating materials from your models.
*/
