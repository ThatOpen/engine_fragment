// Disable no extraneous dependencies as this is just for the examples
/* eslint-disable import/no-extraneous-dependencies */

/* MD
  ## Items finder 🧐
  ---
  [Some cool intro goes here]
  
  ### 🖖 Importing our Libraries
  First things first, let's install all necessary dependencies to make this little example work:
*/

import * as OBC from "@thatopen/components";
import * as BUI from "@thatopen/ui";
import Stats from "stats.js";
import * as THREE from "three";
import * as FRAGS from "../..";
// You have to import from "@thatopen/fragments"

/* MD
  ### 🌎 Setting up a Simple Scene
*/

const query: FRAGS.ItemsQueryParams = {
  categories: [/WALL/, /SLAB/],
  relation: {
    name: "IsDefinedBy",
    query: {
      attributes: { queries: [{ name: /Name/, value: /Common/ }] },
      relation: {
        name: "HasProperties",
        query: {
          attributes: {
            aggregation: "inclusive",
            queries: [
              { name: /Name/, value: /IsExternal/ },
              { name: /NominalValue/, value: true },
            ],
          },
        },
      },
    },
  },
};

// const query: FRAGS.ItemsQueryParams = {
//   categories: ["IFCWALL"],
//   relation: {
//     name: "ContainedInStructure",
//     query: {
//       attribute: {
//         // aggregation: "inclusive",
//         queries: [
//           { name: /Name/, value: /NIVEL 1/ },
//           { name: /Name/, value: /NIVEL 2/ },
//         ],
//       },
//     },
//   },
// };

const TEST_MODEL_ID = "NAV-IPI-ET1_E07-ZZZ-M3D-EST";
const TEST_MODEL_URL = `/resources/frags/test/cg/${TEST_MODEL_ID}.frag`;
const IS_RAW_MODEL = false;

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
const workerUrl = "./../../src/multithreading/fragments-thread.ts";
const fragments = new FRAGS.FragmentsModels(workerUrl);
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
  const newModel = await fragments.load(buffer, {
    modelId: id,
    raw: IS_RAW_MODEL,
  });

  const mouse = new THREE.Vector2();

  window.addEventListener("dblclick", async (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;

    // if (event.code !== "KeyE") return;
    // RAYCASTING

    const result = await newModel.raycast({
      camera: world.camera.three,
      mouse,
      dom: world.renderer!.three.domElement!,
    });

    if (!result) {
      return;
    }

    console.log(result);

    // ITEMS (to get properties and geometries)
    const item = newModel.getItem(result.localId);
    console.log(item);
    const itemCategory = await item.getCategory();
    const itemRelations = await item.getRelations();
    console.log({ itemCategory, itemRelations });

    // Attributes
    const attributes = await item.getAttributes();
    console.log(attributes);

    await fragments.update(true);
  });
};

// const getBinaryData = async (id: string) => {
//   const model = fragments.models.list.get(id);
//   if (!model) return null;
//   const buffer = await model.getBuffer(false);
//   return { name: model.modelId, buffer };
// };

const getModelsIds = () => {
  const models = fragments.models.list.values();
  const ids = [...models].map((model) => model.modelId);
  return ids;
};

