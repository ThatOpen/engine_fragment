/* MD
  ## Getting Your Fragments Model Information 🗒️
  ---
  A BIM model is only as valuable as the information it provides. Retrieving specific data efficiently is crucial for any workflow. In this tutorial, you'll learn how to extract and utilize data from Fragments with ease!
  
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
  ### 🤏 Setting Up Raycaster
  To enable element selection and information querying in this example, let's configure a straightforward raycasting operation for the model:
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
  await model.highlight([localId], highlightMaterial);
};

const resetHighlight = async () => {
  if (!localId) return;
  await model.resetHighlight([localId]);
};

let onItemSelected = () => {};
let onItemDeselected = () => {};

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
  :::info Raycasting

  If you're unfamiliar with the raycasting logic above, we recommend checking out the dedicated raycasting tutorial. It provides a detailed explanation and step-by-step guidance to help you understand how raycasting works in this context.

  :::

  ### 🗒️ Getting Item Attributes
  Great! With the raycasting setup complete, let's move on to the exciting part: extracting information. To begin, we'll create a handy function to retrieve the direct attributes of the selected item in the scene:
*/

const getAttributes = async (attributes?: string[]) => {
  if (!localId) return null;
  // This model method is the most straightforward way to get information
  // about one or multiple elements.
  // You can see the options in the API reference.
  const [data] = await model.getItemsData([localId], {
    attributesDefault: !attributes,
    attributes,
  });
  return data;
};

/* MD
  The function above is designed to retrieve all attributes if none are specified. However, if you're only interested in a specific set of attributes, you can easily pass them as parameters. Let's create a function that retrieves just the name of the selected item:
  */

const getName = async () => {
  const attributes = await getAttributes(["Name"]);
  const Name = attributes?.Name;
  if (!(Name && "value" in Name)) return null;
  return Name.value as "string";
};

/* MD
  ### 🔗 Retrieving Item Relations
  Accessing the direct attributes of an item is useful, but the true power lies in exploring its relationships. Items can be interconnected through relations, enabling you to understand their context and associations. For instance, a level can contain walls, and walls can reference the level they belong to. These relationships are often defined in the source file from which the Fragments were converted.

  For Fragments derived from IFC files, the possible relations and their names are determined by the IFC schema. Let's create a helper function to retrieve all Property Sets (Psets) associated with the selected item, leveraging these relationships.
*/

// `IsDefinedBy` is the relationship that links property sets (psets) to the element they define.
// `DefinesOccurrence` is the relationship that links a property set to the elements that use it.
// In this case, we don't need to know the elements that have the psets (just the psets of the selected element)
// Then we don't want to get DefinesOcurrences items and that's by attributes and relations are set to false.
// For more information, please refer to the IFC schema documentation
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
  The data returned from the function above is structured similarly to how it's stored internally in the Fragments file. However, this format might not always be regular-developer-friendly. To make it more convenient, let's create a function that formats the result into a regular object for easier consumption:
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
  ### 📊 More Data Operations
  Beyond accessing attributes and relationships, you can also retrieve the full list of categories in the model. This enables convenient operations like fetching all elements from a specific category, which is a common use case. Let's create a function to retrieve all item names from a given category:
  */

