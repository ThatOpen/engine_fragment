/* MD
  ## Getting Your Fragments Model Information 👀
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

const highlightMaterial: FRAGS.MaterialDefinition = {
  color: new THREE.Color("gold"),
  renderedFaces: FRAGS.RenderedFaces.TWO,
  opacity: 1,
  transparent: false,
};

let localId: number | null = null;

const highlight = async () => {
  if (!localId) return;
  await fragments.highlight(highlightMaterial, { [model.modelId]: [localId] });
};

const resetHighlight = async () => {
  if (!localId) return;
  await fragments.resetHighlight({ [model.modelId]: [localId] });
};

let onItemSelected = () => {};
let onItemDeselected = () => {};

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
    onItemSelected();
    promises.push(highlight());
  } else {
    promises.push(resetHighlight());
    localId = null;
    onItemDeselected();
  }
  promises.push(fragments.update(true));
  Promise.all(promises);
});

/* MD
  ### Getting Item Attributes
*/

const getAttributes = async (attributes?: string[]) => {
  if (!localId) return null;
  const [data] = await model.getItemsData([localId], {
    attributesDefault: !attributes,
    attributes,
  });
  return data;
};

/* MD
  You can extract specific attributes very easily
  */

const getName = async () => {
  const attributes = await getAttributes(["Name"]);
  const Name = attributes?.Name;
  if (!(Name && "value" in Name)) return null;
  return Name.value as "string";
};

/* MD
  ### Get Relations
*/

const getItemPropertySets = async () => {
  if (!localId) return null;
  const [data] = await model.getItemsData([localId], {
    attributesDefault: false,
    attributes: ["Name", "NominalValue"],
    relations: {
      IsDefinedBy: { attributes: true, relations: true },
      DefinesOcurrence: { attributes: false, relations: false },
    },
  });
  return (data.IsDefinedBy as FRAGS.ItemData[]) ?? [];
};

/* MD
  [cool text about formating the data returned]
*/

const formatItemPsets = (rawPsets: FRAGS.ItemData[]) => {
  const result: Record<string, Record<string, any>> = {};
  for (const [_, pset] of rawPsets.entries()) {
    const { Name: psetName, HasProperties } = pset;
    if (!("value" in psetName && Array.isArray(HasProperties))) continue;
    const props: Record<string, any> = {};
    for (const [_, prop] of HasProperties.entries()) {
      const { Name, NominalValue } = prop;
      if (!("value" in Name && "value" in NominalValue)) continue;
      const name = Name.value;
      const nominalValue = NominalValue.value;
      if (!(name && nominalValue !== undefined)) continue;
      props[name] = nominalValue;
    }
    result[psetName.value] = props;
  }
  return result;
};

/* MD
  ### Getting Attributes from Category
  */

const getNamesFromCategory = async (category: string, unique = false) => {
  const items = await model.getItemsOfCategory(category);
  const localIds = (
    await Promise.all(items.map((item) => item.getLocalId()))
  ).filter((localId) => localId !== null) as number[];

  const data = await model.getItemsData(localIds, {
    attributesDefault: false,
    attributes: ["Name"],
  });

  const names = data
    .map((d) => {
      const { Name } = d;
      if (!(Name && !Array.isArray(Name))) return null;
      return Name.value;
    })
    .filter((name) => name) as string[];

  return unique ? [...new Set(names)] : names;
};

/* MD
  ### Fragments Model Spatial Structure
  */

const getSpatialStructure = async () => {
  const result = await model.getSpatialStructure();
  return result;
};

const getFirstLevelChildren = async () => {
  const items = await model.getItemsOfCategory("IFCBUILDINGSTOREY");
  const localIds = (
    await Promise.all(items.map((item) => item.getLocalId()))
  ).filter((localId) => localId !== null) as number[];

  const attributes = await model.getItemsData(localIds, {
    attributesDefault: false,
    attributes: ["Name"],
  });

  let firstLevelLocalId = null;

  for (const [index, data] of attributes.entries()) {
    if (!("Name" in data && "value" in data.Name)) continue;
    if (data.Name.value === "01 - Entry Level") {
      firstLevelLocalId = localIds[index];
    }
  }

  if (firstLevelLocalId === null) return null;

  const children = await model.getItemsChildren([firstLevelLocalId]);
  return children;
};

/* MD
  ### 🧩 Adding User Interface (optional)
  We will use the `@thatopen/ui` library to add some simple and cool UI elements to our app. First, we need to call the `init` method of the `BUI.Manager` class to initialize the library:
*/