// const disposeModels = async (ids = getModelsIds()) => {
//   const promises = [];
//   for (const id of ids) promises.push(fragments.disposeModel(id));
//   await Promise.all(promises);
// };

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
    const modelIds = getModelsIds();

    const onLoadModel = async ({ target }: { target: BUI.Button }) => {
      const id = TEST_MODEL_ID;
      target.loading = true;
      await loadFragmentFile(TEST_MODEL_URL, id);
      target.loading = false;
    };

    const onSearch = async ({ target }: { target: BUI.Button }) => {
      // const categoryNameField = document.getElementById(
      //   "category-name",
      // ) as HTMLInputElement;

      // const attributeNameField = document.getElementById(
      //   "attribute-name",
      // ) as HTMLInputElement;
      // const attributeValueField = document.getElementById(
      //   "attribute-value",
      // ) as HTMLInputElement;
      // const relationCategoryField = document.getElementById(
      //   "relation-category",
      // ) as HTMLInputElement;
      // const relationNameField = document.getElementById(
      //   "relation-name",
      // ) as HTMLInputElement;
      // const relationAttributeNameField = document.getElementById(
      //   "relation-attribute-name",
      // ) as HTMLInputElement;
      // const relationAttributeValueField = document.getElementById(
      //   "relation-attribute-value",
      // ) as HTMLInputElement;

      // const categories = categoryNameField.value
      //   .split(",")
      //   .map((cat) => cat.trim());

      const model = fragments.models.list.get(TEST_MODEL_ID);

      if (!model) return;

      const now = performance.now();

      // let attributeQuery: FRAGS.GetItemsByAttributeParams | undefined;
      // if (attributeNameField.value.trim() !== "") {
      //   attributeQuery = {
      //     name: new RegExp(attributeNameField.value),
      //     value:
      //       attributeValueField.value.trim() !== ""
      //         ? new RegExp(attributeValueField.value)
      //         : undefined,
      //   };
      // }

      // let relationQuery:
      //   | { name: string; query?: FRAGS.ItemsQueryParams }
      //   | undefined;
      // if (relationNameField.value.trim() !== "") {
      //   let query: FRAGS.ItemsQueryParams | undefined;
      //   if (relationCategoryField.value.trim() !== "") {
      //     query = {
      //       categories: relationCategoryField.value
      //         .split(",")
      //         .map((cat) => cat.trim()),
      //     };
      //   }
      //   relationQuery = {
      //     name: relationNameField.value,
      //     query,
      //   };
      // }

      // const search: FRAGS.ItemsQueryParams = {
      //   categories:
      //     categories.length > 0 && categories.every((cat) => cat !== "")
      //       ? categories
      //       : undefined,
      //   relation: relationQuery,
      // };

      // if (attributeQuery)
      //   search.attribute = {
      //     aggregation: "exclusive",
      //     queries: [attributeQuery],
      //   };

      // console.log(search);

      target.loading = true;
      const localIds = await model.getItemsByQuery(query);
      console.log("Result", localIds);

      const then = performance.now();
      console.log(
        `Time taken for search: ${then - now}ms. Search results (${localIds.length}): ${localIds}`,
      );

      await model.resetHighlight();
      await model.highlight(localIds, {
        color: new THREE.Color("gold"),
        renderedFaces: 1,
        opacity: 1,
        transparent: false,
      });
      // await model.setVisible(undefined, false);
      // await model.setVisible(localIds, true);
      await fragments.update(true);
      target.loading = false;
    };

    const onGetItem = async () => {
      const itemIdField = document.getElementById(
        "item-id",
      ) as HTMLInputElement;
      const itemId = itemIdField.value;
      const model = fragments.models.list.get(TEST_MODEL_ID);
      if (!model) return;
      const data = await model.getItemsData([Number(itemId)], {
        relations: { IsDefinedBy: { attributes: true, relations: false } },
      });
      console.log(data);
    };

    const onResetVisiblity = () => {
      const promises = [];
      for (const model of fragments.models.list.values()) {
        promises.push(model.setVisible(undefined, true));
      }
      promises.push(fragments.update(true));
      Promise.all(promises);
    };

    const modelLoaded = Boolean(modelIds.length);

    const arqLabel = modelLoaded ? "Remove Model" : "Load Model";

    return BUI.html`
    <bim-panel id="controls-panel" active label="Fragments Models" class="options-menu">
      <bim-panel-section label="Controls">
        <div style="display: flex; gap: 0.25rem; flex-direction: column">
          <bim-button label=${arqLabel} @click=${onLoadModel}></bim-button>
          ${
            modelLoaded
              ? BUI.html`

            <bim-button label="Reset Visibility" @click=${onResetVisiblity}></bim-button>
            <fieldset style="color: white;">
              <legend>Category search</legend>
              <div style="display: flex; gap: 0.25rem; flex-direction: column">
              <bim-text-input id="category-name" label="Categories"></bim-text-input>
              </div>
            </fieldset>
          
            <fieldset>
              <legend style="color: white;">Attribute search</legend>
              <div style="display: flex; gap: 0.25rem; flex-direction: column">
              <bim-text-input id="attribute-name" label="Attribute"></bim-text-input>
              <bim-text-input id="attribute-value" label="Value"></bim-text-input>
              </div>
            </fieldset>
         
           <fieldset style="color: white;">
              <legend>Relation search</legend>
              <div style="display: flex; gap: 0.25rem; flex-direction: column">
              <bim-text-input id="relation-name" label="Relation Name"></bim-text-input>
              <bim-text-input id="relation-category" label="Relation Attribute Category"></bim-text-input>
              <bim-text-input id="relation-attribute-name" label="Relation Attribute Name"></bim-text-input>
              <bim-text-input id="relation-attribute-value" label="Relation Attribute Value"></bim-text-input>
              </div>
            </fieldset> 
            <bim-button label="Search" @click=${onSearch}></bim-button>
            
              <fieldset style="color: white;">
              <legend>Find item data</legend>
              <div style="display: flex; gap: 0.25rem; flex-direction: column">
              <bim-number-input id="item-id" label="Item id"></bim-number-input>
              <bim-button label="Search" @click=${() => onGetItem()}></bim-button>
              </div>
            </fieldset> `
              : null
          }

        </div>
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