const getNamesFromCategory = async (category: string, unique = false) => {
  const categoryIds = await model.getItemsOfCategories([
    new RegExp(`^${category}$`),
  ]);
  const localIds = categoryIds[category];

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
  ### 🌐 Exploring the Spatial Structure
  The spatial structure is a fundamental aspect of any BIM model, as it defines the hierarchical relationships between elements. With Fragments, retrieving this structure is straightforward. Here's how you can do it:
  */

const getSpatialStructure = async () => {
  const result = await model.getSpatialStructure();
  return result;
};

/* MD
  Now, thanks to the spatial structure present in the model, you can perform useful operations, such as retrieving all children of a specific item. This parent/child relationship is derived from the spatial structure, so ensure the structure accurately reflects these relationships to make the following function effective:
  */

const getFirstLevelChildren = async () => {
  const categoryIds = await model.getItemsOfCategories([/BUILDINGSTOREY/]);
  const localIds = categoryIds.IFCBUILDINGSTOREY;

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
  ### 🧱 Accessing Geometry Data
  A key reason why a FragmentsModel is highly memory-efficient is that all BufferAttributes from the geometry in ThreeJS are removed after being used to render the model in the scene. However, all the data you see in the model, including the explicit geometry used to create the meshes in the first place, is stored within the Fragments file. Fortunately, retrieving this information is straightforward in case you need it. Here's how you can do it:
*/

const getItemGeometry = async () => {
  if (!localId) return null;
  const [geometryCollection] = await model.getItemsGeometry([localId]);
  return geometryCollection;
};

/* MD
  :::info

  Keep in mind that a single item may consist of multiple geometries. This is why the model method used above returns a nested array structure: the outer array represents the collection of items, while the inner arrays contain the geometries associated with each item.

  :::

  You can combine this with retrieving items from a category to obtain the complete explicit geometry of a specific group of elements.
  */

const getGeometriesFromCategory = async (category: string) => {
  const items = await model.getItemsOfCategories([new RegExp(`^${category}$`)]);

  const localIds = Object.values(items).flat();
  const geometries = await model.getItemsGeometry(localIds);
  return { localIds, geometries };
};

/* MD
  Finally, you can easily create a new ThreeJS mesh using any geometry data retrieved from the FragmentsModel. Here's how:
*/

let meshes: THREE.Mesh[] = [];

const meshMaterial = new THREE.MeshLambertMaterial({ color: "purple" });

const createMesh = (data: FRAGS.MeshData) => {
  const { positions, indices, normals, transform } = data;
  if (!(positions && indices && normals)) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(Array.from(indices));

  const mesh = new THREE.Mesh(geometry, meshMaterial);
  mesh.applyMatrix4(transform);
  meshes.push(mesh);
  return mesh;
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

    const onLogGeometry = async ({ target }: { target: BUI.Button }) => {
      target.loading = true;
      const data = await getItemGeometry();
      if (!data) {
        target.loading = false;
        return;
      }
      target.loading = false;
      console.log(data);
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

    const onGeometriesFromCategory = async ({
      target,
    }: {
      target: BUI.Button;
    }) => {
      const [category] = categoriesDropdown.value;
      if (!category) return;
      target.loading = true;
      const { localIds, geometries: data } =
        await getGeometriesFromCategory(category);
      for (const value of data) {
        for (const meshData of value) {
          const mesh = createMesh(meshData);
          if (!mesh) continue;
          world.scene.three.add(mesh);
        }
      }
      await model.setVisible(localIds, false);
      await fragments.update(true);
      target.loading = false;
      console.log(data);
    };

    const onDisposeMeshes = async () => {
      for (const mesh of meshes) {
        mesh.removeFromParent();
        mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        for (const material of materials) {
          material.dispose();
        }
      }
      meshes = [];
      await model.setVisible(undefined, true);
      await fragments.update(true);
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
          <bim-button ?disabled=${!localId} label="Log Geometry" @click=${onLogGeometry}></bim-button>
      </bim-panel-section>
      <bim-panel-section label="Categories">
        ${categoriesDropdown}
        <div style="display: flex; gap: 0.5rem">
          <bim-button label="Log Names" @click=${onNamesFromCategory}></bim-button>
          <bim-checkbox name="unique" label="Unique" inverted></bim-checkbox>
        </div>
        <bim-button label="Log Geometries" @click=${onGeometriesFromCategory}></bim-button>
        <bim-button label="Dispose Meshes" @click=${onDisposeMeshes}></bim-button>
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
  ### 🎉 Congratulations!
  You've successfully mastered the art of retrieving information from your FragmentsModel! 🚀
  
  With this knowledge, you're now equipped to explore, manipulate, and extract valuable insights from your BIM models. Keep experimenting and building amazing applications! 💡
*/