BUI.Manager.init();

/* MD
Now we will add some UI to handle the logic of this tutorial. For more information about the UI library, you can check the specific documentation for it!
*/

const categories = await model.getCategories();
const categoriesDropdown = BUI.Component.create<BUI.Dropdown>(
  () => BUI.html`<bim-dropdown name="categories">
    ${categories.map(
      (category) => BUI.html`<bim-option label=${category}></bim-option>`,
    )}
  </bim-dropdown>`,
);

const [panel, updatePanel] = BUI.Component.create<BUI.PanelSection, any>(
  (_) => {
    const onLogAttributes = async () => {
      const data = await getAttributes();
      if (!data) return;
      console.log(data);
    };

    const onLogPsets = async () => {
      const data = await getItemPropertySets();
      if (!data) return;
      const panel = document.getElementById("controls-panel");
      const checkbox = panel?.querySelector<BUI.Checkbox>('[name="format"]');
      const result = checkbox?.value ? formatItemPsets(data) : data;
      console.log(result);
    };

    const onNamesFromCategory = async ({ target }: { target: BUI.Button }) => {
      const panel = document.getElementById("controls-panel");
      const [category] = categoriesDropdown.value;
      if (!category) return;
      target.loading = true;
      const checkbox = panel?.querySelector<BUI.Checkbox>('[name="unique"]');
      const data = await getNamesFromCategory(category, checkbox?.value);
      target.loading = false;
      console.log(data);
    };

    const onNameLabelCreated = async (e?: Element) => {
      if (!e) return;
      const label = e as BUI.Label;
      label.textContent = await getName();
    };

    const onLogStructure = async ({ target }: { target: BUI.Button }) => {
      target.loading = true;
      const result = await getSpatialStructure();
      console.log(result);
      target.loading = false;
    };

    const onLogLevelItems = async ({ target }: { target: BUI.Button }) => {
      target.loading = true;
      const result = await getFirstLevelChildren();
      if (!result) {
        target.loading = false;
        return;
      }
      const panel = document.getElementById("controls-panel");
      const checkbox = panel?.querySelector<BUI.Checkbox>(
        '[name="displayNames"]',
      );
      if (checkbox) {
        const attrs = await model.getItemsData(result, {
          attributesDefault: false,
          attributes: ["Name"],
        });
        const names = attrs.map((data) => {
          if (!("Name" in data && "value" in data.Name)) return null;
          return data.Name.value;
        });
        console.log(names);
      } else {
        console.log(result);
      }
      target.loading = false;
    };

    return BUI.html`
    <bim-panel id="controls-panel" active label="Model Information" class="options-menu">
      <bim-panel-section fixed label="Info">
        <bim-label style="white-space: normal;">💡 To better experience this tutorial, open your browser console to see the data logs.</bim-label>
      </bim-panel-section>
      <bim-panel-section label="Selected Item">
        <bim-label style=${BUI.styleMap({ whiteSpace: "normal", display: localId ? "none" : "unset" })}>💡 Click any element in the viewer to activate the data log options.</bim-label>
        <bim-label ${BUI.ref(onNameLabelCreated)} style=${BUI.styleMap({ whiteSpace: "normal", display: !localId ? "none" : "unset" })}></bim-label>
        <bim-button ?disabled=${!localId} label="Log Attributes" @click=${onLogAttributes}></bim-button>
        <div style="display: flex; gap: 0.5rem">
          <bim-button ?disabled=${!localId} label="Log Psets" @click=${onLogPsets}></bim-button>
          <bim-checkbox name="format" label="Format" inverted checked></bim-checkbox>
        </div>
      </bim-panel-section>
      <bim-panel-section label="Categories">
        ${categoriesDropdown}
        <div style="display: flex; gap: 0.5rem">
          <bim-button label="Log Names" @click=${onNamesFromCategory}></bim-button>
          <bim-checkbox name="unique" label="Unique" inverted></bim-checkbox>
        </div>
      </bim-panel-section>
      <bim-panel-section label="Spatial Structure">
        <bim-button label="Log Spatial Structure" @click=${onLogStructure}></bim-button>
        <div style="display: flex; gap: 0.5rem">
          <bim-button label="Log First Level Items" @click=${onLogLevelItems}></bim-button>
          <bim-checkbox name="displayNames" label="Names" inverted></bim-checkbox>
        </div>
      </bim-panel-section>
    </bim-panel>
  `;
  },
  {},
);

onItemSelected = () => updatePanel();
onItemDeselected = () => updatePanel();
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
