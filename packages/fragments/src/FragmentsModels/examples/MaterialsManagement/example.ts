/* MD
  ## Managing Model Materials 🧐
  ---
  [Some cool intro goes here]
  
  ### 🖖 Importing our Libraries
  First things first, let's install all necessary dependencies to make this little example work:
*/

import * as THREE from "three";
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

const spaceItems = await model.getItemsOfCategory("IFCSPACE");
const localIds = (
  await Promise.all(spaceItems.map((wall) => wall.getLocalId()))
).filter((localId) => typeof localId !== "undefined") as number[];
await model.setVisible(localIds, false);
fragments.update(true);

/* MD
  ### Setup Raycaster
*/

let localId: number | null = null;
let previousDefinition: FRAGS.MaterialDefinition | null = null;

const storePreviousDefinition = async () => {
  if (!localId) return;
  const [materialDefinition] = await model.getHighlight([localId]);
  previousDefinition = materialDefinition ?? null;
};

const resetHighlight = async () => {
  if (!localId) return;
  if (previousDefinition) {
    await fragments.highlight(previousDefinition, {
      [model.modelId]: [localId],
    });
    previousDefinition = null;
  } else {
    await fragments.resetHighlight({ [model.modelId]: [localId] });
  }
};

let highlightMaterial: FRAGS.MaterialDefinition = {
  color: new THREE.Color("gold"),
  renderedFaces: FRAGS.RenderedFaces.TWO,
  opacity: 1,
  transparent: false,
  customId: "selection",
};

const highlight = async () => {
  if (!localId) return;
  await fragments.highlight(highlightMaterial, { [model.modelId]: [localId] });
};

const mouse = new THREE.Vector2();
container.addEventListener("click", async (event) => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
  const result = await fragments.raycast({
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
  ### Assigning Materials
*/

const randomMaterial = (customId?: string) => {
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
      definition = randomMaterial(category);
    }
    promises.push(
      fragments.highlight(definition, { [model.modelId]: localIds }),
    );
    onCategoryColorSet(category, definition.color);
    if (localId && localIds.includes(localId)) previousDefinition = definition;
  }
  if (localId) promises.push(highlight());
  promises.push(fragments.update(true));
  await Promise.all(promises);
};

const setRandomCategoryColors = async () => {
  const categories = await model.getCategories();
  await setCategoriesColor(categories);
};

let onResetColors = () => {};
const resetColors = async () => {
  await model.resetHighlight();
  onResetColors();
  if (!localId) return;
  previousDefinition = null;
  await fragments.highlight(highlightMaterial, { [model.modelId]: [localId] });
};

const getColorizedLocalIds = async () => {
  const localIds = (await model.getHighlightItemIds()).filter(
    (id) => id !== localId,
  );
  return localIds;
};

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
  ### ⏱️ Congratulations!
*/
